#!/bin/bash
# Autos Intel — aplica los cambios de DB necesarios para la fuente Linze y deja
# todo listo para el scrapeo. Idempotente.
#
# Hace (vía psql, con privilegios de owner):
#   1) ALTER TYPE public.source_site ADD VALUE IF NOT EXISTS 'linze'
#   2) Verifica enum_range(source_site)
#   3) Crea el perfil de búsqueda "Linze (catálogo completo)" si no existe
#      (sources={linze}, makes={} => una pasada al catálogo completo).
#
# Uso:
#   ./scripts/apply_linze_db.sh "postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres"
#   # o con la variable de entorno:
#   PGURI="postgresql://..." ./scripts/apply_linze_db.sh
#
# Después de esto, probá el scrapeo end-to-end:
#   .venv/bin/python -m scraper.main --source linze --max-pages 1 --no-recheck

set -euo pipefail

PGURI="${1:-${PGURI:-}}"
if [ -z "$PGURI" ]; then
  echo "ERROR: falta la connection string de Postgres." >&2
  echo "Uso: $0 'postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres'" >&2
  exit 2
fi

command -v psql >/dev/null || { echo "ERROR: psql no está instalado." >&2; exit 3; }

echo "==> 1/3  ALTER TYPE source_site ADD VALUE 'linze' (idempotente)…"
# ADD VALUE no puede ir dentro de una transacción que luego use el valor; lo
# corremos en su propia sentencia con autocommit.
psql "$PGURI" -v ON_ERROR_STOP=1 -c "alter type public.source_site add value if not exists 'linze';"

echo "==> 2/3  Verificación del enum:"
psql "$PGURI" -v ON_ERROR_STOP=1 -At -c "select enum_range(null::public.source_site);"

echo "==> 3/3  Perfil 'Linze (catálogo completo)' (crea solo si no existe)…"
psql "$PGURI" -v ON_ERROR_STOP=1 <<'SQL'
insert into public.search_profiles (name, sources, makes, exclude_makes, is_premium, active)
select 'Linze (catálogo completo)',
       array['linze']::public.source_site[],
       '{}'::text[],
       '{}'::text[],
       false,
       true
where not exists (
  select 1 from public.search_profiles where 'linze' = any(sources)
);
select id, name, sources, active from public.search_profiles where 'linze' = any(sources);
SQL

echo "✓ DB lista para Linze."
echo "  Probá ahora: .venv/bin/python -m scraper.main --source linze --max-pages 1 --no-recheck"
