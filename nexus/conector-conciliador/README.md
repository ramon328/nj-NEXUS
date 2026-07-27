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

## La corrida de cada mañana

El banco solo entrega con comodidad su ventana reciente (~50 movimientos). En vez
de pelear con el histórico, **el libro crece día a día**: cada mañana se guarda la
tanda nueva, lo que ya estaba no se vuelve a contar, y corrida tras corrida el
libro converge al año completo.

```
06:48  com.nexus.tek-refresco   el banco se enciende y captura su tanda
       almacen.fusionar()       la mete en cartola-anual.json sin duplicar
07:30  com.nexus.conciliador    sincronizar.mjs lee, acumula y cruza
```

```bash
node sincronizar.mjs           # la corrida normal
node sincronizar.mjs --estado  # solo mirar el libro, sin escribir
node sincronizar.mjs --json    # para otro programa
node sincronizar.mjs --rehacer # descartar los calces y recalcular todo
node probar-libro.mjs          # comprobaciones del acumulador
```

El libro vive en `data/libro.json` y guarda los movimientos, las facturas, los
calces con su justificación, y una bitácora de qué trajo cada mañana. Se escribe
de forma atómica, así que un corte a mitad de corrida no lo deja a medias.

Tres propiedades que lo hacen seguro de correr:

- **Idempotente.** Correrlo dos veces seguidas no agrega nada la segunda.
- **Los calces no se recalculan.** Una vez hecho, un calce queda; el informe de
  ayer no cambia solo, y la corrida diaria es barata.
- **Nada se descarta.** Lo que quedó sin contraparte vuelve al pozo. Una factura
  de enero puede calzar con un pago que recién aparece en agosto, y un movimiento
  viejo sin factura puede calzar con una factura emitida después.

### Cómo se reconoce un movimiento entre capturas

Por `fecha | saldo | monto | glosa`, la misma clave que usa
`conector-tek/almacen.mjs`. La pieza importante es el **saldo corrido**: es único
por movimiento, y es lo único que distingue los cuatro cargos de $7.000.000 del
1 de junio, idénticos en día, monto y glosa. Un hash del contenido los colapsaría
en uno y perderíamos tres movimientos reales.

Las facturas se reconocen por `operación | RUT | folio | monto`. El "Nro" del CSV
es el orden de la fila y cambia si el SII reordena el periodo, así que no sirve.

## Consulta puntual

Para mirar una ventana sin tocar el libro:

```bash
node conciliar.mjs --desde 2026-06-01 --hasta 2026-06-08     # ventana concreta
node conciliar.mjs --limite 50                                # 50 movimientos
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

**Ventas: 154 facturas en 2026.** Al principio el RCV devolvía 0 ventas en todos
los meses. Era un bug de `sii-web`, no un dato real — ver abajo.

| Periodo | Compras | Ventas |
|---------|---------|--------|
| 202601 | 112 | 13 |
| 202602 | 95 | 20 |
| 202603 | 110 | 22 |
| 202604 | 82 | 20 |
| 202605 | 104 | 24 |
| 202606 | 108 | 21 |
| 202607 | 97 | 34 |

### El bug del RCV de ventas

`getResumen` necesita el campo `estadoContab` **también para VENTA**, y `rcv.py`
solo lo enviaba en COMPRA. Lo traicionero es cómo falla: el SII no devuelve error,
responde **HTTP 200 con `data: []` y `totDocRes: 0`**, indistinguible de "esta
empresa no vendió nada". El job leía 0 tipos de documento, anotaba "sin datos" y
seguía de largo. Llevaba así desde siempre.

Se detectó comparando contra el **F29 de mayo**, que es fuente independiente:
declara 13 facturas emitidas (código 503) y $23.614.007 de débito fiscal (código
502). Al agregar `estadoContab` al payload, el RCV del mismo periodo devuelve 24
documentos con IVA $23.614.007 — calce exacto con el formulario.

Detalle adicional: `getDetalleVentaExport` **sí** funcionaba, porque
`export_detalle` siempre mandaba el campo. O sea el detalle estaba disponible todo
el tiempo, pero nunca se pedía porque el resumen decía que no había nada.

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

410 movimientos (2026-01-02 → 2026-07-21) contra 816 facturas en ventana:

- **93 conciliados** — 70 alta, 21 media, 2 baja
  - 69 compras (pagos a proveedores)
  - 24 ventas (cobros de clientes: KARTEK, AUTOMOTORA FC, BK SPA, C Y M)
- **0 facturas impagas** dentro de los días que la cartola cubre
- 628 no concluibles (su pago cae en días que el banco no bajó)
- 317 movimientos sin factura: 59 traspasos internos, 14
  crédito/impuestos/sueldos, 111 cobros sin factura identificada y 133 por revisar
