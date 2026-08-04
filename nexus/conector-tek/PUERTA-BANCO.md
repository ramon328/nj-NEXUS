# La puerta del banco (tek) — cómo opera Nexus con Santander

Actualizado: 03/04-ago-2026. Fuente de verdad: `puerta.mjs`.

## El problema que resuelve

El 03-ago Joaquín quiso transferir y no pasó nada: el sistema forzaba la sesión de **ramon**
para ANA CLARA (regla vieja), esa sesión estaba dormida, y el link `/vnc` + PIN nunca le llegó
porque dependía de que el modelo se acordara de llamar `reconectar_banco`.

Las dos decisiones que ya **no** dependen del criterio del modelo:

1. **Con qué sesión se opera** → `puerta.elegirSesion()`
2. **Cómo se entra si está dormida** → el motor devuelve `necesita_login` con `url` + `pin`

## 1. Sesión por persona

**Cada persona opera con SU propio login del banco, también en ANA CLARA.**
Joaquín entra con el banco de Joaquín, Nico con el de Nico, Ramón con el suyo.
Cada uno tiene su perfil de Chrome persistente (`chrome-profile-<user>`), su `session-<user>.json`
y su device-trust (sembrado la primera vez desde el perfil confiable).

Reglas de `elegirSesion({ usuario, empresa, admin })`:

- **No admin** (ej. Joaquín) → acotado a su empresa principal; no elige.
- **Admin** → la empresa que pidió, resuelta al nombre canónico de SUS conexiones
  ("Ltda" ≈ "LIMITADA").
- Si quien pide **no** tiene esa empresa conectada → cae al dueño canónico del vault.
- Kill-switch de emergencia: `TEK_ANACLARA_SOLO_RAMON=1` vuelve a la regla vieja
  (ANA CLARA siempre con ramon) sin tocar código.

## 2. La operación viaja CON el login

`login-humano.mjs` corre las acciones (`TEK_CREAR`, `TEK_MASIVA`, `TEK_VER_PENDIENTES`,
`TEK_COMPROBANTES`…) **apenas aterriza en el portal**, venga de un login automático o de uno
asistido. Eso es lo que hace posible el "entrá y sigue solo":

```
sesión dormida
  → puerta.abrirAsistido({ userId, empresa, env: <la operación> })
      · PIN nuevo de 8 dígitos al archivo OTP que lee serve-novnc (:6081, ruta pública /vnc)
      · spawn detached de login-humano con TEK_ASSIST=1 + la operación + TEK_RESULTADO_FILE
  → el tool devuelve YA { necesita_login, url, pin, job }  (no bloquea el chat)
  → la persona entra por /vnc, teclea clave + Superclave
  → login-humano detecta el aterrizaje y EJECUTA la operación
  → deja el resultado en el job file
  → el hub (seguirJobBanco) lo lee y le escribe a la persona por WhatsApp cómo quedó
```

El PIN es de **un solo uso**: `login-humano` vacía el archivo OTP al salir, así la URL queda
inútil fuera de la ventana.

## La vista desde el teléfono (04-ago)

Ramón abrió el link y vio "la pantalla de bloqueo": era el **escritorio del mini con ventanas
encima** — había conectado más rápido de lo que Chrome tardaba en abrir el banco. Peleó con eso
y se le venció la ventana de 5 min. Arreglado así:

- **Telón en la página `/vnc`**: mientras el estado sea `esperando` NO se muestra la pantalla del
  mini, se muestra "Preparando el banco…". `login-humano` escribe `listo_para_aceptar` en
  `.novnc-estado` cuando el formulario ya está en pantalla y ahí recién se levanta el telón.
  Red de seguridad: a los 45 s se levanta igual. Si el ingreso termina mal, barra roja con el motivo.
- **Zoom 2x** (`--force-device-scale-factor=2`, `TEK_ASSIST_ZOOM` para cambiarlo): la pantalla del
  mini es 1920x1080 y en un teléfono el formulario quedaba diminuto. Con 2x el botón Aceptar es un
  blanco grande. `TEK_ASSIST_ZOOM=1` vuelve a como estaba.
- **Banco al frente y a pantalla completa**: `--start-fullscreen` + `page.bringToFront()` +
  `osascript` sobre el PID del Chrome (ubicado por su `user-data-dir`). Verificado: tapa el
  escritorio, el Dock y las demás ventanas.
- **Espera de 5 → 10 min** (`TEK_ASSIST_ESPERA_MS`), y el tope duro del proceso pasa a
  espera + 8 min en asistido (si no, moríamos justo cuando la persona terminaba de entrar).
- **`caffeinate -dimsu`** mientras dura la ventana: la pantalla no se duerme a mitad del ingreso.
- **Aviso de girar el teléfono**: la pantalla del mini es apaisada; en vertical entra como una
  franja. La barra de abajo lo dice y se actualiza al girar.

## Candados (por qué no se pisan entre sí)

- **Un login asistido a la vez**: hay una sola pantalla. Si ya hay uno en vuelo y es *otra*
  operación → `ocupado` (no se puede enganchar una segunda operación a un login en curso, y
  pisar el PIN dejaría al usuario con uno muerto). Si es *la misma* operación → mismo link,
  mismo PIN.
- **Navegador por persona** (`candado.mjs`): si el Chrome de esa persona está tomado por otro
  proceso, `abrirAsistido` **no spawnea** y devuelve `ocupado` — antes se quedaba minutos
  esperando el candado con un PIN vivo y una pantalla que no abría nada.
- **Anti-duplicado de transferencias**: la huella (empresa+rut+cuenta+monto) sigue mandando.
  Con un login abierto para esa misma transferencia, volver a pedirla devuelve el mismo link.
- **Throttle anti-quemado**: NO aplica al asistido (lo teclea una persona; frenarlo dejaría al
  usuario con un link muerto). Sigue aplicando a todo login automático.

## Estado de sesión sin abrir el navegador

`puerta.estadoSesion(user)` mira dos fuentes: el corazón (`data/sesiones.json`, solo si late
hace < 6 min) y la **frescura** de `session-<user>.json` (< 12 min = reusable). Con el corazón
pausado —hoy lo está para nico/joaquin, ver `PAUSADO-descanso-ip.txt`— vale la frescura.

## Qué falta / decisiones pendientes

- **Corazón (keepalive) para nico y joaquin**: apagado desde el reposo del 02-ago. Encenderlo
  haría que, tras un login asistido, su sesión se mantenga viva horas y las siguientes
  operaciones no pidan login. El keepalive **nunca loguea** (si no hay sesión viva, se va);
  el que quemaba la cuenta era `tek-historica`. Decisión de Ramón.
- **`TEK_COMPRA_AUTO=1`**: reactiva el pago automático (tek_masiva) dentro del flujo de compra
  de autos. Hoy en manual.
- **Autorización/liberación**: nunca la hace Nexus. Es Superclave, a mano, siempre.
