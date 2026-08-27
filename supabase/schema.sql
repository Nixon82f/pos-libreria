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
  categoria text not null default 'libreria' check (categoria in ('libreria', 'comida')),
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
  desglose_servicios jsonb not null default '{}'::jsonb,
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

create index if not exists cierres_caja_fecha_idx on public.cierres_caja (fecha_cierre desc);

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

-- -----------------------------------------------------------------------------
-- 8. Seed inicial de Servicios
-- -----------------------------------------------------------------------------
insert into public.servicios (codigo, categoria, nombre, descripcion, tipo_precio, precio_actual, version_precio, activo)
values
  ('fotocopia_bn', 'fotocopias', 'Fotocopia B&N', 'Fotocopia en blanco y negro (por página)', 'por_unidad', 1.00, 1, true),
  ('fotocopia_color', 'fotocopias', 'Fotocopia Color', 'Fotocopia a color (por página)', 'por_unidad', 5.00, 1, true),
  ('impresion_bn', 'impresiones', 'Impresión B&N', 'Impresión en blanco y negro (por página)', 'por_unidad', 2.00, 1, true),
  ('impresion_color', 'impresiones', 'Impresión Color', 'Impresión a color (por página)', 'por_unidad', 6.00, 1, true),
  ('laminado_carta', 'laminados', 'Laminado Carta', 'Mica térmica tamaño Carta', 'fijo', 15.00, 1, true),
  ('laminado_media_carta', 'laminados', 'Laminado Media Carta', 'Mica térmica tamaño Media Carta / Credencial', 'fijo', 10.00, 1, true),
  ('encolochado_hoja', 'encolochados', 'Encolochado por Hoja', 'Encuadernación con espiral (costo calculado por hoja)', 'por_unidad', 0.50, 1, true),
  ('sublimado_articulo', 'sublimados', 'Artículo Sublimado', 'Personalización de artículos (tazas, playeras, termos, etc.) con precio manual', 'variable', 0.00, 1, true)
on conflict (codigo) do nothing;

insert into public.servicios_historial_precios (servicio_id, version, precio, motivo_cambio)
select s.id, s.version_precio, s.precio_actual, 'Tarifa inicial del sistema'
from public.servicios s
where not exists (
  select 1 from public.servicios_historial_precios h where h.servicio_id = s.id
);

-- -----------------------------------------------------------------------------
-- 9. Triggers y Funciones RPC
-- -----------------------------------------------------------------------------
create or replace function public.auditar_cambio_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.movimientos_inventario (
      producto_id,
      nombre_producto,
      tipo,
      cantidad_cambio,
      stock_anterior,
      stock_nuevo,
      motivo
    ) values (
      new.id,
      new.nombre,
      'creacion',
      new.stock,
      0,
      new.stock,
      'Producto creado en catálogo'
    );
  elsif TG_OP = 'UPDATE' and old.stock is distinct from new.stock then
    insert into public.movimientos_inventario (
      producto_id,
      nombre_producto,
      tipo,
      cantidad_cambio,
      stock_anterior,
      stock_nuevo,
      motivo
    ) values (
      new.id,
      new.nombre,
      case when new.stock < old.stock then 'venta' else 'recepcion_stock' end,
      new.stock - old.stock,
      old.stock,
      new.stock,
      case when new.stock < old.stock then 'Salida por venta / deducción' else 'Entrada de mercancía / ajuste' end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_auditoria_stock on public.productos;
create trigger trigger_auditoria_stock
after insert or update on public.productos
for each row execute function public.auditar_cambio_stock();

-- Actualización de precio de servicio con versionado
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
  v_nueva_version integer;
begin
  if p_nuevo_precio < 0 then
    raise exception 'El precio no puede ser negativo';
  end if;

  select * into v_servicio
  from public.servicios
  where id = p_servicio_id
  for update;

  if not found then
    raise exception 'Servicio no encontrado: %', p_servicio_id;
  end if;

  v_nueva_version := v_servicio.version_precio + 1;

  update public.servicios_historial_precios
  set fecha_fin = now()
  where servicio_id = p_servicio_id and fecha_fin is null;

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

-- Registrar venta para productos y servicios
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
  v_cantidad integer;
  v_precio_unitario numeric(10, 2);
  v_subtotal numeric(10, 2);
  v_total numeric(10, 2) := 0;
  v_lineas jsonb := '[]'::jsonb;
  v_venta public.ventas;
  v_tipo text;
  v_nombre text;
  v_desc_personalizada text;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe incluir al menos un artículo o servicio';
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

    if v_tipo = 'servicio' then
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
