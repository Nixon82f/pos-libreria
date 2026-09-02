-- POS librería de barrio (~200 productos)
-- Ejecutar en el SQL Editor de Supabase.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. productos (Catálogo e Inventario Físico)
-- -----------------------------------------------------------------------------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric(10, 2) not null check (precio >= 0),
  stock integer not null default 0 check (stock >= 0),
  categoria text not null default 'libreria' check (categoria in ('libreria', 'comida', 'variedades')),
  created_at timestamptz not null default now()
);

create index if not exists productos_nombre_idx
  on public.productos using gin (to_tsvector('spanish', nombre));
create index if not exists productos_categoria_idx on public.productos (categoria);

-- -----------------------------------------------------------------------------
-- 2. servicios (Catálogo de Servicios Independientes)
-- -----------------------------------------------------------------------------
create table if not exists public.servicios (
  id uuid primary key default gen_random_uuid(),
  codigo text unique not null,
  categoria text not null check (categoria in ('fotocopias', 'impresiones', 'laminados', 'encolochados', 'sublimados', 'comida', 'otros')),
  nombre text not null,
  descripcion text,
  tipo_precio text not null default 'fijo' check (tipo_precio in ('fijo', 'por_unidad', 'variable')),
  precio_actual numeric(10, 2) not null default 0 check (precio_actual >= 0),
  version_precio integer not null default 1,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists servicios_categoria_idx on public.servicios (categoria);
create index if not exists servicios_codigo_idx on public.servicios (codigo);

-- -----------------------------------------------------------------------------
-- 3. servicios_historial_precios (Versionado de Precios)
-- -----------------------------------------------------------------------------
create table if not exists public.servicios_historial_precios (
  id uuid primary key default gen_random_uuid(),
  servicio_id uuid not null references public.servicios(id) on delete cascade,
  version integer not null,
  precio numeric(10, 2) not null check (precio >= 0),
  fecha_inicio timestamptz not null default now(),
  fecha_fin timestamptz,
  motivo_cambio text,
  created_at timestamptz not null default now()
);

create index if not exists servicios_historial_servicio_idx on public.servicios_historial_precios (servicio_id);
create index if not exists servicios_historial_fecha_idx on public.servicios_historial_precios (fecha_inicio desc);

-- -----------------------------------------------------------------------------
-- 4. ventas
-- -----------------------------------------------------------------------------
create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  fecha timestamptz not null default now(),
  total numeric(10, 2) not null check (total >= 0),
  items_vendidos jsonb not null default '[]'::jsonb,
  constraint ventas_items_es_arreglo check (jsonb_typeof(items_vendidos) = 'array')
);

create index if not exists ventas_fecha_idx on public.ventas (fecha desc);
create index if not exists ventas_items_gin_idx on public.ventas using gin (items_vendidos);

-- -----------------------------------------------------------------------------
-- 5. ventas_servicios_detalle (Desglose relacional de servicios vendidos)
-- -----------------------------------------------------------------------------
create table if not exists public.ventas_servicios_detalle (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  servicio_id uuid references public.servicios(id) on delete set null,
  codigo_servicio text not null,
  nombre_servicio text not null,
  tipo_servicio text not null,
  descripcion_personalizada text,
  cantidad integer not null check (cantidad > 0),
  precio_unitario_aplicado numeric(10, 2) not null check (precio_unitario_aplicado >= 0),
  subtotal numeric(10, 2) not null check (subtotal >= 0),
  version_precio integer,
  fecha timestamptz not null default now()
);

create index if not exists ventas_servicios_venta_idx on public.ventas_servicios_detalle (venta_id);
create index if not exists ventas_servicios_servicio_idx on public.ventas_servicios_detalle (servicio_id);
create index if not exists ventas_servicios_fecha_idx on public.ventas_servicios_detalle (fecha desc);

