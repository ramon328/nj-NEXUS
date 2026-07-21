-- Esquema Supabase para el extractor SII.
-- Ejecuta esto en el SQL Editor de tu proyecto Supabase.

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
