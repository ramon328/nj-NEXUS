#!/usr/bin/env python3
"""
Nexus — App de barra de menú (menu bar).
SOLO es un indicador visual + accesos. NO contiene lógica de negocio.
Si se cierra, los servicios (daemons launchd) siguen corriendo igual.

Pregunta el estado al Hub (/api/health), que ya agrega los health-checks
de todos los servicios. Muestra un semáforo por servicio y permite:
  - abrir el Hub en el navegador
  - reiniciar un servicio (vía la API del Hub)
"""
import json
import subprocess
import urllib.request
import urllib.error

import rumps

HUB = "http://127.0.0.1:3000"
INTERVALO = 8  # segundos entre chequeos

VERDE = "🟢"
ROJO = "🔴"
GRIS = "⚪️"


def get_health():
    try:
        with urllib.request.urlopen(f"{HUB}/api/health", timeout=3) as r:
            return json.load(r).get("servicios", [])
    except Exception:
        return None


def restart(label):
    try:
        req = urllib.request.Request(f"{HUB}/api/restart/{label}", method="POST")
        urllib.request.urlopen(req, timeout=5).read()
        return True
    except Exception:
        return False


class NexusBar(rumps.App):
    def __init__(self):
        super().__init__("Nexus", quit_button=None)
        self.menu = ["(cargando…)"]
        self.servicios = []
        self.timer = rumps.Timer(self.refrescar, INTERVALO)
        self.timer.start()
        self.refrescar(None)

    def refrescar(self, _):
        servicios = get_health()
        self.menu.clear()

        if servicios is None:
            self.title = ROJO
            self.menu.add(rumps.MenuItem("Hub no responde (:3000)"))
        else:
            self.servicios = servicios
            # El semáforo general solo cuenta servicios desplegados.
            desplegados = [s for s in servicios if s.get("desplegado", True)]
            activos = sum(1 for s in desplegados if s.get("activo"))
            total = len(desplegados)
            self.title = VERDE if activos == total else (ROJO if activos == 0 else "🟠")
            for s in servicios:
                if not s.get("desplegado", True):
                    icon = GRIS
                    estado = "pendiente"
                else:
                    icon = VERDE if s.get("activo") else ROJO
                    estado = s.get("uptime") or ("activo" if s.get("activo") else "caído")
                item = rumps.MenuItem(f"{icon}  {s['nombre']}  ·  :{s['puerto']}  ·  {estado}")
                # Submenú reiniciar
                sub = rumps.MenuItem(
                    "Reiniciar",
                    callback=(lambda _, lbl=s["label"]: self._reiniciar(lbl)),
                )
                item.add(sub)
                self.menu.add(item)

        self.menu.add(rumps.separator)
        self.menu.add(rumps.MenuItem("🛰  Vista General (Jarvis)", callback=self.abrir_vista))
        self.menu.add(rumps.MenuItem("Abrir Hub", callback=self.abrir_hub))
        self.menu.add(rumps.separator)
        self.menu.add(rumps.MenuItem("Salir (los servicios siguen activos)", callback=rumps.quit_application))

    def _reiniciar(self, label):
        ok = restart(label)
        rumps.notification("Nexus", "Reinicio", f"{label}: {'solicitado' if ok else 'falló'}")
        self.refrescar(None)

    def abrir_hub(self, _):
        subprocess.run(["open", HUB])

    def abrir_vista(self, _):
        # Vista General a pantalla completa. La voz (Jarvis) necesita Chrome →
        # se abre en Google Chrome si está; si no, en el navegador por defecto.
        url = f"{HUB}/vista"
        try:
            subprocess.run(["open", "-a", "Google Chrome", url], check=True)
        except Exception:
            subprocess.run(["open", url])


if __name__ == "__main__":
    NexusBar().run()
