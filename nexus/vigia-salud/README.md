# Vigía de Salud del Mac mini

Sistema que mantiene sano el Mac **sin romper nada y sin matar procesos**.
Solo observa, mide, registra y avisa. Los servicios de Nexus son intocables.

## Piezas

- **`vigia.mjs`** — corre cada 3 min (LaunchAgent `com.nexus.vigia-salud`).
  Mide carga, RAM libre, swap, compresor, disco, nº de procesos y nº de
  sesiones de chat `claude`. Clasifica en 🟢 VERDE / 🟡 AMARILLO / 🔴 ROJO.
  - Escribe el estado actual en `estado.json` y el histórico en `historial.jsonl` (recortado a 5.000 líneas).
  - Cuando pasa a AMARILLO/ROJO **avisa con una notificación del Mac** (con sonido).
    Re-avisa cada 30 min mientras siga en ROJO.
  - Limpieza segura: borra PNG de gráficos en `/tmp` de +2 días. Nada más.
  - **Nunca mata procesos. Nunca toca servicios.**

- **`reciclar-sesiones.sh`** — MANUAL y opt-in. Suelta solo las sesiones
  colgadas del chat web (`claude -p ... --resume`) que llevan +6h vivas
  (la fuga de RAM real). No toca el hub ni ningún servicio.
  - `./reciclar-sesiones.sh` → solo muestra candidatas (no mata nada)
  - `./reciclar-sesiones.sh --hacer` → las recicla (TERM suave)
  - `HORAS=8 ./reciclar-sesiones.sh` → cambia el umbral

- **`config.json`** (opcional) — sobrescribe umbrales. Ver defaults en `vigia.mjs`.

## Ver el estado ahora
```
cat ~/nexus/vigia-salud/estado.json
```

## Avisar por WhatsApp además de la notificación (opt-in)
1. `echo '{"numeroWhatsApp":"569XXXXXXXX"}' > ~/nexus/vigia-salud/config.json`
2. `touch ~/nexus/vigia-salud/ALERTAR_WHATSAPP`
(Por defecto está apagado para no arriesgar el número.)

## Por qué existe
El chat web abre un proceso `claude` por conversación y no lo cerraba: se
acumulaban 5–7 sesiones de 500–700 MB durante 17–18 h. Eso llenaba la RAM,
disparaba el swap y ahogaba al hub (1 hilo) → se colgaba. El vigía lo detecta
temprano y avisa; el reciclador libera esa RAM cuando tú lo decides.
