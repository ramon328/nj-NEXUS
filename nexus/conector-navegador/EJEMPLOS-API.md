# Ejemplos de API — Antes vs Después

## Resumen rápido

| Endpoint | Cambio | Ejemplo |
|----------|--------|---------|
| `POST /ir` | Retry automático + mejor error | mismo request, ahora reintenta |
| `POST /esperar` | Nuevo parámetro `auto_detectar` | más fácil de usar |
| `GET /leer` | Devuelve `caracteres` count | compatible |
| `GET /tabla` | Log automático | compatible |
| Todos | Log en `diagnostico.log` | nuevo |

---

## 1. POST /ir — Navegar

### V1 (Antes)

```bash
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/sales-notes"}'
```

**Respuesta OK:**
```json
{
  "ok": true,
  "url": "https://admin.aliace.cl/sales-notes",
  "titulo": "Notas de Venta",
  "pestanas": [
    {
      "i": 0,
      "url": "https://admin.aliace.cl/sales-notes",
      "titulo": "Notas de Venta",
      "activa": true
    }
  ]
}
```

**Respuesta ERROR (30s timeout):**
```json
{
  "ok": false,
  "error": "net::ERR_TIMEOUT"
}
```
❌ No sé por qué falló. ¿Reintento? Tengo que hacerlo yo.

### V2 (Ahora)

**Mismo request:**
```bash
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/sales-notes"}'
```

**Respuesta OK (igual que v1):**
```json
{
  "ok": true,
  "url": "https://admin.aliace.cl/sales-notes",
  "titulo": "Notas de Venta",
  "pestanas": [...]
}
```

**Respuesta ERROR (ahora con diagnóstico):**
```json
{
  "ok": false,
  "sin_conexion": true,
  "dns_error": true,
  "sesion_expirada": false,
  "ruta_incorrecta": false,
  "datos_tardados": false,
  "navegador_error": false,
  "error": "No se pudo conectar a admin.aliace.cl: el DNS no resolvió el dominio.",
  "consejo": "Revisa la conexión de red y el DNS de Tailscale. Intento reparar automáticamente…",
  "contexto": "navegación a https://admin.aliace.cl/sales-notes",
  "diagnostico": "DNS_FAILED"
}
```

✅ Sé exactamente qué pasó (DNS). Reintentos automáticos detrás (a veces, sin que lo pida).

**Tipos de error diferenciados:**

Mismo endpoint, pero ahora devuelve:

```bash
# Error 1: DNS fallido
{ "sin_conexion": true, "dns_error": true, "diagnostico": "DNS_FAILED" }

# Error 2: Conexión caída
{ "sin_conexion": true, "diagnostico": "CONNECTION_FAILED" }

# Error 3: URL no existe
{ "ruta_incorrecta": true, "diagnostico": "NOT_FOUND", "status": 400 }

# Error 4: Sesión expirada
{ "sesion_expirada": true, "diagnostico": "FORBIDDEN", "status": 401 }

# Error 5: Timeout por SPA lenta
{ "datos_tardados": true, "diagnostico": "TIMEOUT" }

# Error 6: Navegador crasheó
{ "navegador_error": true, "diagnostico": "BROWSER_ERROR" }
```

---

## 2. POST /esperar — Esperar carga

### V1 (Antes)

**Opción 1: Esperar selector**
```bash
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{
    "aparece": "table tbody tr",
    "ms": 20000
  }'
```

**Respuesta OK:**
```json
{ "ok": true }
```

**Respuesta ERROR (timeout esperando):**
```json
{ "ok": false, "motivo": "timeout esperando que aparezca: table tbody tr" }
```

**Opción 2: Esperar que desaparezca texto**
```bash
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{
    "desaparece": "Cargando",
    "ms": 20000
  }'
```

**Respuesta OK:**
```json
{ "ok": true }
```

### V2 (Ahora)

**Opción 1: Como antes (100% compatible)**
```bash
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{
    "aparece": "table tbody tr",
    "ms": 20000
  }'
```

**Respuesta OK (igual):**
```json
{ "ok": true }
```

**Opción 2: NUEVO — Modo automático (MEJOR)**
```bash
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{
    "auto_detectar": true,
    "ms": 35000
  }'
```

