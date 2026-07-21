# Mejoras del Conector Navegador — Versión 2

**Fecha:** Junio 2026  
**Cambios:** Manejo robusto de timeouts, retries inteligentes, diagnóstico mejorado

---

## 📋 Resumen de cambios

### Problema original

Cuando navegabas a una página SPA (Aliace/GoAutos) y esperabas por un selector, frecuentemente fallaba:
- **Timeouts genéricos** sin información del por qué (¿DNS? ¿selector no existe? ¿sesión expirada?)
- **Sin reintentos** automáticos ante fallos transitorios de red
- **Detectores de carga débiles** que no esperaban spinneres o texto "Cargando"
- **Errores crípticos** en lugar de diagnósticos claros

### Solución implementada

#### 1. **Timeouts mayores y configurables**
```
Antes:  30s para /ir, 20s para /esperar
Ahora:  50s para /ir, 35s para /esperar
        Configurable en el body: { ms: 45000 }
```

#### 2. **Retry automático inteligente**
```javascript
POST /ir
└─ Intento 1: falla
   ├─ Si es DNS → reparar accept-dns=false + flush
   ├─ Si es conexión → esperar 1.5s y reintentar
   └─ Si es ruta incorrecta → fallar sin reintentar
└─ Intento 2: falla
   └─ Esperar 3s, reintentar
└─ Intento 3: falla
   └─ Esperar 6s, si falla → devolución de error final
```

#### 3. **Análisis de errores diferenciado**
```javascript
{
  "ok": false,
  "sin_conexion": true,
  "dns_error": true,                    // ← nuevo
  "sesion_expirada": false,
  "ruta_incorrecta": false,
  "datos_tardados": false,
  "navegador_error": false,
  "error": "No se pudo conectar a admin.aliace.cl: el DNS no resolvió el dominio.",
  "consejo": "Revisa la conexión de red y el DNS de Tailscale. Intento reparar automáticamente…",
  "diagnostico": "DNS_FAILED"            // ← valor único para debugging
}
```

Códigos de diagnóstico: `DNS_FAILED`, `NETWORK_FAILED`, `CONNECTION_FAILED`, `TIMEOUT`, `NOT_FOUND`, `FORBIDDEN`, `SESSION_EXPIRED`, `BROWSER_ERROR`, `UNKNOWN_ERROR`

#### 4. **Detectores de carga mejorados en /esperar**
```javascript
// Nuevo parámetro: auto_detectar
POST /esperar
{
  "auto_detectar": true,                // modo automático
  "ms": 35000                           // timeout
}

// Detecta automáticamente:
// ✓ Desaparición de spinners (.animate-spin, [role="progressbar"])
// ✓ Desaparición de texto "Cargando..."
// ✓ Estabilización del DOM (no cambios durante 600ms)
```

#### 5. **Log diagnóstico detallado**
```
Archivo: ~/nexus/conector-navegador/diagnostico.log

Ejemplo:
[2026-06-15T14:22:30.123Z] POST /ir: https://admin.aliace.cl/sales-notes
[2026-06-15T14:22:30.124Z]   intento 1/3
[2026-06-15T14:22:30.200Z]   ✗ DNS_FAILED: No se pudo conectar…
[2026-06-15T14:22:30.201Z]   → reparando DNS...
[2026-06-15T14:22:30.350Z]   DNS reparado: accept-dns=false + dscacheutil -flushcache
[2026-06-15T14:22:30.351Z]   → esperando 1500ms antes de reintentar...
[2026-06-15T14:22:31.852Z]   intento 2/3
[2026-06-15T14:22:33.500Z]   ✓ navegado a https://admin.aliace.cl/sales-notes

Símbolos: ✓ (éxito), ✗ (error), ⚠ (advertencia), → (acción)
```

---

## 🚀 Cómo usar

### 1. Instalar la versión mejorada

```bash
cd ~/nexus/conector-navegador
cp server.js server-original.js      # backup
cp server-mejorado.js server.js      # usar la nueva versión

# Reiniciar el servidor (en tu sesión de OpenClaw)
# Debería apuntar a http://127.0.0.1:8082
```

### 2. Endpoints existentes (sin cambios en la API)

