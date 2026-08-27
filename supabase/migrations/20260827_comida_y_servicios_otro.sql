-- =============================================================================
-- Migración: Soporte para Comida/Snacks y Servicio Genérico "Otro"
-- =============================================================================

-- 1. Agregar columna 'categoria' a la tabla productos ('libreria' | 'comida')
alter table if exists public.productos
add column if not exists categoria text not null default 'libreria';

create index if not exists productos_categoria_idx on public.productos(categoria);

-- 2. Permitir categoría 'otros' en la tabla servicios
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
check (categoria in ('fotocopias', 'impresiones', 'laminados', 'encolochados', 'sublimados', 'otros'));

-- 3. Registrar o actualizar el servicio genérico 'servicio_otro'
insert into public.servicios (codigo, categoria, nombre, descripcion, tipo_precio, precio_actual, version_precio, activo)
values (
  'servicio_otro',
  'otros',
  'Otro Servicio',
  'Servicio extra, trámite personalizado o cobro especial con tarifa libre.',
  'variable',
  0.00,
  1,
  true
)
on conflict (codigo) do update set
  categoria = 'otros',
  tipo_precio = 'variable',
  nombre = excluded.nombre,
  descripcion = excluded.descripcion;
