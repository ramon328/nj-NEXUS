# Instalar Versión Mejorada del Navegador

## ⚡ 30 segundos

```bash
cd ~/nexus/conector-navegador
cp server.js server-original.js      # backup
cp server-mejorado.js server.js      # activar v2
# Reiniciar el servidor (OpenClaw)
```

## ✅ Verificar

```bash
# Terminal: ver logs en tiempo real
tail -f ~/nexus/conector-navegador/diagnostico.log

# Otra terminal: probar
curl -X POST http://127.0.0.1:8082/ir \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://admin.aliace.cl"}'
```

Deberías ver en el log:
```
[timestamp] POST /ir: https://admin.aliace.cl
[timestamp]   intento 1/3
[timestamp]   ✓ navegado a https://admin.aliace.cl/login
```

## 📝 Qué cambió

| Antes | Ahora |
|-------|-------|
| Timeout 30s | Timeout 50s, configurable |
| Sin reintentos | Retry automático (1.5s, 3s, 6s) |
| Error críptico | Error específico: DNS_FAILED, TIMEOUT, etc. |
| Esperar selector | Nuevo: modo automático (spinner + "Cargando" + DOM) |
| Sin logs | Log detallado en diagnostico.log |

## 🔙 Volver a v1

```bash
cd ~/nexus/conector-navegador
cp server-original.js server.js
# Reiniciar
```

## 📚 Documentación

- `MEJORAS-v2.md` — Guía completa de cambios
- `RESUMEN-TECNICO.md` — Detalles técnicos internos
- `guias/aliace.md` — Guía de secciones de Aliace

---

**¡Listo!** El navegador ahora es más robusto y rápido. 🚀