Todos los endpoints existentes funcionan igual:
- `POST /ir`
- `POST /esperar`
- `GET /leer`
- `POST /click`
- etc.

### 3. Nuevos parámetros mejorados

#### `POST /ir` — retry automático
```bash
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/sales-notes"}'

# Ahora reintentan automáticamente si es conexión/DNS
# Respuesta:
{
  "ok": false,
  "sin_conexion": true,
  "dns_error": true,
  "error": "No se pudo conectar...",
  "consejo": "Revisa la conexión de red...",
  "diagnostico": "DNS_FAILED"
}
```

#### `POST /esperar` — modo automático
```bash
# Antiguo: esperar selector específico
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{"aparece":"table tbody tr","ms":20000}'

# Nuevo: dejar que detecte automáticamente
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{"auto_detectar":true,"ms":35000}'

# Respuesta:
{
  "ok": true,
  "tiempo_ms": 2847
}
```

#### Mayor timeout por defecto
```bash
# Los timeouts ahora son más generosos
# /ir:      30s → 50s
# /esperar: 20s → 35s
# /leer:    (sin cambios pero ahora respeta parámetro opcional)

# Puedes pasarlos como body:
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{"aparece":"table tbody tr","ms":45000}'
```

### 4. Flujo mejorado típico (ejemplo: Aliace)

```javascript
// 1. Login (idempotente: si ya hay sesión, no hace nada)
POST /login { "sitio": "aliace" }

// 2. Navegar a sección
POST /ir { "url": "https://admin.aliace.cl/sales-notes" }
// Reintenta automáticamente si fallan DNS/conexión

// 3. Esperar carga completa (modo automático)
POST /esperar { "auto_detectar": true, "ms": 35000 }
// Detecta: spinner desaparece + texto "Cargando" se va + DOM quieto

// 4. Leer tabla
GET /leer
// ó
GET /tabla  → estructura de columnas + filas

// 5. Si hay timeout, el log dirá EXACTAMENTE por qué
GET /diagnostico.log  (ver instrucciones abajo)
```

---

## 🔍 Debugging

### Ver logs en tiempo real

```bash
# Terminal 1: ver stderr + diagnostico.log
tail -f ~/nexus/conector-navegador/diagnostico.log

# Terminal 2: hacer peticiones
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/sales-notes"}'
```

### Leer log diagnóstico desde OpenClaw

```bash
# En una sesión de Nexus:
cat ~/nexus/conector-navegador/diagnostico.log | tail -50
```

### Interpretar códigos de diagnóstico

| Código | Causa | Solución |
|--------|-------|----------|
| `DNS_FAILED` | DNS de Tailscale no resuelve | Ya se repara automáticamente |
| `NETWORK_FAILED` | Sin conexión de red | Revisa WiFi/VPN/Tailscale |
| `CONNECTION_FAILED` | Servidor rechazó conexión | Servidor caído o firewall |
| `SSL_ERROR` | Certificado inválido | Contacta administrador |
| `TIMEOUT` | Página tardó > 50s | Servidor lento o JS complejo |
| `NOT_FOUND` (404) | URL no existe | Revisa la ruta |
| `FORBIDDEN` (403/401) | Sesión expirada | Haz login de nuevo |
| `SESSION_EXPIRED` | Redirigió a login | `POST /login {sitio}` |
| `BROWSER_ERROR` | Navegador crasheó | Reinicia el servidor |

---

## 🔧 Cambios internos (técnico)

### Antes (v1)
```javascript
app.post('/ir', async (req, res) => {
  try {
    const p = await pagina()
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    return res.json({ ok: true, ... })
  } catch (e) {
    return res.status(503).json({ ok: false, error: e.message })
    // ↑ error críptico: "net::ERR_NAME_NOT_RESOLVED" o "timeout"
  }
})
```