-- -----------------------------------------------------------------------------
-- 6. movimientos_inventario (Auditoría de Stock de Productos Físicos)
-- -----------------------------------------------------------------------------
create table if not exists public.movimientos_inventario (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid references public.productos(id) on delete set null,
  nombre_producto text not null,
  tipo text not null check (tipo in ('venta', 'ajuste_manual', 'creacion', 'recepcion_stock')),
  cantidad_cambio integer not null,
  stock_anterior integer not null,
  stock_nuevo integer not null,
  motivo text,
  fecha timestamptz not null default now()
);

create index if not exists movimientos_fecha_idx on public.movimientos_inventario (fecha desc);
create index if not exists movimientos_producto_idx on public.movimientos_inventario (producto_id);

-- -----------------------------------------------------------------------------
-- 7. cierres_caja (Cierre de Turno y Arqueo Diario)
-- -----------------------------------------------------------------------------
create table if not exists public.cierres_caja (
  id uuid primary key default gen_random_uuid(),
  fecha_cierre timestamptz not null default now(),
  fecha_inicio_turno timestamptz not null default now() - interval '24 hours',
  fecha_fin_turno timestamptz not null default now(),
  total_ventas numeric(10, 2) not null default 0 check (total_ventas >= 0),
  total_productos numeric(10, 2) not null default 0 check (total_productos >= 0),
  total_servicios numeric(10, 2) not null default 0 check (total_servicios >= 0),
  total_recargas numeric(10, 2) not null default 0 check (total_recargas >= 0),
  total_comisiones_recargas numeric(10, 2) not null default 0 check (total_comisiones_recargas >= 0),
  total_compras_saldo_efectivo numeric(10, 2) not null default 0 check (total_compras_saldo_efectivo >= 0),
  desglose_servicios jsonb not null default '{}'::jsonb,
  desglose_recargas jsonb not null default '{}'::jsonb,
  total_efectivo_esperado numeric(10, 2) not null default 0 check (total_efectivo_esperado >= 0),
  total_transferencia_esperado numeric(10, 2) not null default 0 check (total_transferencia_esperado >= 0),
  total_tarjeta_esperado numeric(10, 2) not null default 0 check (total_tarjeta_esperado >= 0),
  efectivo_contado numeric(10, 2) not null default 0 check (efectivo_contado >= 0),
  desglose_efectivo jsonb default '{}'::jsonb,
  diferencia numeric(10, 2) not null default 0,
  estado_diferencia text not null default 'cuadrado' check (estado_diferencia in ('cuadrado', 'sobrante', 'faltante')),
  total_transacciones integer not null default 0 check (total_transacciones >= 0),
  cajero text not null default 'Cajero Principal',
  notas text,
  created_at timestamptz not null default now()
);

-- Asegurar columnas si la tabla ya existía
alter table public.cierres_caja add column if not exists total_recargas numeric(10, 2) not null default 0 check (total_recargas >= 0);
alter table public.cierres_caja add column if not exists total_comisiones_recargas numeric(10, 2) not null default 0 check (total_comisiones_recargas >= 0);
alter table public.cierres_caja add column if not exists total_compras_saldo_efectivo numeric(10, 2) not null default 0 check (total_compras_saldo_efectivo >= 0);
alter table public.cierres_caja add column if not exists desglose_recargas jsonb not null default '{}'::jsonb;

create index if not exists cierres_caja_fecha_idx on public.cierres_caja (fecha_cierre desc);

-- -----------------------------------------------------------------------------
-- 8. recargas_bolsas y recargas_movimientos (Recargas Telefónicas)
-- -----------------------------------------------------------------------------
create table if not exists public.recargas_bolsas (
  id uuid primary key default gen_random_uuid(),
  operador text unique not null check (operador in ('tigo', 'claro')),
  nombre_display text not null,
  saldo_actual numeric(10, 2) not null default 0 check (saldo_actual >= 0),
  color_hex text not null default '#00377B',
  updated_at timestamptz not null default now()
);

insert into public.recargas_bolsas (operador, nombre_display, saldo_actual, color_hex)
values
  ('tigo', 'Tigo', 0.00, '#00377B'),
  ('claro', 'Claro', 0.00, '#DA291C')
