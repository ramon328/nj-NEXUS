#!/bin/zsh
# ============================================================
#  nj-NEXUS — respaldo automático de código del Mac mini
#  Copia SOLO código de cada proyecto (excluye pesados/secretos),
#  luego commit + push a main si hubo cambios.
# ============================================================
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

BK="$HOME/nj-NEXUS-backup"
LOG="$BK/.sync.log"
cd "$BK" || exit 1

# --- lock para no pisarse entre corridas ---
LOCK="$BK/.sync.lock"
if [ -f "$LOCK" ]; then
  pid=$(cat "$LOCK" 2>/dev/null)
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    echo "$(date '+%F %T') ya corriendo (pid $pid), salgo" >> "$LOG"; exit 0
  fi
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

# --- proyectos a respaldar (origen -> subcarpeta en el repo) ---
PROJECTS=(
  "$HOME/nexus:nexus"
  "$HOME/goautos-admin:goautos-admin"
  "$HOME/estudio:estudio"
  "$HOME/forja-nicojuri:forja-nicojuri"
  "$HOME/nj-Ai-ws:nj-Ai-ws"
  "$HOME/nj-bc-sii:nj-bc-sii"
  "$HOME/nexus-nico-loop:nexus-nico-loop"
  "$HOME/bin:bin-home"
)

# --- excludes de rsync (espejo del .gitignore) ---
EXCLUDES=(
  --exclude '.git/'
  --exclude 'node_modules/' --exclude '.venv/' --exclude 'venv/' --exclude 'env/'
  --exclude '__pycache__/' --exclude '*.pyc' --exclude '.mypy_cache/' --exclude '.pytest_cache/'
  --exclude 'target/' --exclude 'dist/' --exclude 'build/' --exclude '.next/' --exclude 'out/'
  --exclude '.turbo/' --exclude '.cache/' --exclude '.parcel-cache/' --exclude '.remotion/' --exclude 'coverage/'
  --exclude '*.onnx' --exclude '*.bin' --exclude '*.gguf' --exclude '*.pt' --exclude '*.pth'
  --exclude '*.safetensors' --exclude '*.wasm' --exclude '*.node' --exclude '*.dylib' --exclude '*.so'
  --exclude 'ffmpeg' --exclude 'ffprobe' --exclude 'obscura' --exclude 'kokoro/' --exclude 'chrome-headless-shell*'
  --exclude 'chrome-profile/' --exclude '*-chrome/' --exclude '.wwebjs_auth/' --exclude '.wwebjs_cache/'
  --exclude 'user-data-dir/'
  # --- SECRETOS ---
  --exclude '.env' --exclude '.env.*' --exclude '*.pem' --exclude '*.pfx' --exclude '*.p12'
  --exclude '*.key' --exclude '*.crt' --exclude '*.cer' --exclude 'secretos-facturacion/'
  --exclude '*creds*' --exclude '*cred*.json' --exclude 'credenciales*' --exclude 'credentials*'
  --exclude '.centro-cred.json' --exclude 'api_token.txt' --exclude '.api-token' --exclude '*.enc.json'
  --exclude 'token.json' --exclude '*token*.json' --exclude 'uploads/' --exclude 'shots/' --exclude 'certs/'
  # --- datos / logs / media ---
  --exclude '*.db' --exclude '*.db-shm' --exclude '*.db-wal' --exclude '*.sqlite*' --exclude '*.db.bak.*'
  --exclude '*.log' --exclude 'logs/' --exclude 'tmp/' --exclude '.DS_Store' --exclude '.pm2/'
  --exclude '*.mp4' --exclude '*.mov' --exclude '*.avi' --exclude '*.mkv' --exclude '*.webm'
  --exclude '*.wav' --exclude '*.mp3' --exclude '*.aac' --exclude '*.psd'
)

# re-incluir los .env.example (útiles y sin secretos)
INCLUDES=( --include '*/' --include '.env.example' )

for entry in "${PROJECTS[@]}"; do
  src="${entry%%:*}"; dst="${entry##*:}"
  [ -d "$src" ] || continue
  mkdir -p "$BK/$dst"
  rsync -a --delete "${EXCLUDES[@]}" "$src/" "$BK/$dst/" 2>>"$LOG"
done

# --- scrub: redactar secretos que queden embebidos en el código copiado ---
# (no toca los originales; solo la copia del repo antes de commitear)
scrub() {
  grep -rlIZ -E "$1" "$BK" --include='*.ts' --include='*.tsx' --include='*.js' \
      --include='*.jsx' --include='*.mjs' --include='*.py' --include='*.json' \
      --include='*.env*' --include='*.txt' 2>/dev/null \
    | grep -zv '/.git/' \
    | xargs -0 -I{} perl -pi -e "s/$1/__REDACTED_SECRET__/g" {} 2>>"$LOG"
}
scrub 'pk\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'   # Mapbox público
scrub 'sk\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'   # Mapbox secreto
scrub 'sk-ant-[A-Za-z0-9_-]{20,}'              # Anthropic
scrub 'ghp_[A-Za-z0-9]{30,}'                   # GitHub PAT
scrub 'xoxb-[0-9A-Za-z-]{20,}'                 # Slack
scrub 'AKIA[0-9A-Z]{16}'                       # AWS
scrub 'sbp_[a-z0-9]{20,}'                     # Supabase

# --- commit + push si hay cambios ---
git add -A 2>>"$LOG"
if git diff --cached --quiet 2>/dev/null; then
  echo "$(date '+%F %T') sin cambios" >> "$LOG"
  exit 0
fi
STAMP=$(date '+%F %T')
git commit -q -m "respaldo automático $STAMP" 2>>"$LOG"
if git push -q origin main 2>>"$LOG"; then
  echo "$STAMP push OK" >> "$LOG"
else
  echo "$STAMP push FALLÓ (ver arriba)" >> "$LOG"
fi
