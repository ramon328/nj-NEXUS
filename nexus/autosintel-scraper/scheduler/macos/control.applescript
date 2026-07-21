-- Autos Intel — Panel de control (icono clickeable, macOS).
-- Doble clic abre un menú con botones para: Pausar/Reanudar el agendador,
-- Correr ahora, Ver log y Ver estado. El agendamiento real (9–10 AM y 9–10 PM,
-- minuto aleatorio) lo maneja launchd vía scheduler/ctl.sh.
--
-- Este .applescript se compila a una .app con scheduler/macos/build_app.sh.

property repoPath : "/Users/AIagenteia/Documents/GitHub/autosintel-scraper"

on ctlPath()
	return quoted form of (repoPath & "/scheduler/ctl.sh")
end ctlPath

on runCtl(cmd)
	return do shell script "/bin/bash " & ctlPath() & " " & cmd
end runCtl

on disabledFlag()
	return (POSIX path of (path to home folder)) & "Library/Application Support/AutosIntel/disabled"
end disabledFlag

on isDisabled()
	try
		do shell script "test -f " & quoted form of disabledFlag()
		return true
	on error
		return false
	end try
end isDisabled

on isInstalled()
	try
		do shell script "launchctl print gui/$(id -u)/com.autosintel.scraper >/dev/null 2>&1"
		return true
	on error
		return false
	end try
end isInstalled

on run
	repeat
		set installed to isInstalled()
		if not installed then
			set estado to "⚠️  NO instalado en el sistema"
			set togLabel to "Instalar y activar"
		else if isDisabled() then
			set estado to "⏸  PAUSADO (no correrá hasta reanudar)"
			set togLabel to "Reanudar"
		else
			set estado to "▶️  ACTIVO — corre 9–10 AM y 9–10 PM (minuto al azar)"
			set togLabel to "Pausar"
		end if

		set opts to {togLabel, "Correr ahora", "Ver log", "Ver estado"}
		set sel to (choose from list opts with title "Autos Intel — Scraper" with prompt ("Estado: " & estado & return & return & "Elegí una acción:") OK button name "Aceptar" cancel button name "Cerrar")
		if sel is false then exit repeat
		set action to item 1 of sel

		if action is "Instalar y activar" then
			runCtl("install")
			display notification "Agendador instalado y activo (9–10 AM y 9–10 PM)." with title "Autos Intel"
		else if action is "Reanudar" then
			runCtl("enable")
			display notification "Scraper reanudado." with title "Autos Intel"
		else if action is "Pausar" then
			runCtl("disable")
			display notification "Scraper pausado. No correrá hasta reanudar." with title "Autos Intel"
		else if action is "Correr ahora" then
			-- Lanzado en segundo plano para no bloquear el panel.
			do shell script "/bin/bash " & ctlPath() & " run-now >/dev/null 2>&1 &"
			display notification "Corrida iniciada. Mirá el progreso en 'Ver log'." with title "Autos Intel"
		else if action is "Ver log" then
			set logFile to (POSIX path of (path to home folder)) & "Library/Logs/AutosIntel/scraper.log"
			try
				do shell script "test -f " & quoted form of logFile
				do shell script "open -a Console " & quoted form of logFile
			on error
				display dialog "Todavía no hay log: el scraper aún no corrió." buttons {"OK"} default button "OK" with title "Autos Intel"
			end try
		else if action is "Ver estado" then
			set txt to runCtl("status")
			display dialog txt buttons {"OK"} default button "OK" with title "Autos Intel — Estado"
		end if
	end repeat
end run
