-- Migración: Módulo de Recargas Telefónicas (Tigo y Claro)
-- Ejecutar en el SQL Editor de Supabase

-- 1. Tabla de Bolsas / Saldos de Operadores
create table if not exists public.recargas_bolsas (
  id uuid primary key default gen_random_uuid(),
  operador text unique not null check (operador in ('tigo', 'claro')),
  nombre_display text not null,
  saldo_actual numeric(10, 2) not null default 0 check (saldo_actual >= 0),
  color_hex text not null default '#00377B',
  updated_at timestamptz not null default now()
);

-- Seed de bolsas iniciales
insert into public.recargas_bolsas (operador, nombre_display, saldo_actual, color_hex)
values
  ('tigo', 'Tigo', 0.00, '#00377B'),
  ('claro', 'Claro', 0.00, '#DA291C')
on conflict (operador) do update set
  nombre_display = excluded.nombre_display,
  color_hex = excluded.color_hex;

-- 2. Tabla de Movimientos y Auditoría de Recargas
create table if not exists public.recargas_movimientos (
  id uuid primary key default gen_random_uuid(),
  operador text not null check (operador in ('tigo', 'claro')),
  tipo text not null check (tipo in ('apertura_saldo', 'venta_recarga', 'compra_saldo', 'ajuste_manual')),
  monto_saldo numeric(10, 2) not null check (monto_saldo >= 0),
  comision numeric(10, 2) not null default 0 check (comision >= 0),
  total_cobrado_cliente numeric(10, 2) not null default 0 check (total_cobrado_cliente >= 0),
  numero_telefono text,
  venta_id uuid references public.ventas(id) on delete set null,
  pago_con_efectivo_caja boolean not null default false,
  saldo_anterior numeric(10, 2) not null check (saldo_anterior >= 0),
  saldo_nuevo numeric(10, 2) not null check (saldo_nuevo >= 0),
  notas text,
  fecha timestamptz not null default now()
);

create index if not exists recargas_movimientos_operador_idx on public.recargas_movimientos (operador);
create index if not exists recargas_movimientos_fecha_idx on public.recargas_movimientos (fecha desc);
create index if not exists recargas_movimientos_venta_idx on public.recargas_movimientos (venta_id);

-- RLS
alter table public.recargas_bolsas enable row level security;
alter table public.recargas_movimientos enable row level security;

create policy "recargas_bolsas_select" on public.recargas_bolsas for select to anon, authenticated using (true);
create policy "recargas_bolsas_insert" on public.recargas_bolsas for insert to anon, authenticated with check (true);
create policy "recargas_bolsas_update" on public.recargas_bolsas for update to anon, authenticated using (true) with check (true);

create policy "recargas_movimientos_select" on public.recargas_movimientos for select to anon, authenticated using (true);
create policy "recargas_movimientos_insert" on public.recargas_movimientos for insert to anon, authenticated with check (true);

-- 3. Función para Reponer / Ajustar Saldo de Bolsa
create or replace function public.gestionar_saldo_bolsa(
  p_operador text,
  p_tipo text,
  p_monto numeric(10, 2),
  p_pago_con_efectivo_caja boolean default false,
  p_notas text default null
)
returns public.recargas_bolsas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bolsa public.recargas_bolsas%rowtype;
  v_saldo_anterior numeric(10, 2);
  v_saldo_nuevo numeric(10, 2);
begin
  if p_operador not in ('tigo', 'claro') then
    raise exception 'Operador inválido: %', p_operador;
  end if;

  if p_monto < 0 then
    raise exception 'El monto no puede ser negativo';
  end if;

  select * into v_bolsa
  from public.recargas_bolsas
  where operador = p_operador
  for update;

  if not found then
    insert into public.recargas_bolsas (operador, nombre_display, saldo_actual)
    values (p_operador, initcap(p_operador), 0)
    returning * into v_bolsa;
  end if;

  v_saldo_anterior := v_bolsa.saldo_actual;

  if p_tipo in ('compra_saldo', 'recarga_saldo') then
    v_saldo_nuevo := v_saldo_anterior + p_monto;
  elsif p_tipo in ('apertura_saldo', 'ajuste_manual') then
    v_saldo_nuevo := p_monto;
  else
    raise exception 'Tipo de movimiento de saldo inválido: %', p_tipo;
  end if;

  update public.recargas_bolsas
  set saldo_actual = v_saldo_nuevo,
      updated_at = now()
  where id = v_bolsa.id
  returning * into v_bolsa;

  insert into public.recargas_movimientos (
    operador,
    tipo,
    monto_saldo,
    comision,
    total_cobrado_cliente,
    pago_con_efectivo_caja,
    saldo_anterior,
    saldo_nuevo,
    notas,
    fecha
  ) values (
    p_operador,
    case when p_tipo = 'recarga_saldo' then 'compra_saldo' else p_tipo end,
    p_monto,
    0,
    0,
    coalesce(p_pago_con_efectivo_caja, false),
    v_saldo_anterior,
    v_saldo_nuevo,
    p_notas,
    now()
  );

  return v_bolsa;