**Respuesta OK:**
```json
{
  "ok": true,
  "tiempo_ms": 2847
}
```

**Ventajas del modo automático:**
- Detecta spinner (`.animate-spin`, `[role="progressbar"]`, etc.)
- Detecta texto "Cargando"
- Detecta DOM quieto (sin cambios por 600ms)
- Termina cuando TODAS 3 condiciones son true
- ✅ Tabla está realmente lista, no parcial
- ✅ 2-4s típicamente (más rápido que esperar 20s)

**Comparación:**
```
V1: POST /esperar { "aparece": "table tbody tr", "ms": 20000 }
    → Espera 20s a que aparezca fila
    → Pero tabla puede estar medio cargada
    
V2: POST /esperar { "auto_detectar": true, "ms": 35000 }
    → Detecta spinner + "Cargando" + DOM quieto
    → Tabla REALMENTE lista
    → Típicamente 2-4s (85% más rápido)
```

---

## 3. GET /leer — Leer página

### V1 (Antes)

```bash
curl -X GET 'http://127.0.0.1:8082/leer?espera_selector=table%20tbody%20tr'
```

**Respuesta:**
```json
{
  "ok": true,
  "url": "https://admin.aliace.cl/sales-notes",
  "texto": "Nota 1 | Enviado | $100... [8000 chars truncado]"
}
```

### V2 (Ahora)

**Mismo request:**
```bash
curl -X GET 'http://127.0.0.1:8082/leer?espera_selector=table%20tbody%20tr'
```

**Respuesta mejorada:**
```json
{
  "ok": true,
  "url": "https://admin.aliace.cl/sales-notes",
  "texto": "Nota 1 | Enviado | $100... [8000 chars truncado]",
  "caracteres": 7832
}
```

✅ Nuevo campo `caracteres` te dice cuánto texto hay.

---

## 4. GET /tabla — Extraer tabla

### V1 (Antes)

```bash
curl -X GET 'http://127.0.0.1:8082/tabla'
```

**Respuesta OK:**
```json
{
  "ok": true,
  "columnas": [
    "Nota",
    "Estado",
    "Pago",
    "Factura",
    "Cliente",
    "Monto",
    "Vencimiento",
    "Acciones"
  ],
  "filas": [
    ["Note-001", "Enviado", "Pendiente", "Fact-001", "Cliente A", "$1,000", "2026-06-30", "Ver"],
    ["Note-002", "Enviado", "Pagado", "Fact-002", "Cliente B", "$500", "2026-07-15", "Ver"],
    ...
  ],
  "n_filas": 42,
  "total_filas": 42,
  "truncado": false,
  "url": "https://admin.aliace.cl/sales-notes"
}
```

### V2 (Ahora)

**Mismo request (totalmente compatible):**
```bash
curl -X GET 'http://127.0.0.1:8082/tabla'
```

**Respuesta (igual + log automático):**
```json
{
  "ok": true,
  "columnas": [...],
  "filas": [...],
  "n_filas": 42,
  "total_filas": 42,
  "truncado": false,
  "url": "https://admin.aliace.cl/sales-notes"
}
```

✅ Ahora el log muestra automáticamente:
```
[timestamp] GET /tabla: selector=""
[timestamp]   ✓ tabla extraída: 42 filas, 8 columnas
```

---

## 5. POST /click — Click en botón

### V1 y V2 (sin cambios)

```bash
curl -X POST http://127.0.0.1:8082/click \
  -H 'Content-Type: application/json' \
  -d '{
    "texto": "Enviar factura",
    "aprobado": true
  }'
```

**Respuesta:**
```json
{
  "ok": true,
  "url": "https://admin.aliace.cl/sales-notes",
  "titulo": "Notas de Venta",
  "pestanas": [...]
}
```

---

## 6. POST /login — Login

### V1 (Antes)

```bash
curl -X POST http://127.0.0.1:8082/login \
  -H 'Content-Type: application/json' \
  -d '{"sitio":"aliace"}'
```

**Respuesta OK:**
```json
{
  "ok": true,
  "url": "https://admin.aliace.cl/sales-notes",
  "titulo": "...",
  "pestanas": [...]
}
```

