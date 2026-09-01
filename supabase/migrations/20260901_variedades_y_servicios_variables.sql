-- =============================================================================
-- Migración: Soporte para Categoría 'variedades' en Productos y
--            Servicios de Encolochados y Laminados/Emplasticados con Tarifa Variable
-- =============================================================================

-- 1. Actualizar la restricción check de categoria en productos para incluir 'variedades'
do $$
begin
  if exists (
    select 1 from pg_constraint 
    where conname = 'productos_categoria_check'
  ) then
    alter table public.productos drop constraint productos_categoria_check;
  end if;
end $$;

alter table public.productos
add constraint productos_categoria_check
check (categoria in ('libreria', 'comida', 'variedades'));

-- 2. Asegurar que los servicios de laminados y encolochados sean de tipo_precio 'variable'
update public.servicios
set 
  tipo_precio = 'variable',
  descripcion = 'Enmicado térmico con precio variable en caja.'
where codigo = 'laminado_carta';

update public.servicios
set 
  tipo_precio = 'variable',
  descripcion = 'Enmicado térmico para credenciales o media carta con precio variable en caja.'
where codigo = 'laminado_media_carta';

update public.servicios
set 
  tipo_precio = 'variable',
  nombre = 'Encolochado de Documento',
  descripcion = 'Encuadernación con resorte plástico con precio variable en caja.'
where codigo = 'encolochado_hoja';
