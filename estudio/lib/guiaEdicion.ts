// Guía de edición profesional 2026 — la "skill" investigada, redactada como
// instrucciones ACCIONABLES para el modelo (Claude) que genera el plan de
// edición. Se inserta en el prompt de generateExecutablePlan (lib/editor.ts).
//
// El objetivo es que la IA edite como un editor profesional de Reels/TikTok:
// que LEA la transcripción para cortar por el habla, dé ritmo con un cambio
// visual cada ~1.5–2 s, enganche en el primer segundo, use Ken Burns en tomas
// fijas, corrija tomas de lado, reencuadre para no cortar al sujeto y ponga
// subtítulos karaoke cuando hay voz.
//
// Fuentes investigadas (skills de video para agentes): anthropics/skills,
// claude-ffmpeg-skill y browser-use/video-use (que "lee" el video como texto
// con timestamps por palabra). Ver docs/skill-edicion-profesional.md.

export const GUIA_EDICION_PROFESIONAL = `GUÍA DE EDICIÓN PROFESIONAL (Reels/TikTok 2026). Aplica estos principios al armar el plan:

0) PRIMERO EL PLAN DE MARKETING, DESPUÉS LA EDICIÓN. Antes de elegir un solo corte, LEE el material (fotogramas + transcripción) y define en tu cabeza un mini-plan: (a) AUDIENCIA —a quién le habla este video—; (b) GANCHO —la idea/toma que frena el scroll en el primer segundo—; (c) UN SOLO MENSAJE —qué tiene que quedarle claro a quien lo ve (ej.: "este auto está impecable y a buen precio")—; (d) CTA —qué queremos que haga (escribir, agendar, visitar)—; (e) EMOCIÓN/vibra (aspiracional, confianza, urgencia, cercanía). TODAS tus decisiones de edición (qué clips, en qué orden, ritmo, textos, música, color, stickers) deben SERVIR a ese mensaje y terminar en el CTA. Un video bonito sin mensaje no vende; edita como quien vende, no como quien decora.

0.1) CIERRE CON CTA. El último segmento remata con el llamado a la acción del plan: un texto claro y corto en pantalla (ej.: "Escríbenos 👉", "Agenda tu test drive", "Últimas unidades") acompañando la mejor toma o el logo. Nunca cierres en seco ni en una toma débil.

1) RITMO (retención). Provoca un cambio visual cada 1.5–2 segundos: un corte, un movimiento de cámara (zoom/paneo), un cambio de texto o la aparición de un sticker. Segmentos de menos de ~1.2 s se sienten ruido; más de ~2.5 s sin ningún cambio hacen caer la retención. Apunta a segmentos de ~1.5–2.5 s.

2) GANCHO NANO (<1.5 s). El comienzo lo decide todo: en el primer segundo y medio debe pasar lo más atractivo. Si tienes la transcripción, empieza por la mejor frase o el momento de más energía; NO abras con relleno, saludos vacíos ni silencios. Ordena los segmentos para que el mejor momento quede al inicio.

3) CORTA POR EL HABLA. Cuando haya transcripción con tiempos, elige los cortes en límites de palabra o de frase: que cada segmento empiece y termine donde empieza/termina una idea. Quita muletillas, relleno, titubeos y silencios largos. No cortes a mitad de palabra.

4) KEN BURNS. En tomas fijas, estáticas o largas (una persona hablando a cámara, un plano sin movimiento), aplica un movimiento de cámara lento con "zoom": "acercar" (push-in) da intimidad y foco; "alejar" (pull-out) revela contexto; "paneo-izquierda"/"paneo-derecha" dan vida a un plano amplio. Úsalo para que ninguna toma quede muerta. En tomas que YA tienen mucho movimiento propio, usa "ninguno".

5) ROTACIÓN. Si en los fotogramas una toma se ve girada (grabada de lado, el horizonte vertical, personas "acostadas"), corrígela con "rotacion": 90, 180 o 270 según corresponda para dejarla derecha. Si está bien, usa 0.

6) REENCUADRE (9:16). Al recortar un video horizontal a vertical se pierde parte del cuadro: elige "reencuadre" para conservar al sujeto principal —"izquierda", "centro" o "derecha"— mirando en qué parte del fotograma está la persona o la acción. No cortes la cara ni el foco de la escena.

7) SUBTÍTULOS. El ~80% de los reels se ven sin sonido: si hay voz, los subtítulos son casi obligatorios. Los subtítulos ANIMADOS palabra por palabra (karaoke/pop-on) retienen más que un bloque estático. Cuando el video tenga voz, elige "subtitulos_estilo": "karaoke". Si NO hay voz (solo música/ambiente), no fuerces subtítulos.

8) NO SATURES. Máximo 1–4 stickers y úsalos en momentos con sentido (un beat, un énfasis, un CTA), casi siempre en las esquinas para no tapar el centro. No metas un sticker en cada segundo. Los efectos de sonido dan ritmo, pero con mesura.

9) COHERENCIA TIPOGRÁFICA. Usa 1 o 2 fuentes como máximo en todo el video, elegidas por la vibra. Mezclar muchas fuentes se ve amateur. Elige colores de texto que CONTRASTEN con el fondo de la escena donde aparecen.

10) QUE SE VEA CARO (creatividad con intención). Buscamos que parezca producción profesional, no un video casero:
   • TEXTO CON JERARQUÍA: pocas palabras, grandes, con una palabra clave que destaque (color de acento o estilo distinto). El texto puntúa el mensaje del plan; no describe lo obvio ni repite lo que ya se ve.
   • MOVIMIENTO SIEMPRE: ninguna toma 100% quieta. Combina el corte con Ken Burns y una velocidad ligeramente variable (speed-ramp sutil) para dar energía; guarda los cortes más rápidos para el clímax.
   • COLOR CON IDENTIDAD: elige UN filtro de color coherente con la vibra (cálido/aspiracional, frío/premium, contrastado/punchy) y mantenlo en todo el video para que se sienta "de marca".
   • MÚSICA QUE MANDA EL RITMO: elige la pista por el mood del plan y deja que marque la energía; sube la música en el gancho y en el cierre, y déjala respirar bajo la voz.
   • TRANSICIONES CON CRITERIO: la mayoría cortes secos (más pro); reserva 1–2 transiciones llamativas (zoom, wipe) para los momentos fuertes o el CTA. No uses una transición distinta en cada corte: se ve amateur.
   • STICKERS/SFX como acento del beat o del CTA, nunca de relleno.
   • REMATE DE MARCA: cierra con el CTA y, si hay logo/sticker de marca disponible, colócalo en el último segmento.

En resumen: primero el PLAN (audiencia, gancho, un mensaje, CTA), y después edita TODO para servir ese mensaje: engancha en el primer segundo, corta por el habla, ritmo de 1.5–2 s con cortes y movimiento, endereza y reencuadra, color de marca coherente, música que manda el ritmo, subtítulos karaoke si hay voz, y cierra con un CTA claro. Edita como quien vende, no como quien decora.`;
