# Ventas — Guía de Usuario

## Acceso
Menú lateral → **Ventas**

## ¿Cómo funciona una venta?

### Registrar una venta

1. Ve al **detalle de un vehículo**
2. Click en **"Vender"**
3. Completa los pasos (4 en total):
   - **Cliente** — Selecciona un cliente existente o crea uno nuevo (opcional)
   - **Venta** — Precio de venta, **fecha de la venta**, un toggle **"Venta financiada (crédito)"** y notas. Al activar el toggle se piden la **financiera** y la **comisión financiera** (que suma a la utilidad del auto). El vendedor se asigna automáticamente (el del vehículo o tu usuario), no hay que elegirlo. En **"Desglose de pagos y cuotas"** registrás lo que el cliente ya pagó (pie, abono, transferencia) **y/o las cuotas/letras a plazo** que quedan pendientes: marcá **"Es cuota / letra a plazo"** y poné el **vencimiento**. Las cuotas a plazo no se cuentan como pagadas y salen en la nota de venta en la sección **"Plan de Pago"** con su fecha de vencimiento y el saldo a pagar
   - **Permuta y extras** — Vehículo en parte de pago (opcional) y adicionales (ingresos que paga el cliente o gastos que absorbe la automotora). El antiguo "valor de transferencia" ahora se carga acá como un adicional
   - **Resumen** — Revisa y confirma

> La **comisión del vendedor** ya no se ingresa en este flujo: se asigna después desde el resumen financiero del vehículo ("Asignar comisión"), que permite dividirla entre varios vendedores.

### Fecha de la venta (registros antiguos)

Por defecto la fecha se setea en **hoy**, pero podés cambiarla para registrar ventas antiguas (por ejemplo cuando estás cargando al sistema ventas que tenés en una planilla Excel):

- En el paso **Venta**, el campo **Fecha de la venta** acepta cualquier fecha hasta hoy
- La fecha aplica a la **nota de venta**, a los **adicionales** y al **reporte mensual** — todo queda contado en el mes que corresponde
- Si **editás** una venta existente, también podés corregir la fecha. Si borrás la nota y la volvés a emitir, el formulario abre con la fecha original cargada
- No se aceptan fechas futuras (se bloquea el calendario en el día de hoy)

### Aprobación de ventas

- Si un **administrador** registra la venta → se aprueba automáticamente y el vehículo se marca como vendido
- Si un **vendedor** registra la venta → queda como **pendiente** hasta que un admin la revise

### Revisar ventas pendientes

1. En la página de **Ventas**, la pestaña por defecto muestra las ventas **pendientes**
2. Click en **"Revisar"** en la venta que quieras
3. Puedes:
   - **Aprobar** — La venta se confirma y el vehículo pasa a "Vendido"
   - **Rechazar** — La venta se cancela y el vehículo vuelve a estar disponible
   - Ajustar la **comisión** del vendedor antes de aprobar

### Estados de una venta

| Estado | Significado |
|--------|------------|
| Pendiente (amarillo) | Esperando aprobación del admin |
| Aprobada (verde) | Venta confirmada, vehículo vendido |
| Rechazada (rojo) | Venta cancelada |

### Devolver una venta aprobada a pendiente

Si te diste cuenta que **faltó algo** en una venta que ya aprobaste (la financiera, la comisión, un documento), no necesitás borrar la venta y crearla de nuevo. Podés reabrirla:

1. Andá a **Ventas** → pestaña **Aprobadas**
2. Abrí la venta que querés corregir
3. Click en **"Devolver a pendiente"** (botón rojo abajo a la izquierda)
4. (Opcional) Escribí el motivo — ej: *"faltó cargar la financiera"*
5. Confirmá

Lo que pasa automáticamente:

- La venta vuelve a la pestaña **Pendientes**
- El vehículo vuelve al estado **Publicado** (queda disponible)
- Quedan registrados quién la devolvió, cuándo, y el motivo (para auditoría)
- La comisión y los datos del vendedor **se mantienen**, no hay que reingresarlos

Después corregís lo que faltaba y aprobás de nuevo. El vehículo vuelve a "Vendido".

> **Nota:** la opción solo aparece para ventas aprobadas. Si querés revertir una venta rechazada, se gestiona desde el detalle del vehículo.

### Precio mínimo: cuándo te bloquea

Cada vehículo tiene un **precio mínimo** (lo definís al cargarlo o desde el detalle, en el lapicito de "Editar precios"). Es el piso por debajo del cual no querés vender.

Cuando intentás vender o cerrar negocio por debajo del precio mínimo:

1. El sistema **te frena** con un cartel rojo:
   *"Estás vendiendo bajo el precio mínimo. Diferencia: $X bajo el mínimo."*
2. Para continuar tenés que **escribir un motivo** (ej: "descuento autorizado por el jefe", "auto con mucho stock") en un campo obligatorio.
3. Recién ahí se habilita el botón **"Vender igual"** (o **"Cerrar igual"** en cierre).

El motivo queda registrado para auditoría. Si cancelás, no pasa nada y volvés al paso anterior para ajustar el precio.

> Si recién creás un vehículo, **el precio mínimo es obligatorio** desde el formulario. Para vehículos viejos sin precio mínimo cargado, lo agregás en el detalle (lapicito junto a los precios).

### Comisiones

- Las comisiones se calculan automáticamente según la configuración del vendedor
- Se pueden calcular sobre el **precio total** o sobre el **margen** (precio - costo)
- Se puede dividir la comisión entre varios vendedores

### Comisión del vendedor (post-venta)

La comisión **ya no se ingresa durante el flujo de venta**. Una vez registrada la venta, se asigna desde el **resumen financiero del vehículo** con el botón **"Asignar comisión"**, que permite:

- Asignar la comisión a uno o varios vendedores (split)
- Calcularla como **monto fijo**, **% sobre la venta** o **% sobre el margen**
- La comisión asignada **se descuenta del resultado neto** del vehículo

> **Solo administradores** (admin/superadmin) pueden configurar la comisión. Los vendedores ven el monto pero no lo editan (ni en el resumen ni en la aprobación de venta).

Cada movimiento de comisión queda registrado en la **línea de tiempo del vehículo** (con el vendedor y el monto), junto a la compra, gastos, cambios de estado y la venta. Además de la comisión vigente, la línea de tiempo muestra los **cambios** (cuando se edita el monto, con el valor anterior → nuevo) y las **bajas** (cuando se quita una comisión), para que quede el historial completo y no solo el estado actual.

En el **Dashboard del vendedor** (Mi rendimiento) se muestran dos métricas adicionales calculadas a partir de las ventas aprobadas:

- **IVA estimado retenido** — total de IVA pagado por las operaciones del vendedor
- **Comisión neta estimada (post-IVA)** — comisión total descontando el IVA del margen

## Integración con ChileAutos

Si tienes ChileAutos configurado con "sincronizar al vender", al aprobar una venta el vehículo se marca automáticamente como vendido en ChileAutos.
