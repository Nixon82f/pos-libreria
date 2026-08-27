-- =============================================================================
-- Migración: Soporte para Comida/Snacks, Palomitas Dinámicas, Servicio "Otro"
--            y Políticas de Eliminación Permanente (DELETE)
-- =============================================================================

-- 1. Agregar columna 'categoria' a la tabla productos ('libreria' | 'comida')
alter table if exists public.productos
add column if not exists categoria text not null default 'libreria';

create index if not exists productos_categoria_idx on public.productos(categoria);

-- 2. Permitir categorías 'comida' y 'otros' en la tabla servicios
do $$
begin
  if exists (
    select 1 from pg_constraint 
    where conname = 'servicios_categoria_check'
  ) then
    alter table public.servicios drop constraint servicios_categoria_check;
  end if;
end $$;

alter table public.servicios
add constraint servicios_categoria_check
check (categoria in ('fotocopias', 'impresiones', 'laminados', 'encolochados', 'sublimados', 'comida', 'otros'));

-- 3. Registrar o actualizar Palomitas y Servicio Otro
insert into public.servicios (codigo, categoria, nombre, descripcion, tipo_precio, precio_actual, version_precio, activo)
values 
  ('palomitas_servicio', 'comida', 'Palomitas de Maíz', 'Palomitas recién preparadas con precio dinámico en caja.', 'variable', 0.00, 1, true),
  ('servicio_otro', 'otros', 'Otro Servicio', 'Servicio extra, trámite personalizado o cobro especial con tarifa libre.', 'variable', 0.00, 1, true)
on conflict (codigo) do update set
  categoria = excluded.categoria,
  tipo_precio = excluded.tipo_precio,
  nombre = excluded.nombre,
  descripcion = excluded.descripcion;

-- 4. Habilitar políticas de eliminación (DELETE) en RLS para Supabase
do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'productos' and policyname = 'productos_delete'
  ) then
    create policy "productos_delete" on public.productos 
    for delete to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'servicios' and policyname = 'servicios_delete'
  ) then
    create policy "servicios_delete" on public.servicios 
    for delete to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'servicios_historial_precios' and policyname = 'servicios_historial_delete'
  ) then
    create policy "servicios_historial_delete" on public.servicios_historial_precios 
    for delete to anon, authenticated using (true);
  end if;
end $$;
