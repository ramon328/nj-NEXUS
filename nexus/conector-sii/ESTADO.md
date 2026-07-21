# Conector SII — Estado y uso seguro

## Qué hace
Accede al portal del SII con **clave tributaria** (RUT + clave) y descarga documentos
a la carpeta de cada empresa. NO usa la API en la nube de LibreDTE (esa requiere su
propio token + certificado .p12). Hace, por HTTP directo, lo mismo que LibreDTE por debajo.

## Empresas configuradas
Credenciales y ruta de descarga en `~/nexus/credenciales.json` → `sii.empresas` (chmod 600, gitignored).
- **77271121-2 — ANA CLARA SPA** → `~/Desktop/documentos sii/ANA CLARA SPA (77.271.121-2)`

## ⚠️ REGLA DE ORO — no bloquear la cuenta
El SII bloquea cuentas ante logins automáticos repetidos. Por eso:
- **UN solo login por ejecución**, se reusan las cookies para todo.
- Pausas 1.5–3 s entre requests; **sin** bucles de reintento de login.
- Aborta ante señales de bloqueo (403/429, "bloquead", "intentos", "captcha", "clave temporal").
- Límite de ~25 requests al SII por corrida.
- **Nunca** correr en bucle ni en paralelo contra el SII.

## Estado actual (2026-06-15)
- ✅ Cuenta SANA: el throttle/bloqueo del 14/06 YA SE PASÓ. Login con clave verificado válido
  hoy (1 solo login): devolvió sesión completa (TOKEN, CSESSIONID, NETSCAPE_LIVEWIRE.*) + bootstrap app HTTP 200 + logout limpio.
- ✅ Empresa identificada: ANA CLARA SPA (MEDIANA EMPRESA).
- ❌ DESCARTADO que el `codRespuesta:99 "El token no es valido"` fuera throttle: con la cuenta
  sana, `getResumen COMPRA 202606` SIGUE dando `codRespuesta=99` → es un **problema de CONTRATO/TOKEN**,
  no de bloqueo ni de "no hay datos" (sabemos que existe la factura folio 458 recibida 13/06/2026).
- 🎯 CONCLUSIÓN: el servicio JSON del RCV (`getResumen`/FacadeService) **NO acepta el TOKEN del
  login por clave**. Necesita el token del flujo por **certificado** (seed→firma→getToken,
  `lib/sii-cert-auth.mjs`). Por eso la vía clave NO sirve para bajar RCV; hay que usar el `.p12`
  (vía `descargar-todo.mjs`) o capturar el bootstrap real de la SPA (`capturar-rcv.mjs`).
- ⚠️ No hacer más logins seguidos hoy (un login por sesión).

## Antes de volver a correr (hacer a mano, humano)
Iniciar sesión manualmente en:
https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html
- Si entra bien → fue throttle por automatización; esperar un rato y correr UNA vez.
- Si pide desbloqueo / clave temporal → recuperar la clave en el SII antes de seguir.

## Uso (cuando la cuenta esté confirmada sana)
```bash
cd ~/nexus/conector-sii
node descargar-rcv.mjs 77271121-2 202604 COMPRA   # o VENTA
# Guarda en: <carpeta>/RCV/<periodo>/rcv-<compra|venta>-<periodo>.csv (+ .json)
```

## Vía certificado (recomendada, sin bloqueo)
La autenticación por **certificado digital** (firma electrónica) NO usa el login de
portal con clave, por lo que **no dispara el bloqueo anti-bot** del SII. Es el método
oficial máquina-a-máquina. Esta es la vía recomendada; la de clave queda como fallback.

Cómo funciona (en `lib/sii-cert-auth.mjs`):
1. **getSeed** — POST SOAP a `https://palena.sii.cl/DTEWS/CrSeed.jws` → `<SEMILLA>`.
2. **firmar** — XML `<getToken><item><Semilla>…</Semilla></item></getToken>` firmado con
   XML-DSig enveloped (C14N 2001, RSA-SHA1, Reference URI="", DigestMethod SHA1,
   KeyInfo con X509Data + RSAKeyValue).
3. **getToken** — POST SOAP del XML firmado a `GetTokenFromSeed.jws` → `<TOKEN>`.
4. El TOKEN se manda como cookie `TOKEN=<valor>` a los servicios JSON del RCV.

Cómo activarla:
1. Conseguir el certificado de la empresa en formato **.p12 / .pfx** (NO va en el repo).
2. En `~/nexus/credenciales.json` → `sii.empresas["77271121-2"].cert`, llenar:
   - `"ruta"`: ruta absoluta al archivo `.p12`.
   - `"clave"`: contraseña del `.p12`.
3. Instalar deps (una vez): `cd ~/nexus/conector-sii && npm install`.
4. Correr: `node descargar-todo.mjs 77271121-2 12`  (RUT y meses hacia atrás).
   - Obtiene el token UNA vez (cacheado), recorre los últimos N períodos y baja
     RCV COMPRA + VENTA de cada uno, con throttle 1–2 s y guardarraíles.

Alcance de esta vía:
- ✅ **Sí**: RCV (compras/ventas), DTE recibidos/emitidos (derivados del RCV), libros.
- ❌ **No** por esta vía: **F29 / F22** (formularios), que no se exponen por estos
  web services de token; requieren otro flujo (portal). Quedan fuera de alcance aquí.

Nota honesta: la firma XML-DSig del SII a veces requiere **afinar canonicalización/formato**
y solo se valida del todo con el `.p12` real + el SII en vivo. La firma local ya se
autoverifica (`checkSignature` OK) con `URI=""`, RSA-SHA1, c14n 2001, X509Data + RSAKeyValue.

## Archivos
- `lib/sii-auth.mjs`  — login con clave tributaria (1 POST), devuelve cookies de sesión (fallback).
- `lib/sii-cert-auth.mjs` — **auth por certificado**: getToken(rut) (seed→firma→token), token cacheado.
- `lib/sii-servicios.mjs` — `descargarRCV` y `listarDTE` usando cookie TOKEN; guardan JSON+CSV.
- `descargar-todo.mjs` — **orquestador por certificado**: token 1 vez + barrido de N períodos.
- `probar-login.mjs`  — probe: verifica si las credenciales autentican (1 login).
- `descargar-rcv.mjs` — descargador RCV vía clave con guardarraíles (fallback).
- `explore-rcv.mjs` / `capturar-rcv.mjs` — artefactos de desarrollo (referencia del contrato).
- `package.json` — deps: node-forge, xml-crypto, @xmldom/xmldom.

## Pendiente
- DTE recibidos/emitidos y F29/F22 (mismos guardarraíles; extender una vez validado RCV).
- Servicio HTTP en :8080 (`com.nexus.sii`) que exponga la descarga al Hub/agente.