end;
$$;

grant execute on function public.gestionar_saldo_bolsa(text, text, numeric, boolean, text) to anon, authenticated;

-- 4. Actualización de registrar_venta para soportar productos, servicios y recargas telefónicas
create or replace function public.registrar_venta(p_items jsonb)
returns public.ventas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_producto public.productos%rowtype;
  v_servicio public.servicios%rowtype;
  v_bolsa public.recargas_bolsas%rowtype;
  v_cantidad integer;
  v_precio_unitario numeric(10, 2);
  v_subtotal numeric(10, 2);
  v_total numeric(10, 2) := 0;
  v_lineas jsonb := '[]'::jsonb;
  v_venta public.ventas;
  v_tipo text;
  v_nombre text;
  v_desc_personalizada text;
  v_operador text;
  v_numero_telefono text;
  v_monto_recarga numeric(10, 2);
  v_comision numeric(10, 2);
  v_saldo_anterior numeric(10, 2);
  v_saldo_nuevo numeric(10, 2);
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe incluir al menos un artículo, servicio o recarga';
  end if;

  insert into public.ventas (total, items_vendidos)
  values (0, '[]'::jsonb)
  returning * into v_venta;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_tipo := coalesce(
      v_item->>'tipo',
      case
        when v_item->>'operador' is not null then 'recarga'
        when v_item->>'servicio_id' is not null or v_item->>'codigo_servicio' is not null then 'servicio'
        else 'producto'
      end
    );
    v_cantidad := coalesce((v_item->>'cantidad')::integer, 1);

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    if v_tipo = 'recarga' then
      v_operador := lower(trim(coalesce(v_item->>'operador', 'tigo')));
      if v_operador not in ('tigo', 'claro') then
        raise exception 'Operador de recarga no reconocido: %', v_operador;
      end if;

      v_monto_recarga := coalesce((v_item->>'monto_recarga')::numeric(10, 2), (v_item->>'precio_unitario')::numeric(10, 2), 0);
      v_comision := coalesce((v_item->>'comision')::numeric(10, 2), 0);
      v_numero_telefono := coalesce(v_item->>'numero_telefono', '');
      v_precio_unitario := v_monto_recarga + v_comision;

      if v_monto_recarga <= 0 then
        raise exception 'El monto de recarga debe ser mayor a 0';
      end if;

      select * into v_bolsa
      from public.recargas_bolsas
      where operador = v_operador
      for update;

      if not found then
        raise exception 'Bolsa de recarga no encontrada para operador %', v_operador;
      end if;

      if v_bolsa.saldo_actual < (v_monto_recarga * v_cantidad) then
        raise exception 'Saldo insuficiente en bolsa % (Disponible: %, Requerido: %)',
          upper(v_operador), v_bolsa.saldo_actual, (v_monto_recarga * v_cantidad);
      end if;

      v_saldo_anterior := v_bolsa.saldo_actual;
      v_saldo_nuevo := v_saldo_anterior - (v_monto_recarga * v_cantidad);

      update public.recargas_bolsas
      set saldo_actual = v_saldo_nuevo,
          updated_at = now()
      where id = v_bolsa.id;

      v_subtotal := v_precio_unitario * v_cantidad;
      v_total := v_total + v_subtotal;

      insert into public.recargas_movimientos (
        operador,
        tipo,
        monto_saldo,
        comision,
        total_cobrado_cliente,
        numero_telefono,
        venta_id,
        pago_con_efectivo_caja,
        saldo_anterior,
        saldo_nuevo,
        notas,
        fecha
      ) values (
        v_operador,
        'venta_recarga',
        v_monto_recarga * v_cantidad,
        v_comision * v_cantidad,
        v_subtotal,
        v_numero_telefono,
        v_venta.id,
        false,
        v_saldo_anterior,
        v_saldo_nuevo,
        'Venta de recarga POS' || case when v_numero_telefono <> '' then ' a ' || v_numero_telefono else '' end,
        now()
      );

      v_nombre := 'Recarga ' || upper(v_operador);
      v_desc_personalizada := case
        when v_numero_telefono <> '' then 'Tel: ' || v_numero_telefono || ' ($' || v_monto_recarga || ' + $' || v_comision || ' com.)'
        else '$' || v_monto_recarga || ' + $' || v_comision || ' com.'
      end;

      v_lineas := v_lineas || jsonb_build_array(
        jsonb_build_object(
          'tipo', 'recarga',
          'operador', v_operador,
          'nombre', v_nombre,
          'numero_telefono', v_numero_telefono,
          'monto_recarga', v_monto_recarga,
          'comision', v_comision,
          'descripcion_personalizada', v_desc_personalizada,
          'cantidad', v_cantidad,
          'precio_unitario', v_precio_unitario
        )
      );

    elsif v_tipo = 'servicio' then
      if v_item->>'servicio_id' is not null then
        select * into v_servicio
        from public.servicios
        where id = (v_item->>'servicio_id')::uuid;
      elsif v_item->>'codigo_servicio' is not null then
        select * into v_servicio
        from public.servicios
        where codigo = v_item->>'codigo_servicio';
      end if;

      v_nombre := coalesce(v_item->>'nombre', v_servicio.nombre, 'Servicio');
      v_desc_personalizada := v_item->>'descripcion_personalizada';

      if v_item->>'precio_unitario' is not null then
        v_precio_unitario := (v_item->>'precio_unitario')::numeric(10, 2);
      elsif v_servicio.id is not null then
        v_precio_unitario := v_servicio.precio_actual;
      else
        v_precio_unitario := 0;
      end if;

      if v_precio_unitario < 0 then
        raise exception 'Precio de servicio no puede ser negativo';
      end if;

      v_subtotal := v_precio_unitario * v_cantidad;
      v_total := v_total + v_subtotal;

      insert into public.ventas_servicios_detalle (
        venta_id,
        servicio_id,
        codigo_servicio,
        nombre_servicio,
        tipo_servicio,
        descripcion_personalizada,
        cantidad,
        precio_unitario_aplicado,
        subtotal,
        version_precio
      ) values (
        v_venta.id,
        v_servicio.id,
        coalesce(v_servicio.codigo, v_item->>'codigo_servicio', 'servicio_general'),
        v_nombre,
        coalesce(v_servicio.categoria, 'servicios'),
        v_desc_personalizada,
        v_cantidad,
        v_precio_unitario,
        v_subtotal,
        v_servicio.version_precio
      );

      v_lineas := v_lineas || jsonb_build_array(
        jsonb_build_object(
          'tipo', 'servicio',
          'servicio_id', v_servicio.id,
          'codigo_servicio', v_servicio.codigo,
          'nombre', case
                      when v_desc_personalizada is not null and v_desc_personalizada <> ''
                      then v_nombre || ' - ' || v_desc_personalizada
                      else v_nombre
                    end,
          'descripcion_personalizada', v_desc_personalizada,
          'cantidad', v_cantidad,
          'precio_unitario', v_precio_unitario
        )
      );

    else
      select * into v_producto
      from public.productos
      where id = (v_item->>'producto_id')::uuid
      for update;

      if not found then
        raise exception 'Producto no encontrado: %', v_item->>'producto_id';
      end if;

      if v_producto.stock < v_cantidad then
        raise exception 'Stock insuficiente para % (hay %, se piden %)',
          v_producto.nombre, v_producto.stock, v_cantidad;
      end if;

      update public.productos
      set stock = stock - v_cantidad
      where id = v_producto.id;

      v_subtotal := v_producto.precio * v_cantidad;
      v_total := v_total + v_subtotal;

      v_lineas := v_lineas || jsonb_build_array(
        jsonb_build_object(
          'tipo', 'producto',
          'producto_id', v_producto.id,
          'nombre', v_producto.nombre,
          'cantidad', v_cantidad,
          'precio_unitario', v_producto.precio
        )
      );
    end if;
  end loop;

  update public.ventas
  set total = v_total,
      items_vendidos = v_lineas
  where id = v_venta.id
  returning * into v_venta;

  return v_venta;
end;
$$;

grant execute on function public.registrar_venta(jsonb) to anon, authenticated;