on conflict (operador) do update set
  nombre_display = excluded.nombre_display,
  color_hex = excluded.color_hex;

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

-- -----------------------------------------------------------------------------
-- 8. RLS (Row Level Security)
-- -----------------------------------------------------------------------------
alter table public.productos enable row level security;
alter table public.servicios enable row level security;
alter table public.servicios_historial_precios enable row level security;
alter table public.ventas enable row level security;
alter table public.ventas_servicios_detalle enable row level security;
alter table public.movimientos_inventario enable row level security;
alter table public.cierres_caja enable row level security;

create policy "productos_select" on public.productos for select to anon, authenticated using (true);
create policy "productos_insert" on public.productos for insert to anon, authenticated with check (true);
create policy "productos_update" on public.productos for update to anon, authenticated using (true) with check (true);
create policy "productos_delete" on public.productos for delete to anon, authenticated using (true);

create policy "servicios_select" on public.servicios for select to anon, authenticated using (true);
create policy "servicios_insert" on public.servicios for insert to anon, authenticated with check (true);
create policy "servicios_update" on public.servicios for update to anon, authenticated using (true) with check (true);
create policy "servicios_delete" on public.servicios for delete to anon, authenticated using (true);

create policy "servicios_historial_select" on public.servicios_historial_precios for select to anon, authenticated using (true);
create policy "servicios_historial_insert" on public.servicios_historial_precios for insert to anon, authenticated with check (true);
create policy "servicios_historial_delete" on public.servicios_historial_precios for delete to anon, authenticated using (true);

create policy "ventas_select" on public.ventas for select to anon, authenticated using (true);
create policy "ventas_insert" on public.ventas for insert to anon, authenticated with check (true);
create policy "ventas_update" on public.ventas for update to anon, authenticated using (true) with check (true);
create policy "ventas_delete" on public.ventas for delete to anon, authenticated using (true);

create policy "ventas_servicios_select" on public.ventas_servicios_detalle for select to anon, authenticated using (true);
create policy "ventas_servicios_insert" on public.ventas_servicios_detalle for insert to anon, authenticated with check (true);
create policy "ventas_servicios_update" on public.ventas_servicios_detalle for update to anon, authenticated using (true) with check (true);
create policy "ventas_servicios_delete" on public.ventas_servicios_detalle for delete to anon, authenticated using (true);

create policy "movimientos_select" on public.movimientos_inventario for select to anon, authenticated using (true);
create policy "movimientos_insert" on public.movimientos_inventario for insert to anon, authenticated with check (true);

create policy "cierres_select" on public.cierres_caja for select to anon, authenticated using (true);
create policy "cierres_insert" on public.cierres_caja for insert to anon, authenticated with check (true);
create policy "cierres_delete" on public.cierres_caja for delete to anon, authenticated using (true);

create policy "recargas_bolsas_select" on public.recargas_bolsas for select to anon, authenticated using (true);
create policy "recargas_bolsas_insert" on public.recargas_bolsas for insert to anon, authenticated with check (true);
create policy "recargas_bolsas_update" on public.recargas_bolsas for update to anon, authenticated using (true) with check (true);

create policy "recargas_movimientos_select" on public.recargas_movimientos for select to anon, authenticated using (true);
create policy "recargas_movimientos_insert" on public.recargas_movimientos for insert to anon, authenticated with check (true);

