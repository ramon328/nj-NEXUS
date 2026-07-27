# Conector CONCILIADOR

Cruza las facturas del SII (RCV) con los movimientos del banco para saber qué
factura corresponde a qué pago.

- **Compras** se pagan → calzan contra **cargos** (egresos).
- **Ventas** se cobran → calzan contra **abonos** (ingresos).

## Solo lectura, y sin tocar el banco ni el SII

El conciliador **no llama a ninguna API remota**. Lee los archivos que los otros
conectores ya dejaron cacheados:

| Dato | Origen |
|------|--------|
| Movimientos | `conector-tek/data/cartola-anual.json` |
| Facturas | `sii-web/data/empresas/<id>/<compra\|venta>/<periodo>/detalle.csv` |

Esto es deliberado. Pedirle `/movimientos` a la tek-api dispara `asegurarFresco()`,
que relanza el login al banco si la data venció; y el SII bloquea cuentas por
logins repetidos. Conciliar es una operación de escritorio: no justifica gastar
un login en ninguno de los dos.

## Uso

```bash
node conciliar.mjs --desde 2026-06-01 --hasta 2026-06-08     # ventana concreta
node conciliar.mjs --limite 50                                # piloto: 50 movimientos
node conciliar.mjs --json > salida.json                       # para otro programa
node conciliar.mjs --empresa 3                                # id en sii-web/app.db
```

## Cómo decide que dos cosas calzan

Hay tres señales, y **el monto es obligatoria**:

1. **Monto** — exacto, o dentro de la menor entre 0,5% y $2.000 (redondeos y
   comisiones). Sin esto no hay calce, punto.
2. **Quién** — el RUT de la contraparte, que el Santander escribe al inicio de la
   glosa cero-rellenado (`0763075532 Transf a ...`), validado por dígito
   verificador para no confundirlo con un folio. Si no hay RUT, se busca una
   palabra distintiva de la razón social (`COPEC` en `Compra Nacional NP COPEC
   APP EMPRE`), como palabra completa.
3. **Cuándo** — el pago debe caer entre 10 días antes y 90 días después de la
   emisión. Solo desempata entre candidatos.

Confianza resultante:

| | Condición |
|---|---|
| **alta** | coincide quién **y** el monto es exacto |
| **media** | coincide quién y el monto está dentro de tolerancia; o monto exacto y es el único candidato posible |
| **baja** | monto exacto pero varias facturas podrían ser |

La asignación es 1:1 y golosa por puntaje: una factura no se paga dos veces y un
movimiento no salda dos facturas. Después hay una segunda pasada para **pagos
agrupados** (un cargo que salda 2 o 3 facturas del mismo proveedor), que es
frecuente y sin ella todas esas facturas quedarían como impagas.

### Por qué el monto no es negociable

La primera versión aceptaba calzar solo por RUT o nombre. Produjo cosas como una
cuota de crédito del Itaú de $4,8 millones calzada contra una factura del Itaú de
$24 mil, y "Porsche **Inter** Auto" calzado contra "Traspaso **Inter**net a T.
Crédito". De ahí las dos reglas actuales: el monto siempre manda, y el nombre se
compara como palabra completa.

## Lo que el informe distingue (y por qué importa)

Un conciliador ingenuo diría "195 facturas impagas" y sería mentira. Este separa:

- **Facturas impagas** — su plazo de pago cae en días que la cartola **sí** cubre,
  y aun así no hay cargo. Estas son reales.
- **No concluible** — menos del 30% de su plazo de pago está cubierto por la
  cartola. No se puede afirmar nada.
- **Movimientos sin factura**, clasificados por motivo: traspaso interno,
  crédito/financiero, impuestos, remuneraciones, cobro a cliente, o **por
  revisar**. Solo los últimos son un descuadre de verdad.

## Estado actual

**Compras: completas para 2026.** Se bajaron por la vía normal de `sii-web`
(`POST /api/empresas/3/descargar`), que hace **un solo login** para todo el job y
reutiliza la sesión guardada. Períodos 202601–202607 más 202506: **708 facturas**.

**Ventas: no existen.** No es que falten por descargar — se consultó el RCV mes a
mes el 27-jul-2026 y **ANA CLARA SPA tiene 0 facturas de venta en todo 2026**:

| Periodo | Compras | Ventas |
|---------|---------|--------|
| 202601 | 112 docs · $78.736.755 | **0** |
| 202602 | 95 docs · $281.235.095 | **0** |
| 202603 | 110 docs · $492.026.923 | **0** |
| 202604 | 82 docs · $234.217.899 | **0** |
| 202605 | 104 docs · $86.984.192 | **0** |
| 202606 | 108 docs · $279.266.265 | **0** |
| 202607 | 97 docs · $99.759.791 | **0** |

Por eso los abonos del banco ("Transf de ACE SPA", "Transf de EUN LEE") no calzan
contra nada: **no son cobros a clientes**, son aportes de otras empresas del
grupo. Esta empresa recibe plata y paga gastos; no factura. Si se quiere conciliar
ingresos hay que apuntar al RUT que sí emite las ventas — hoy `sii-web` solo tiene
configurada a ANA CLARA (`empresa_id 3`).

**La cartola del banco sigue truncada.** La captura de tek trae ~60 filas por mes,
así que cada mes viene cortado a los primeros días:

| Mes | Movimientos | Cubre |
|-----|-------------|-------|
| 2026-01 | 60 | 01-02 → 01-07 |
| 2026-02 | 60 | 02-02 → 02-09 |
| 2026-06 | 60 | 06-01 → 06-08 |
| 2026-07 | 50 | 07-14 → 07-21 |

Falta del orden del 75% del año. La captura vive en
`conector-tek/login-humano.mjs` → `cartolaHistorica`, bajo `TEK_CARTOLA_MOVS=1`:
hace scroll infinito hasta que no aparecen filas nuevas, y se está deteniendo en
~60. Arreglarlo requiere iterar contra la UI del banco con sesión viva.

Mientras tanto, el conciliador es correcto dentro de los días que sí existen: por
eso marca "no concluible" en vez de inventar impagos.

## Resultado sobre los datos actuales

410 movimientos (2026-01-02 → 2026-07-21) contra 668 facturas en ventana:

- **69 conciliados** — 53 alta, 14 media, 2 baja
- **0 facturas impagas** dentro de los días que la cartola cubre
- 535 no concluibles (su pago cae en días que el banco no bajó)
- 341 movimientos sin factura, de los cuales 133 son cobros/aportes (sin venta
  que cruzar), 61 traspasos internos, 14 crédito/impuestos/sueldos, y 133 por
  revisar
