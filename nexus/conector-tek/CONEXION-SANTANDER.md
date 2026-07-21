# Conexión a Santander (tek) — ANA CLARA SPA

API HTTP de **solo lectura** sobre Santander Office Banking. Sirve saldos y
movimientos reales (cacheados en disco, no cuelga). El re-login al banco es
**bajo demanda**: en reposo no toca el banco; solo se re-loguea cuando le pides
data vencida.

## 1. Datos de conexión
| Campo        | Valor                                                  |
|--------------|--------------------------------------------------------|
| Base URL local | `http://127.0.0.1:7692`                              |
| Base URL Tailscale | `http://100.91.97.70:7692`                       |
| Auth         | header `x-api-token: <TOKEN>`  ó  `?token=<TOKEN>`      |
| **Token**    | `3ac6668cdb7613b9acdd3bdba7245e76e634fb3615316b44`     |
| Servicio     | `com.nexus.tek-api` (LaunchAgent, KeepAlive)           |
| Empresa      | ANA CLARA SPA · cta cte CLP 000080280939 · Santander   |

## 2. Endpoints

### GET /health  (sin token)
Estado y frescura de la data.
```
curl http://127.0.0.1:7692/health
```

### GET /saldos
Saldos por cuenta (último snapshot).
```
curl -H "x-api-token: 3ac6668cdb7613b9acdd3bdba7245e76e634fb3615316b44" \
  http://127.0.0.1:7692/saldos
```

### GET /movimientos?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&cuenta=&q=
Movimientos filtrados por fecha / cuenta / texto.
```
curl -H "x-api-token: 3ac6668cdb7613b9acdd3bdba7245e76e634fb3615316b44" \
  "http://127.0.0.1:7692/movimientos?desde=2026-01-01&hasta=2026-07-21"
```

### GET /resumen?desde=&hasta=
Totales del rango: ingresos, egresos, neto.

### POST /refresh
Fuerza actualización (login humano + captura si la sesión venció).
```
curl -X POST -H "x-api-token: 3ac6668cdb7613b9acdd3bdba7245e76e634fb3615316b44" \
  http://127.0.0.1:7692/refresh
```

## 3. Reglas de re-login (anti-bloqueo)
1. En reposo con token vencido → NO se re-loguea.
2. Se pide data y el token venció → login para token nuevo.
3. Se reutiliza la sesión guardada mientras siga viva.
4. Frescura: data < 15 min se sirve del cache sin tocar el banco.
5. Todo imita a un humano (mouse real, tecleo natural) para no ser detectado.

## 4. Seguridad
- **Solo lectura.** NO transfiere ni firma nada.
- Bind local + Tailscale; token obligatorio salvo `/health`.
- El cuello es el login con Superclave (asistido por VNC); la sesión expira rápido.