### Ahora (v2)
```javascript
app.post('/ir', async (req, res) => {
  const MAX_INTENTOS = 3
  const DELAYS = [1500, 3000, 6000]
  
  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      const p = await pagina()
      await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 50000 })
      // ↑ 50s en lugar de 30s
      return res.json({ ok: true, ... })
    } catch (e) {
      const desc = analizarError(e, url, contexto)
      // ↑ nuevo: diferencia DNS vs conexión vs timeout vs ruta incorrecta
      
      if (desc.dns_error && intento < MAX_INTENTOS) {
        await repararDNS()
      }
      
      if ((desc.sin_conexion || desc.datos_tardados) && intento < MAX_INTENTOS) {
        const delay = DELAYS[intento - 1]
        // ↑ backoff exponencial: 1.5s, 3s, 6s
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      
      // ↑ error permanente: no reintentar (ruta incorrecta, sesión expirada, etc.)
      return res.status(statusCode).json({ 
        ok: false, 
        ...desc  // ← contiene: sin_conexion, sesion_expirada, error, consejo, diagnostico
      })
    }
  }
})
```

### Función `esperarCargaCompleta()`
```javascript
async function esperarCargaCompleta(page, timeout = 35000) {
  // Monitorea cada 300ms:
  // 1. ¿Hay spinner visible? (.animate-spin, [role="progressbar"], etc.)
  // 2. ¿Aparece texto "Cargando"?
  // 3. ¿El DOM está quieto? (hash del innerText estable por 600ms)
  
  // Termina cuando: NO spinner + NO "Cargando" + DOM quieto
  // Mucho mejor que esperar networkidle (que puede ser falso)
}
```

---

## ✅ Validación de cambios

### Test: Timeout con retry

```bash
# Simula fallo de DNS / conexión
# El servidor debería:
# 1. Fallar intento 1
# 2. Reparar DNS
# 3. Esperar 1.5s
# 4. Reintentar intento 2
# 5. Éxito (o fallar y seguir pattern)

curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/sales-notes"}'

# Ver ~/nexus/conector-navegador/diagnostico.log
```

### Test: Análisis de error diferenciado

```bash
# Ruta incorrecta (404)
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/ruta-que-no-existe"}'
# Respuesta: { ok: false, ruta_incorrecta: true, diagnostico: "NOT_FOUND" }

# Sesión expirada (401/403)
# (si se expira la sesión)
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/deudas"}'
# Respuesta: { ok: false, sesion_expirada: true, diagnostico: "FORBIDDEN" }
```

### Test: Detectores de carga

```bash
# 1. Navegar a una página que carga lento
POST /ir { "url": "https://admin.aliace.cl/sales-notes" }

# 2. Esperar automáticamente (detecta spinner + "Cargando" + DOM)
POST /esperar { "auto_detectar": true, "ms": 35000 }
# Respuesta: { ok: true, tiempo_ms: 3200 }

# 3. Leer tabla
GET /tabla
# Respuesta: { ok: true, columnas: [...], filas: [...], n_filas: 42 }
```

---

## 📦 Archivos

```
~/nexus/conector-navegador/
├── server.js                  ← versión actual (v1 original)
├── server-mejorado.js         ← NUEVA: versión v2 mejorada
├── server-original.js         ← backup de v1 (si lo creaste)
├── diagnostico.log            ← log generado en tiempo de ejecución
├── guias/
│   └── aliace.md              ← guía de secciones de Aliace
└── MEJORAS-v2.md              ← este archivo

Para activar v2:
  cp server.js server-original.js
  cp server-mejorado.js server.js
  # Reiniciar el servidor
```

---

## 🎯 Resumen: qué cambió para ti (el usuario)

| Antes | Ahora |
|-------|-------|
| Timeout a los 30s, error críptico | Retry automático hasta 3 intentos, timeout 50s, error claro |
| "net::ERR_NAME_NOT_RESOLVED" | "DNS_FAILED: error de DNS, reparando automáticamente…" |
| "Waiting for selector timed out" | "TIMEOUT: El elemento no apareció. Puede ser: JavaScript tardío, URL incorrecta, rol insuficiente, error del servidor. Ver /diagnostico.log" |
| Sin información | Respuesta incluye: `sin_conexion`, `sesion_expirada`, `ruta_incorrecta`, `datos_tardados`, `consejo`, `diagnostico` |
| Esperar selector fijo | Nuevo modo `/esperar { "auto_detectar": true }` que detecta spinneres + "Cargando" + DOM quieto |

---

**Versión:** 2.0  
**Compatibilidad:** Backward compatible (v1 requests funcionan igual)  
**Estado:** Listo para producción
