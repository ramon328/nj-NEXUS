-- Esquema Supabase para el extractor SII.
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase.

-- 0) Empresas (RUT + clave del SII). La CLAVE se guarda CIFRADA por el backend
--    (Fernet, ver crypto.py): aquí nunca llega en claro. RLS activado y SIN
--    políticas → solo la SERVICE KEY (que salta RLS, usada solo en el backend)
--    puede leer/escribir. El anon key NO tiene acceso a esta tabla.
create table if not exists public.empresas (
    id            bigint generated always as identity primary key,
    nombre        text not null,
    rut           text not null unique,
    clave         text not null,                 -- CIFRADA (enc:v1:...), nunca en claro
    creada_en     double precision not null,     -- epoch segundos
    conectada_en  double precision,
    estado        text not null default 'sin_probar'
);

alter table public.empresas enable row level security;
-- (sin create policy → tabla cerrada para anon; el backend usa la service key)

-- 1) Tabla de metadata de documentos descargados.
create table if not exists public.documentos (
    id          bigint generated always as identity primary key,
    ruta        text not null unique,          -- ruta dentro del bucket
    tipo        text not null,                 -- json | pdf | xml | csv
    periodo     text,                          -- YYYYMM si aplica
    operacion   text,                          -- COMPRA | VENTA | F29 | F22 | CARPETA
    creado_en   timestamptz not null default now()
);

create index if not exists idx_documentos_periodo on public.documentos (periodo);
create index if not exists idx_documentos_operacion on public.documentos (operacion);

-- 2) Bucket de Storage (créalo también desde el panel Storage si prefieres UI).
--    insert into storage.buckets (id, name, public) values ('sii-documentos','sii-documentos', false)
--    on conflict do nothing;

-- 3) Recomendado: mantén RLS activado y accede solo con la SERVICE KEY desde
--    el backend (este script). NUNCA expongas la service key en el cliente.
