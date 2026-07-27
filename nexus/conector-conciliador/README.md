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

## Estado actual — dos limitaciones de los datos de entrada

**1. No hay datos de VENTA.** `sii-web` solo ha descargado el RCV de compras
(períodos 202506, 202604, 202605, 202606, 202607 = 422 facturas). Sin ventas, todo
abono queda sin calzar: en el piloto son 14 de 39 movimientos sueltos. Bajarlas
requiere **una** sesión del SII, por la vía segura de `sii-web`
(`ensure_session()` reutiliza cookies y tiene circuit breaker de 30 min y tope de
3 intentos).

**2. La cartola del banco está truncada.** La captura de tek baja **una página por
mes, ~60 filas**, así que cada mes viene cortado a los primeros días:

| Mes | Movimientos | Cubre |
|-----|-------------|-------|
| 2026-01 | 60 | 01-02 → 01-07 |
| 2026-02 | 60 | 02-02 → 02-09 |
| 2026-06 | 60 | 06-01 → 06-08 |
| 2026-07 | 50 | 07-14 → 07-21 |

Falta del orden del 75% del año. Para conciliar en serio hay que **paginar la
cartola histórica** en `conector-tek/login-humano.mjs` (`cartolaHistorica`), lo
que sí requiere sesión de banco.

Mientras tanto, el conciliador es correcto dentro de los días que sí existen: por
eso marca "no concluible" en vez de inventar impagos.
