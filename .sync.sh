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

# --- scrub: redactar secretos embebidos en el código copiado ---
# (no toca los originales; solo la copia del repo antes de commitear)
# macOS-safe: find -print0 + perl in-place con todos los patrones.
find "$BK" -type f -not -path '*/.git/*' \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.mjs' \
     -o -name '*.cjs' -o -name '*.py' -o -name '*.json' -o -name '*.txt' \
     -o -name '*.yml' -o -name '*.yaml' -o -name '*.env*' -o -name '*.md' -o -name '*.sh' \) \
  -print0 2>/dev/null | xargs -0 perl -pi -e '
    s/pk\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/__REDACTED_SECRET__/g;
    s/sk\.ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/__REDACTED_SECRET__/g;
    s/sk-ant-[A-Za-z0-9_-]{20,}/__REDACTED_SECRET__/g;
    s/ghp_[A-Za-z0-9]{30,}/__REDACTED_SECRET__/g;
    s/gho_[A-Za-z0-9]{30,}/__REDACTED_SECRET__/g;
    s/xoxb-[0-9A-Za-z-]{20,}/__REDACTED_SECRET__/g;
    s/AKIA[0-9A-Z]{16}/__REDACTED_SECRET__/g;
    s/sbp_[a-f0-9]{20,}/__REDACTED_SECRET__/g;
    s/AIza[0-9A-Za-z_-]{35}/__REDACTED_SECRET__/g;
  ' 2>>"$LOG"

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