**Respuesta ERROR (credenciales incorrectas):**
```json
{ "ok": false, "error": "No se pudo iniciar sesión en \"aliace\"..." }
```

### V2 (Ahora)

**Mismo request:**
```bash
curl -X POST http://127.0.0.1:8082/login \
  -H 'Content-Type: application/json' \
  -d '{"sitio":"aliace"}'
```

**Respuesta OK (igual):**
```json
{
  "ok": true,
  "url": "https://admin.aliace.cl/sales-notes",
  "titulo": "...",
  "pestanas": [...]
}
```

✅ Ahora el log muestra:
```
[timestamp] LOGIN[aliace]: iniciando en https://admin.aliace.cl/login
[timestamp]   ya había sesión, redirigido a https://admin.aliace.cl/sales-notes
[timestamp] LOGIN[aliace]: éxito - ahora en https://admin.aliace.cl/sales-notes
```

---

## Flujo completo: Antes vs Después

### V1 (Antes) — Aliace

```bash
# 1. Login
POST /login { "sitio": "aliace" }
# → OK

# 2. Navegar (tarda 45s)
POST /ir { "url": "https://admin.aliace.cl/sales-notes" }
# → TIMEOUT después de 30s (😞)
# ❌ Tengo que reintentar manualmente

POST /ir { "url": "https://admin.aliace.cl/sales-notes" }
# → OK (esta vez tardó 32s, entró en el timeout)

# 3. Esperar tabla
POST /esperar { "aparece": "table tbody tr" }
# → OK (pero tabla está medio cargada)

# 4. Leer tabla
GET /tabla
# → Devuelve 15 filas de 42 (incompleta)
# ❌ Tengo que reintentar /esperar + GET /tabla
```

### V2 (Ahora) — Aliace

```bash
# 1. Login
POST /login { "sitio": "aliace" }
# → OK
# [log] LOGIN[aliace]: éxito

# 2. Navegar (tarda 45s, reintentos automáticos)
POST /ir { "url": "https://admin.aliace.cl/sales-notes" }
# → OK (en 3-5s si necesitó reintentos)
# [log] intento 1/3 → si falla DNS, repara y reintenta → OK
# ✅ Automático, sin que tengas que pedir

# 3. Esperar carga AUTOMÁTICA (NUEVO)
POST /esperar { "auto_detectar": true, "ms": 35000 }
# → OK en 2.8s
# [log] detectó spinner + "Cargando" + DOM quieto
# ✅ Tabla REALMENTE lista, no parcial

# 4. Leer tabla
GET /tabla
# → Devuelve 42 filas de 42 (COMPLETA)
# ✅ Primera vez, no necesita reintentar
```

---

## HTTP Status Codes

### V1 & V2

```
2xx OK
  200 ✓ Operación exitosa

4xx Client Error
  400 ✗ Error de parámetros o lógica (URL incorrecta, ruta 404, timeout)
  401 ✗ Sesión expirada (403/401 HTTP)

5xx Server Error
  503 ✗ Sin conexión / servidor caído (se reintenta en v2)
  500 ✗ Error del navegador (crash, permisos)
```

**Cambio en v2:** Ahora los 503 se reintentan automáticamente (backoff exponencial).

---

## Summary for API consumers

✅ **V2 es 100% backward compatible**
- Todos tus requests v1 funcionan igual
- Devuelve más información en errores (no rompe parsing si solo lees `ok`)
- Nuevo parámetro `/esperar { "auto_detectar": true }` (opcional, mejor)
- Log automático en `diagnostico.log` para debugging

✅ **Mejoras tangibles**
- Retry automático ante fallos transitorios (DNS, conexión)
- Timeouts mayores (30s → 50s)
- Errores específicos (no solo "error")
- Detectores de carga más inteligentes

✅ **Recomendación**
- Actualiza a v2, es mejor en todos lados
- Prueba el nuevo `/esperar { "auto_detectar": true }`
- Consulta `diagnostico.log` si algo falla

---

**Versión:** 2.0  
**Compatibilidad:** 100% backward compatible
**Recomendación:** Usa v2, es estable y mejor