-- -----------------------------------------------------------------------------
-- 9. Seed inicial de Servicios
-- -----------------------------------------------------------------------------
insert into public.servicios (codigo, categoria, nombre, descripcion, tipo_precio, precio_actual, version_precio, activo)
values
  ('fotocopia_bn', 'fotocopias', 'Fotocopia B&N', 'Fotocopia en blanco y negro (por página)', 'por_unidad', 1.00, 1, true),
  ('fotocopia_color', 'fotocopias', 'Fotocopia Color', 'Fotocopia a color (por página)', 'por_unidad', 5.00, 1, true),
  ('impresion_bn', 'impresiones', 'Impresión B&N', 'Impresión en blanco y negro (por página)', 'por_unidad', 2.00, 1, true),
  ('impresion_color', 'impresiones', 'Impresión Color', 'Impresión a color (por página)', 'por_unidad', 6.00, 1, true),
  ('laminado_carta', 'laminados', 'Laminado Carta', 'Mica térmica tamaño Carta con tarifa variable', 'variable', 15.00, 1, true),
  ('laminado_media_carta', 'laminados', 'Laminado Media Carta', 'Mica térmica tamaño Media Carta / Credencial con tarifa variable', 'variable', 10.00, 1, true),
  ('encolochado_hoja', 'encolochados', 'Encolochado de Documento', 'Encuadernación con espiral / resorte con precio variable en caja', 'variable', 25.00, 1, true),
  ('sublimado_articulo', 'sublimados', 'Artículo Sublimado', 'Personalización de artículos (tazas, playeras, termos, etc.) con precio manual', 'variable', 0.00, 1, true)
on conflict (codigo) do nothing;

insert into public.servicios_historial_precios (servicio_id, version, precio, motivo_cambio)
select s.id, s.version_precio, s.precio_actual, 'Tarifa inicial del sistema'
from public.servicios s
where not exists (
  select 1 from public.servicios_historial_precios h where h.servicio_id = s.id
);

-- -----------------------------------------------------------------------------
-- 10. Funciones RPC
-- -----------------------------------------------------------------------------

-- Gestión de saldo de bolsas
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

-- Actualización de precios de servicios
create or replace function public.actualizar_precio_servicio(
  p_servicio_id uuid,
  p_nuevo_precio numeric(10, 2),
  p_motivo text default 'Ajuste de tarifa'
)
returns public.servicios
language plpgsql
security definer
set search_path = public
as $$
declare
  v_servicio public.servicios%rowtype;
  v_version_actual integer;
  v_nueva_version integer;
begin
  if p_nuevo_precio < 0 then
    raise exception 'El precio del servicio no puede ser negativo';
  end if;

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id
  for update;

  if not found then
    raise exception 'Servicio con ID % no encontrado', p_servicio_id;
  end if;

  v_version_actual := v_servicio.version_precio;
  v_nueva_version := v_version_actual + 1;

  update public.servicios_historial_precios
  set fecha_fin = now()
  where servicio_id = p_servicio_id
    and version = v_version_actual
    and fecha_fin is null;

  insert into public.servicios_historial_precios (
    servicio_id,
    version,
    precio,
    fecha_inicio,
    motivo_cambio
  ) values (
    p_servicio_id,
    v_nueva_version,
    p_nuevo_precio,
    now(),
    p_motivo
  );

  update public.servicios
  set precio_actual = p_nuevo_precio,
      version_precio = v_nueva_version,
      updated_at = now()
  where id = p_servicio_id
  returning * into v_servicio;

  return v_servicio;
end;
$$;

grant execute on function public.actualizar_precio_servicio(uuid, numeric, text) to anon, authenticated;

-- Registrar venta para productos, servicios y recargas telefónicas
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
  v_monto_recarga numeric(10, 2);
  v_comision numeric(10, 2);
  v_numero_telefono text;
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
    v_tipo := coalesce(v_item->>'tipo', case when v_item->>'servicio_id' is not null then 'servicio' else 'producto' end);
    v_cantidad := (v_item->>'cantidad')::integer;

    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    if v_tipo = 'recarga' then
      v_operador := lower(coalesce(v_item->>'operador', 'tigo'));
      v_monto_recarga := (v_item->>'monto_recarga')::numeric(10, 2);
      v_comision := coalesce((v_item->>'comision')::numeric(10, 2), 0);
      v_precio_unitario := (v_item->>'precio_unitario')::numeric(10, 2);
      v_numero_telefono := coalesce(v_item->>'numero_telefono', '');

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
