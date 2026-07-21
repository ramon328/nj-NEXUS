# Loop Nexus-Nico

Un sistema de 7 agentes que itera hasta que hablar con Nexus se sienta como hablar con Nico.

## Qué es esto

- **Nexus**: el agente que Nico usa día a día, montado sobre su segundo cerebro (Obsidian).
- **Curador**: reorganiza el vault, detecta duplicados y contradicciones.
- **5 Jueces** (Voz, Fidelidad, Routing, Coherencia, Adversarial): evalúan cada respuesta en paralelo.
- **Orquestador**: decide UN cambio por iteración (prompt de Nexus o estructura del vault).

El loop no para hasta que 3 rondas seguidas de la batería completa pasen con score mínimo ≥ 85 en las 5 dimensiones.

## Estado del sandbox vs tu Mac

Este repo se generó en un sandbox sin red hacia HuggingFace, así que **no se pudieron transcribir los audios acá**. Los transcribís tú en tu Mac con `transcribir_voz.py` — corre local, offline, sin API keys.

Los 5 audios que me mandaste están listos para pasar por el script en cuanto los copies a `voz/audios/`.

## Setup (una sola vez)

```bash
# 1. Instalar dependencias
pip install anthropic pyyaml openai-whisper
brew install ffmpeg     # necesario para procesar .opus

# 2. Poner tus audios en voz/audios/
mkdir -p voz/audios
cp ~/Downloads/WhatsApp\ Audio*.opus voz/audios/

# 3. Transcribir y generar el corpus de voz
python3 transcribir_voz.py --modelo small
# Genera voz/transcripciones/*.txt y voz/nexus_voz.md

# 4. Configurar API key
export ANTHROPIC_API_KEY=sk-ant-...
```

## Correr el loop

```bash
# Ruta a tu vault de Obsidian
python3 loop.py --vault ~/Documents/Obsidian/segundo-cerebro

# Con Curador que aplica cambios sin pedir (para pruebas rápidas)
python3 loop.py --vault ~/Documents/Obsidian/segundo-cerebro --auto-approve-curador

# Tope de iteraciones distinto
python3 loop.py --vault ... --max-iteraciones 40
```

Cada iteración se guarda en `reports/iter_XXXX.json`. Al terminar, el prompt final ganador queda en `02_NEXUS_prompt.md` (el original queda como `02_NEXUS_prompt.md.bak`).

## Estructura de archivos

```
.
├── README.md                    ← este archivo
├── 00_ARQUITECTURA.md           ← cómo se conectan los agentes
├── 01_ESTRUCTURA_CEREBRO.md     ← taxonomía canónica del vault
├── 02_NEXUS_prompt.md           ← system prompt de Nexus (el que el loop edita)
├── 03_JUECES.md                 ← los 5 system prompts del jurado
├── 04_CURADOR_prompt.md         ← system prompt del Curador
├── 05_ORQUESTADOR_prompt.md     ← system prompt del Orquestador
├── 06_BATERIA_PRUEBAS.md        ← 55 preguntas trampa
├── loop.py                      ← el orquestador ejecutable
├── transcribir_voz.py           ← convierte audios en corpus de voz
├── voz/
│   ├── audios/                  ← acá van los .opus de WhatsApp
│   ├── transcripciones/         ← se genera automáticamente
│   └── nexus_voz.md             ← se genera automáticamente
└── reports/
    └── iter_XXXX.json           ← log por iteración
```

## Cómo se lee un reporte

Cada `iter_XXXX.json` incluye:

- `pregunta`: cuál se hizo
- `scores_iniciales`: cómo salió Nexus antes del cambio
- `decision`: qué diagnosticó el Orquestador y qué cambio aplicó
- `scores_reprueba`: cómo salió después
- `aprobado`: si pasó el umbral tras el cambio

Para ver por qué el loop no converge, buscas iteraciones con `aprobado: false` recurrente en la misma pregunta.

## Interpretar los scores

| Rango | Significado |
|---|---|
| 85-100 | Aprobado en esa dimensión |
| 70-84 | Advertencia — el Orquestador sigue iterando |
| < 70 | Falla crítica — cambio inmediato obligatorio |

El **mínimo de los 5** es lo que cuenta, no el promedio.

## Cuándo NO funciona

- **Sin corpus de voz**: el Juez de Voz devolverá scores bajos siempre. Corré `transcribir_voz.py` primero.
- **Vault sin frontmatter**: el Curador va a intentar arreglarlo pero la primera ronda va a ser catastrófica. Mejor ejecutar Curador solo primero: `python3 loop.py --vault ... --solo-curador` (bandera pendiente, ver TODO).
- **Menos de 5 audios**: el corpus de voz es débil. Mandá 10-15 audios para calibración decente.

## Costos aproximados

Por ronda de la batería (55 preguntas, sin cambios necesarios):
- ~55 llamadas a Nexus (Opus)
- ~275 llamadas a jueces (Sonnet, 5 por pregunta, en paralelo)
- ~0 al Orquestador

Con cambios (peor caso, un cambio por pregunta):
- Duplicá lo de arriba + 55 llamadas al Orquestador (Opus)
- Aproximadamente USD 3-8 por ronda completa según modelos.

Convergencia típica esperada: 3-6 rondas → USD 15-50 total.

## Filosofía

Nexus falla de 4 formas distintas y ninguna se arregla con "mejor prompt". Voz falla por muletillas, Fidelidad falla por alucinación, Routing falla por MOC malo, Coherencia falla por prisa. Un solo juez colapsa esas dimensiones. Cinco jueces separados no dejan esconderse. El Orquestador cambia UNA cosa por vez para poder atribuir la mejora.

El objetivo no es que Nexus "acierte más". Es que cuando aciertes hablarle, sientas que estás hablándote a ti mismo.
