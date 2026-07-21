# Autos Intel — agendador en segundo plano (silencioso)

Corre el scraper **dos veces al día**, en un **minuto aleatorio** dentro de cada
ventana, sin ventana de terminal y sin arranque manual:

- **Mañana:** arranque aleatorio entre **09:00 y 10:00**
- **Noche:** arranque aleatorio entre **21:00 y 22:00**

El minuto se re-sortea en **cada** corrida (nunca a la misma hora exacta, para no
ser detectable/bloqueable). La hora elegida queda registrada en el log.

> Esto es para correr el scraper en **tu computador local**. Es independiente del
> cron de GitHub Actions (`.github/workflows/scrape.yml`), que sigue existiendo.
> Si usás ambos, podés desactivar uno para no duplicar.

## Cómo funciona

| SO | Mecanismo | Cómo se sortea el minuto |
|---|---|---|
| **macOS** | `launchd` (LaunchAgent) | el agente dispara a las 09:00 y 21:00; el `run.sh` espera 0–59 min aleatorios |
| **Linux** | `cron` | cron dispara a las 09:00 y 21:00; el `run.sh` espera 0–59 min aleatorios |
| **Windows** | Task Scheduler | dos triggers diarios con `RandomDelay` nativo de 1h |

El runner escribe **un solo log de corridas** con la hora elegida, el inicio, la
salida del scraper y el código de salida.

## macOS / Linux

```bash
./scheduler/ctl.sh install     # instala y activa
./scheduler/ctl.sh status      # estado + últimas líneas del log
./scheduler/ctl.sh run-now     # corre YA (sin espera), para probar
./scheduler/ctl.sh disable     # pausa (sin desinstalar)
./scheduler/ctl.sh enable      # reanuda
./scheduler/ctl.sh logs        # sigue el log en vivo
./scheduler/ctl.sh uninstall   # quita el agendamiento
```

### Dónde quedan las cosas (macOS)

```
~/Library/LaunchAgents/com.autosintel.scraper.plist     # el agente (09:00 y 21:00)
~/Library/Application Support/AutosIntel/run.sh          # runner (sortea minuto + corre)
~/Library/Application Support/AutosIntel/env             # config (repo, python, args)
~/Library/Application Support/AutosIntel/disabled        # si existe -> pausado
~/Library/Logs/AutosIntel/scraper.log                    # log de corridas
```

> **Por qué el runner vive fuera del repo (macOS):** `launchd` no puede **leer**
> archivos dentro de `~/Documents` (protección TCC). Por eso el runner y los logs
> viven en `~/Library/...`. El intérprete de Python del `.venv` **sí** puede leer
> el paquete del repo y el `.env`, así que no hace falta dar *Full Disk Access* a
> nada. (Por eso el viejo `run_local.sh`, que vivía en el repo, fallaba con
> *"Operation not permitted"* — quedó obsoleto.)

## Windows

```powershell
powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Install
powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Status
powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -RunNow
powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Disable
powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Enable
powershell -ExecutionPolicy Bypass -File scheduler\windows\Install-Scheduler.ps1 -Uninstall
```

Log en `%LOCALAPPDATA%\AutosIntel\logs\scraper.log`. La tarea corre con ventana
oculta (`-WindowStyle Hidden`).

## Ajustes

Editá `~/Library/Application Support/AutosIntel/env` (mac) o el equivalente:

- `MAX_DELAY_SEC` — ancho de la ventana en segundos (default `3599` = hasta 59 min).
- `EXTRA_ARGS` — argumentos para `python -m scraper.main` (p. ej. `--source linze`
  para correr solo Linze, o `--no-recheck` para no reconciliar vendidos).

Para cambiar las **horas** de las ventanas, editá las `StartCalendarInterval` del
plist (mac) / las entradas de `crontab -l` (Linux) / los triggers de la tarea
(Windows) y reinstalá.

### Alternativa systemd (Linux)

En vez de cron podés usar un `systemd --user` timer con `OnCalendar=*-*-* 09,21:00`
y `RandomizedDelaySec=1h`, apuntando el `ExecStart` al `run.sh`. cron es el default
por simplicidad.
