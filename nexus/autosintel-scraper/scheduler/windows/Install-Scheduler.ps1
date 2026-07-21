<#
  Autos Intel — instalador del agendador en Windows (Task Scheduler, oculto).

  Crea una tarea que corre el scraper DOS veces al día, a un minuto ALEATORIO
  dentro de cada ventana, usando el RandomDelay nativo del Task Scheduler:
    • Mañana: 09:00 + RandomDelay 1h  => arranque aleatorio 09:00–10:00
    • Noche:  21:00 + RandomDelay 1h  => arranque aleatorio 21:00–22:00
  El RandomDelay re-sortea el minuto en cada disparo (nunca a la misma hora).

  La tarea corre con ventana OCULTA (powershell -WindowStyle Hidden) y deja log en
  %LOCALAPPDATA%\AutosIntel\logs\scraper.log.

  Uso (PowerShell):
    powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Install
    powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Status
    powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Disable
    powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Enable
    powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -RunNow
    powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Uninstall
#>
param(
  [switch]$Install,
  [switch]$Uninstall,
  [switch]$Enable,
  [switch]$Disable,
  [switch]$Status,
  [switch]$RunNow
)

$TaskName = 'AutosIntel Scraper'
$RunPs1   = Join-Path $PSScriptRoot 'run.ps1'
$State    = Join-Path $env:LOCALAPPDATA 'AutosIntel'
$Log      = Join-Path $State 'logs\scraper.log'
New-Item -ItemType Directory -Force -Path $State | Out-Null

function Do-Install {
  $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$RunPs1`""

  $delay = New-TimeSpan -Hours 1
  $t1 = New-ScheduledTaskTrigger -Daily -At 9am
  $t1.RandomDelay = $delay
  $t2 = New-ScheduledTaskTrigger -Daily -At 9pm
  $t2.RandomDelay = $delay

  # Oculto + corre aunque sea con batería; no requiere admin (scope usuario actual).
  $settings = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries -StartWhenAvailable -MultipleInstances IgnoreNew
  $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

  Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($t1,$t2) `
    -Settings $settings -Principal $principal -Force | Out-Null
  Remove-Item (Join-Path $State 'disabled') -ErrorAction SilentlyContinue
  Write-Host "✓ Tarea '$TaskName' instalada. Ventanas 09:00–10:00 y 21:00–22:00 (RandomDelay 1h)."
  Write-Host "  Log: $Log"
}

function Do-Uninstall {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  Write-Host "✓ Tarea '$TaskName' removida."
}

function Do-Status {
  $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  if ($task) {
    Write-Host "Estado tarea: $($task.State)"
    Get-ScheduledTaskInfo -TaskName $TaskName | Format-List LastRunTime, LastTaskResult, NextRunTime
  } else {
    Write-Host "Tarea NO instalada. Corré con -Install."
  }
  if (Test-Path (Join-Path $State 'disabled')) { Write-Host "Toggle: DESHABILITADO" } else { Write-Host "Toggle: habilitado" }
  if (Test-Path $Log) { Write-Host "── últimas líneas ──"; Get-Content $Log -Tail 12 }
}

if     ($Install)   { Do-Install }
elseif ($Uninstall) { Do-Uninstall }
elseif ($Enable)    { Remove-Item (Join-Path $State 'disabled') -ErrorAction SilentlyContinue; Write-Host "✓ Habilitado." }
elseif ($Disable)   { New-Item -ItemType File -Force -Path (Join-Path $State 'disabled') | Out-Null; Write-Host "✓ Deshabilitado." }
elseif ($Status)    { Do-Status }
elseif ($RunNow)    { & powershell -NoProfile -ExecutionPolicy Bypass -File $RunPs1; Write-Host "✓ Corrida manual lista. Log: $Log" }
else   { Write-Host "Pasá uno de: -Install -Uninstall -Enable -Disable -Status -RunNow" }
