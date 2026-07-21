-- ============================================================================
-- Cobranza por WhatsApp — esquema para SEGUIR las conversaciones con clientes.
-- Ejecutar en el Supabase del Hub: proyecto ydcpsihovvaefyobnhws
-- (Dashboard → SQL Editor → pegar y Run).
-- ============================================================================

-- 1) Una fila por conversación (un cliente + su factura).
create table if not exists cobranza_conversaciones (
  id             uuid primary key default gen_random_uuid(),
  cliente_nombre text,
  telefono       text not null,                 -- E.164, ej +56961234567
  factura        text,
  monto          numeric,
  fecha_emision  date,
  -- estado del cobro:
  -- pendiente | enviado | en_conversacion | promesa_pago | pagado | no_responde | escalado | cerrado
  estado         text not null default 'pendiente',
  notas          text,
  ultimo_mensaje_en timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_cob_conv_tel    on cobranza_conversaciones (telefono);
create index if not exists idx_cob_conv_estado on cobranza_conversaciones (estado);

-- 2) Cada mensaje del hilo (lo que dice Nexus y lo que dice el cliente).
create table if not exists cobranza_mensajes (
  id              uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references cobranza_conversaciones (id) on delete cascade,
  rol             text not null check (rol in ('nexus','cliente')),  -- quién habló
  texto           text not null,
  creado_en       timestamptz not null default now()
);

create index if not exists idx_cob_msg_conv on cobranza_mensajes (conversacion_id, creado_en);

-- 3) updated_at automático en la conversación.
create or replace function cobranza_touch() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_cobranza_touch on cobranza_conversaciones;
create trigger trg_cobranza_touch before update on cobranza_conversaciones
  for each row execute function cobranza_touch();

-- 4) RLS: las tablas son internas; solo las toca el Hub con la service_role
--    (que SALTA RLS). Activamos RLS y NO creamos políticas públicas → nadie más entra.
alter table cobranza_conversaciones enable row level security;
alter table cobranza_mensajes      enable row level security;

-- Listo. El Hub escribe/lee con SUPABASE_SERVICE_ROLE_KEY.
