-- =====================================================================
-- NEXUS — Esquema Supabase
-- Ejecutar en el SQL Editor de Supabase (https://app.supabase.com → SQL).
-- Fuente de verdad de TODO lo que persiste. El disco local solo guarda efímeros.
-- =====================================================================

-- ----- Estado de agentes (Nestor / Autos Intel / 2cerebro / etc.) -----
create table if not exists agentes (
  id               bigint generated always as identity primary key,
  nombre           text not null unique,
  estado           text not null default 'activo',     -- activo | pausado | error
  descripcion      text,
  ultima_actividad timestamptz default now()
);

-- ----- Log de acciones (auditoría) -----
-- Toda acción de un agente queda registrada aquí, especialmente las que
-- requieren aprobación humana (crear/borrar usuarios, mover dinero, correos masivos).
create table if not exists log_acciones (
  id                  bigint generated always as identity primary key,
  agente              text not null,
  accion              text not null,           -- p.ej. "clasificar_correo", "enviar_respuesta"
  descripcion         text,
  recurso             text,                    -- a qué afectó (correo, cliente, folio…)
  resultado           text,                    -- ok | error | pendiente_aprobacion
  requiere_aprobacion boolean default false,
  aprobado            boolean,                 -- null=pendiente, true/false=resuelto
  aprobado_por        text,
  creado_en           timestamptz default now()
);
create index if not exists idx_log_creado on log_acciones (creado_en desc);

-- ----- Consumo de API (control de costos por agente) -----
create table if not exists consumo_api (
  id           bigint generated always as identity primary key,
  dia          date not null default current_date,
  agente       text,
  modelo       text,                           -- claude-haiku-4-5 | claude-sonnet-4-6 | claude-opus-4-8
  tokens_in    bigint default 0,
  tokens_out   bigint default 0,
  tokens_total bigint generated always as (tokens_in + tokens_out) stored,
  costo_usd    numeric(14,8) default 0,   -- 8 decimales: captura costos por-llamada (Haiku ~$0.00004)
  cacheado     boolean default false,          -- si usó prompt caching
  batch        boolean default false,          -- si fue por Batch API (50% off)
  creado_en    timestamptz default now()
);
create index if not exists idx_consumo_dia on consumo_api (dia desc);

-- ----- Negocio: comisiones -----
create table if not exists comisiones (
  id          bigint generated always as identity primary key,
  vendedor    text not null,
  periodo     text not null,                   -- 'YYYY-MM'
  monto_venta numeric(14,2) not null default 0,
  tramo       text,
  comision    numeric(14,2) not null default 0,
  estado      text default 'calculada',        -- calculada | revisada | pagada
  creado_en   timestamptz default now()
);

-- ----- Negocio: folios procesados (SII) -----
create table if not exists folios_procesados (
  id           bigint generated always as identity primary key,
  folio        text not null,
  tipo_dte     text,                            -- 33, 34, 61…
  rut_emisor   text,
  monto        numeric(14,2),
  estado       text default 'procesado',
  procesado_en timestamptz default now(),
  unique (folio, tipo_dte)
);

-- ----- Histórico de cierres -----
create table if not exists cierres (
  id        bigint generated always as identity primary key,
  periodo   text not null,
  total     numeric(16,2),
  detalle   jsonb,
  cerrado_en timestamptz default now()
);

-- =====================================================================
-- SEGURIDAD (RLS)
-- Estas tablas guardan datos sensibles (sueldos, folios SII). Los daemons
-- locales escriben con la SERVICE_ROLE key (salta RLS). Si algún día expones
-- lectura a clientes con la ANON key, activa RLS y define políticas explícitas.
-- Por ahora, al usar solo service_role desde daemons locales en localhost/Tailscale,
-- mantener RLS activado sin políticas = nadie con anon key puede leer (seguro por defecto).
-- =====================================================================
alter table agentes          enable row level security;
alter table log_acciones     enable row level security;
alter table consumo_api      enable row level security;
alter table comisiones       enable row level security;
alter table folios_procesados enable row level security;
alter table cierres          enable row level security;

-- Semilla mínima de agentes para que el Hub muestre algo desde el inicio.
insert into agentes (nombre, descripcion) values
  ('Nestor', 'Lee y clasifica correo externo (dato NO confiable; no ejecuta acciones sensibles sin aprobación)'),
  ('Autos Intel', 'Inteligencia sobre plataformas'),
  ('2cerebro', 'Razonamiento transversal sobre varias plataformas')
on conflict (nombre) do nothing;
