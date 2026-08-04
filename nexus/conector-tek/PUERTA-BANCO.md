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
