# Test Rápido — Verificar v2 funciona

## Setup

```bash
# Terminal 1: ver logs en tiempo real
tail -f ~/nexus/conector-navegador/diagnostico.log

# Terminal 2: ejecutar tests (abajo)
```

## Tests

### 1. Login + Navegar + Esperar (flujo completo)

```bash
# Login
curl -X POST http://127.0.0.1:8082/login \
  -H 'Content-Type: application/json' \
  -d '{"sitio":"aliace"}'
# Esperado: { "ok": true, "url": "...", "pestanas": [...] }

# Navegar
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/sales-notes"}'
# Esperado: { "ok": true, "url": "https://admin.aliace.cl/sales-notes", ... }

# Log debería mostrar:
# [timestamp] POST /ir: https://admin.aliace.cl/sales-notes
# [timestamp]   intento 1/3
# [timestamp]   ✓ navegado a https://admin.aliace.cl/sales-notes

# Esperar carga (NUEVO: modo automático)
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{"auto_detectar":true,"ms":40000}'
# Esperado: { "ok": true, "tiempo_ms": 2847 }

# Log debería mostrar:
# [timestamp] POST /esperar: aparece="" desaparece="" timeout=40000ms auto=true
# [timestamp]   modo automático: esperando carga completa...
# [timestamp]   esperarCargaCompleta: terminó (sin spinner, sin "Cargando", DOM quieto)
# [timestamp]   ✓ cargado en 2847ms

# Leer tabla
curl -X GET 'http://127.0.0.1:8082/tabla'
# Esperado: { "ok": true, "columnas": [...], "filas": [...], "n_filas": 42, ... }

# Log debería mostrar:
# [timestamp] GET /tabla: selector=""
# [timestamp]   ✓ tabla extraída: 42 filas, 8 columnas
```

### 2. Retry automático ante error transitorio

Simular DNS fallido y ver que reintenta automáticamente:

```bash
# Este test requiere que el DNS/red sea inestable por 1-2s
# O puedes hacerlo forzando:
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/sales-notes"}'

# Si ocurre error DNS, log debería mostrar:
# [timestamp]   intento 1/3
# [timestamp]   ✗ DNS_FAILED: No se pudo conectar...
# [timestamp]   → reparando DNS...
# [timestamp]   DNS reparado: accept-dns=false + dscacheutil -flushcache
# [timestamp]   → esperando 1500ms antes de reintentar...
# [timestamp]   intento 2/3
# [timestamp]   ✓ navegado a https://admin.aliace.cl/sales-notes
```

### 3. Error diferenciado: ruta incorrecta (404)

```bash
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/ruta-que-no-existe"}'

# Esperado:
# {
#   "ok": false,
#   "ruta_incorrecta": true,
#   "error": "Ruta no encontrada (404): https://admin.aliace.cl/ruta-que-no-existe no existe.",
#   "consejo": "Revisa la URL; puede estar mal escrita o la página fue eliminada.",
#   "diagnostico": "NOT_FOUND"
# }

# Log debería mostrar:
# [timestamp]   intento 1/3
# [timestamp]   ✗ NOT_FOUND: Ruta no encontrada (404)...
# [timestamp]   ✗ error permanente, no reintentar
```

### 4. Error diferenciado: sesión expirada

```bash
# (Si la sesión expiró)
curl -X GET 'http://127.0.0.1:8082/leer'

# Si devuelve redirect a login:
# {
#   "ok": false,
#   "sesion_expirada": true,
#   "error": "Sesión expirada o sin permiso: la página redirigió a login.",
#   "consejo": "Haz login de nuevo con POST /login {sitio}.",
#   "diagnostico": "SESSION_EXPIRED"
# }

# Solución:
curl -X POST http://127.0.0.1:8082/login \
  -H 'Content-Type: application/json' \
  -d '{"sitio":"aliace"}'
```

### 5. Timeout configurables

```bash
# Esperar con timeout personalizado (ej 30s en lugar de default 35s)
curl -X POST http://127.0.0.1:8082/esperar \
  -H 'Content-Type: application/json' \
  -d '{"aparece":"table tbody tr","ms":30000}'
# Esperado: { "ok": true } si aparece, o { "ok": false, "motivo": "..." } si timeout

# Navegar con timeout implícitamente más largo
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl/sales-notes"}'
# Timeout automático es 50s (no configurable vía body, pero es fijo)
```

### 6. Log diagnóstico

```bash
# Ver últimas 50 líneas
tail -50 ~/nexus/conector-navegador/diagnostico.log

# Ver en tiempo real mientras haces requests
tail -f ~/nexus/conector-navegador/diagnostico.log
```

---

## ✅ Checklist de éxito

Después de los tests, verifica:

- [ ] **Login funciona** — POST /login devuelve { ok: true }
- [ ] **Navegar funciona** — POST /ir devuelve { ok: true }
- [ ] **Esperar funciona** — POST /esperar devuelve { ok: true }
- [ ] **Leer tabla funciona** — GET /tabla devuelve columnas + filas
- [ ] **Error 404 diferenciado** — `diagnostico: "NOT_FOUND"`
- [ ] **Log creado** — archivo `diagnostico.log` existe y tiene entradas
- [ ] **Símbolos en log** — ✓ (éxito), ✗ (error), ⚠ (advertencia), → (acción)
- [ ] **Retry visible en log** — si hay fallo, se ven "intento 1/3", "intento 2/3", etc.

---

## 🐛 Debugging

### El log muestra errores, ¿qué hacer?

1. **DNS_FAILED** → normal, se auto-repara. Si persiste >2 intentos, revisa WiFi/Tailscale.
2. **TIMEOUT** → página tardó >50s. Revisa si el servidor está caído o la SPA es muy lenta.
3. **NOT_FOUND** → URL incorrecta. Revisa la ruta.
4. **SESSION_EXPIRED** → sesión expirada. Haz login de nuevo.
5. **BROWSER_ERROR** → navegador crasheó. Reinicia el servidor.

### Ver detalles de un error

```bash
# El log te dice exactamente qué pasó:
tail -100 ~/nexus/conector-navegador/diagnostico.log | grep -i "error\|timeout\|failed"
```

---

## 🚀 Fin del test

Si todo pasa ✓, la versión v2 está instalada correctamente y funcionando.

**Tiempo total:** ~2-3 minutos.

---

**Preguntas frecuentes:**

- **¿Vuelvo a v1?** → `cp server-original.js server.js` y reinicia.
- **¿El log crece demasiado?** → se escribe en tiempo real, verifica cada X horas y limpiar si es muy grande.
- **¿Timezones del log?** → UTC (ISO 8601 format), coincide con tu system time.
