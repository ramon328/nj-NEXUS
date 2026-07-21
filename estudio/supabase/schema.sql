-- Esquema de la plataforma de marketing.
-- Ejecutar en el SQL Editor de Supabase (una sola vez).

create extension if not exists "pgcrypto";

-- Videos sincronizados desde Google Drive
create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  drive_file_id text unique not null,
  name text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds numeric,
  thumbnail_url text,
  web_view_link text,
  download_url text,
  drive_modified_at timestamptz,
  status text not null default 'nuevo' check (status in ('nuevo','procesando','listo','publicado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contenido generado por la IA (captions, descripciones, hashtags, planes de edicion)
create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  kind text not null check (kind in ('content','edit_plan')),
  content jsonb not null,
  model text,
  created_at timestamptz not null default now()
);

create index if not exists generations_video_idx on generations(video_id, kind, created_at desc);

-- Proyectos: agrupan multimedia (videos, fotos, música, stickers) para
-- editar videos usando todo el contenido en conjunto.
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  drive_folder_id text,
  created_at timestamptz not null default now()
);

create table if not exists project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tipo text not null check (tipo in ('video','foto','audio','musica','sticker')),
  nombre text not null,
  storage_path text not null,
  public_url text not null,
  mime_type text,
  duracion_seconds numeric,
  ancho integer,
  alto integer,
  size_bytes bigint,
  drive_file_id text,
  created_at timestamptz not null default now()
);

create index if not exists project_assets_idx on project_assets(project_id, tipo, created_at desc);

-- Trabajos de edición real de video con IA
create table if not exists edits (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  instruccion text,
  plan jsonb,
  status text not null default 'procesando' check (status in ('procesando','completado','error')),
  output_url text,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists edits_video_idx on edits(video_id, created_at desc);

-- Una edición puede pertenecer a un proyecto (multimedia múltiple) en vez de
-- a un solo video. Estas dos líneas son seguras de re-ejecutar.
alter table edits add column if not exists project_id uuid references projects(id) on delete cascade;
alter table edits alter column video_id drop not null;

create index if not exists edits_project_idx on edits(project_id, created_at desc);

-- Publicaciones en Instagram
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  caption text,
  hashtags text[],
  ig_container_id text,
  ig_media_id text,
  status text not null default 'borrador' check (status in ('borrador','publicando','publicado','error')),
  error text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists posts_video_idx on posts(video_id, created_at desc);

-- Herramientas de estrategia de marketing (ideas, copywriting, guiones,
-- calendario de contenido, lead magnets): historial de resultados.
create table if not exists estrategias (
  id uuid primary key default gen_random_uuid(),
  herramienta text not null check (herramienta in ('ideas','copywriting','guion_reel','calendario','lead_magnet')),
  titulo text not null,
  entrada jsonb not null default '{}'::jsonb,
  resultado jsonb not null,
  project_id uuid references projects(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists estrategias_idx on estrategias(herramienta, created_at desc);

-- Diseños de posts (carruseles / imágenes) generados por la IA y renderizados
-- con Remotion. Cada diseño guarda su plan (JSON editable) y las URLs de los
-- slides PNG ya renderizados.
create table if not exists post_disenos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  titulo text not null,
  instruccion text,
  formato text not null default 'cuadrado_1_1' check (formato in ('cuadrado_1_1','vertical_4_5','historia_9_16')),
  plan jsonb,
  slides_urls text[] not null default '{}',
  status text not null default 'procesando' check (status in ('procesando','completado','error')),
  error text,
  created_at timestamptz not null default now()
);

create index if not exists post_disenos_idx on post_disenos(project_id, created_at desc);

-- Ajustes de la app (clave -> valor JSON). Guarda integraciones y config que no
-- viven en variables de entorno; p. ej. la conexion de Instagram (token de larga
-- duracion + id de la cuenta) que se vincula desde el apartado "Ajustes". Es una
-- tabla de acceso SOLO servidor (service role), nunca expuesta al navegador.
create table if not exists ajustes (
  clave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);

-- Mantener updated_at al dia en videos
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists videos_updated_at on videos;
create trigger videos_updated_at
  before update on videos
  for each row execute function set_updated_at();
