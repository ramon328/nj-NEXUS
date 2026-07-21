# Autos Intel — runner del scraper en Windows (silencioso, sin ventana).
# Lo invoca el Task Scheduler al disparar (el minuto aleatorio lo da el RandomDelay
# del trigger). Registra la hora real de arranque y corre el scraper.
$ErrorActionPreference = 'Continue'

$Repo   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)  # ...\autosintel-scraper
$LogDir = Join-Path $env:LOCALAPPDATA 'AutosIntel\logs'
$State  = Join-Path $env:LOCALAPPDATA 'AutosIntel'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$Log = Join-Path $LogDir 'scraper.log'

function Log($msg) {
  $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz'
  Add-Content -Path $Log -Value "$ts | $msg"
}

# Toggle de deshabilitado.
if (Test-Path (Join-Path $State 'disabled')) {
  Log 'SKIP — agendador deshabilitado (existe disabled).'
  exit 0
}

# Python del venv si existe, si no el del PATH.
$Python = Join-Path $Repo '.venv\Scripts\python.exe'
if (-not (Test-Path $Python)) { $Python = 'python' }

Log '==================== INICIO corrida ===================='
Log "Arranque (minuto aleatorio del trigger) a las $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Log "repo=$Repo python=$Python"

Push-Location $Repo
try {
  & $Python -m scraper.main *>> $Log
  $rc = $LASTEXITCODE
} finally {
  Pop-Location
}
Log "==================== FIN corrida (exit $rc) ===================="
exit $rc
