-- POS librería de barrio (~200 productos)
-- Ejecutar en el SQL Editor de Supabase.

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- productos
-- -----------------------------------------------------------------------------
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  precio numeric(10, 2) not null check (precio >= 0),
  stock integer not null default 0 check (stock >= 0),
  created_at timestamptz not null default now()
);

create index if not exists productos_nombre_idx
  on public.productos using gin (to_tsvector('spanish', nombre));

-- -----------------------------------------------------------------------------
-- ventas
-- items_vendidos: arreglo JSON de líneas de la venta, por ejemplo:
-- [
--   {
--     "producto_id": "uuid",
--     "nombre": "Cien años de soledad",
--     "cantidad": 1,
--     "precio_unitario": 18.50
--   }
-- ]
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
-- RLS: POS local sin login. Usa la anon key del frontend.
-- No subas este proyecto a internet público sin añadir autenticación.
-- -----------------------------------------------------------------------------
alter table public.productos enable row level security;
alter table public.ventas enable row level security;

create policy "productos_select"
  on public.productos for select to anon, authenticated using (true);

create policy "productos_insert"
  on public.productos for insert to anon, authenticated with check (true);

create policy "productos_update"
  on public.productos for update to anon, authenticated using (true) with check (true);

create policy "ventas_select"
  on public.ventas for select to anon, authenticated using (true);

create policy "ventas_insert"
  on public.ventas for insert to anon, authenticated with check (true);

create policy "ventas_update"
  on public.ventas for update to anon, authenticated using (true) with check (true);

create policy "ventas_delete"
  on public.ventas for delete to anon, authenticated using (true);

-- -----------------------------------------------------------------------------
-- Registrar una venta y descontar stock en una sola transacción
-- -----------------------------------------------------------------------------
create or replace function public.registrar_venta(p_items jsonb)
returns public.ventas
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_producto public.productos%rowtype;
  v_cantidad integer;
  v_total numeric(10, 2) := 0;
  v_lineas jsonb := '[]'::jsonb;
  v_venta public.ventas;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe incluir al menos un producto';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_cantidad := (v_item->>'cantidad')::integer;
    if v_cantidad is null or v_cantidad <= 0 then
      raise exception 'Cantidad inválida';
    end if;

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

    v_total := v_total + (v_producto.precio * v_cantidad);
    v_lineas := v_lineas || jsonb_build_array(
      jsonb_build_object(
        'producto_id', v_producto.id,
        'nombre', v_producto.nombre,
        'cantidad', v_cantidad,
        'precio_unitario', v_producto.precio
      )
    );
  end loop;

  insert into public.ventas (total, items_vendidos)
  values (v_total, v_lineas)
  returning * into v_venta;

  return v_venta;
end;
$$;

grant execute on function public.registrar_venta(jsonb) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- movimientos_inventario (Auditoría de Stock)
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

alter table public.movimientos_inventario enable row level security;

create policy "movimientos_select"
  on public.movimientos_inventario for select to anon, authenticated using (true);

create policy "movimientos_insert"
  on public.movimientos_inventario for insert to anon, authenticated with check (true);

-- Trigger para auditar automáticamente variaciones de stock en productos
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

