# API del banco (tek) para el sistema de CONCILIACIÓN (SAI)

Movimientos y saldos REALES de **ANA CLARA SPA** en Santander, servidos desde disco
(cacheados, no cuelgan). Es **SOLO LECTURA**. La cartola cubre **enero 2026 → hoy** (el
acumulador `cartola-anual.json` nunca pierde lo viejo; la histórica se fusiona ahí).

## Conexión
| | |
|---|---|
| Base URL local | `http://127.0.0.1:7692` |
| Base URL Tailscale | `http://100.91.97.70:7692` |
| Auth | header `x-api-token: <TOKEN>`  (o `?token=<TOKEN>`) |
| Token | `3ac6668cdb7613b9acdd3bdba7245e76e634fb3615316b44` |
| Cuenta | ANA CLARA SPA · cta cte CLP `0-000-8028093-9` |

## Endpoints para conciliar

### 1) Movimientos de un rango  → para cruzar contra facturas/pagos
```
GET /movimientos?desde=2026-01-01&hasta=2026-03-31
```
Respuesta:
```json
{
  "actualizado": "2026-07-21T...",
  "desde": "2026-01-01", "hasta": "2026-03-31",
  "total": 120,
  "movimientos": [
    { "fecha": "2026-01-02", "descripcion": "0763075532 Transf. BK SPA",
      "cargo": 0, "abono": 7000000, "saldo": 106831376,
      "documento": "028000014", "sucursal": "Agustinas", "cuenta": "..." }
  ]
}
```
- `abono` = ingreso (entró plata). `cargo` = egreso (salió plata). Uno de los dos > 0.
- Filtros opcionales: `&q=texto` (busca en la descripción), `&cuenta=<nº>`.

### 2) Resumen del rango  → totales para cuadre rápido
```
GET /resumen?desde=2026-01-01&hasta=2026-03-31
```
```json
{ "ingresos": 473839874, "egresos": 511947034, "neto": -38107160, "n": 120 }
```

### 3) Saldos actuales
```
GET /saldos
```

### 4) Forzar actualización (si necesitás data fresca del día)
```
POST /refresh
```
> No hace falta llamarlo seguido: la data < 15 min se sirve del cache; sobre eso re-loguea solo bajo demanda.

## Cómo lo usa el SAI para conciliar
1. Toma el período a conciliar (ej. marzo).
2. `GET /movimientos?desde=2026-03-01&hasta=2026-03-31` → lista de movimientos del banco.
3. Cruza cada **abono** (ingreso) contra las **facturas emitidas / pagos esperados** (por monto + fecha + glosa/RUT en `descripcion`).
4. Cruza cada **cargo** (egreso) contra los **pagos a proveedores**.
5. Lo no cruzado = pendiente de conciliar.
- Para el total del período, `GET /resumen` da ingresos/egresos/neto directo.

## Ejemplo (curl)
```bash
TOK=3ac6668cdb7613b9acdd3bdba7245e76e634fb3615316b44
curl -s -H "x-api-token: $TOK" \
  "http://127.0.0.1:7692/movimientos?desde=2026-03-01&hasta=2026-03-31"
```

## Cartolas mensuales (PDF + resumen)
- PDFs oficiales por mes: `~/nexus/cerebro/70 — Base de datos/Cartolas ANA CLARA/PDF/`
- Resumen por mes (cargos/abonos/saldo inicial/final): `~/nexus/conector-tek/data/carthist-resumen.json`
- Notas legibles por mes en el segundo cerebro: `70 — Base de datos/Cartolas ANA CLARA/`
