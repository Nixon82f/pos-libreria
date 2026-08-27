-- =============================================================================
-- Migración: Módulo de Cierre de Caja y Arqueo Diario
-- =============================================================================

-- 1. Tabla cierres_caja
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

-- 2. Habilitar RLS y políticas
alter table public.cierres_caja enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where tablename = 'cierres_caja' and policyname = 'cierres_select'
  ) then
    create policy "cierres_select" on public.cierres_caja 
    for select to anon, authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'cierres_caja' and policyname = 'cierres_insert'
  ) then
    create policy "cierres_insert" on public.cierres_caja 
    for insert to anon, authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies 
    where tablename = 'cierres_caja' and policyname = 'cierres_delete'
  ) then
    create policy "cierres_delete" on public.cierres_caja 
    for delete to anon, authenticated using (true);
  end if;
end $$;
