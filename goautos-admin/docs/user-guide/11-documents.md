# Documentos — Guía de Usuario

## Acceso
Menú lateral → **Documentos**

## Tipos de Documentos

| Tipo | Cuándo se genera |
|------|-----------------|
| **Compraventa** | Al registrar una venta |
| **Compra** | Al registrar la compra de un vehículo |
| **Consignación** | Al recibir un vehículo en consignación |
| **Reserva** | Al reservar un vehículo |
| **Cotización** | Al cotizar un vehículo para un cliente |
| **Cierre de negocio** | Al cerrar formalmente un trato |

## Templates Personalizables

Cada tipo de documento tiene una plantilla que puedes personalizar:

1. Ve a **Documentos → Templates**
2. Selecciona el tipo de documento
3. Edita el contenido usando **variables dinámicas**:
   - `{cliente_nombre}` — Nombre del cliente
   - `{vehiculo_marca}` — Marca del vehículo
   - `{vehiculo_modelo}` — Modelo
   - `{precio_venta}` — Precio de venta
   - Y muchas más...

## Numeración Automática

Los documentos se numeran automáticamente de forma secuencial. El formato es configurable.

## Generar un Documento

Desde el **detalle de un vehículo**:
1. Ve a la pestaña **Documentos**
2. Click en **"Generar documento"**
3. Selecciona el tipo
4. Selecciona el cliente
5. Revisa y confirma

## Edición Inline del Documento

Al abrir un documento generado, puedes editar su contenido directamente sobre la vista del documento (sin usar el panel lateral):

1. Abre el documento desde el detalle del vehículo
2. Haz clic en el botón **"Editar documento"** en la barra superior
3. Se activa el **modo edición**: el documento se muestra como HTML editable
4. Haz clic en cualquier dato (nombre del cliente, RUT, precio, observaciones, etc.) para modificarlo inline
5. Los campos editados se resaltan en amarillo
6. Presiona **Enter** o haz clic fuera del campo para confirmar el cambio
7. Los cambios se aplican al PDF final al descargar o imprimir
8. Vuelve a hacer clic en **"Editando"** para salir del modo edición y ver el PDF actualizado

> **Nota:** Los cambios son temporales para esa sesión de edición. No modifican los datos originales del cliente o vehículo en la base de datos.

### Agregar campos y secciones

En el modo edición también puedes:

- **"+ Agregar campo"**: agrega una fila nueva dentro de una sección existente (por ejemplo "Vale Vista" o "Falta por pagar" en el Detalle de la Venta). En secciones financieras el valor se formatea como monto.
- **"+ Agregar sección"**: crea una sección completa nueva (con título propio) después de cualquier sección del documento, y le puedes agregar campos dentro.

Los campos y secciones agregados **sí aparecen en el PDF** al descargar o imprimir, y quedan guardados con el documento (si lo vuelves a abrir siguen ahí).

## Cierre de venta — Gastos e Ingresos adicionales

Al cerrar una venta, en el paso "Detalles del Cierre" puedes registrar dos tipos de movimientos:

- **Gastos Adicionales**: cargos como gestoría, traspaso, etc.
- **Ingresos Adicionales**: venta cruzada al comprador (accesorios, seguros, paquetes).

Para cada uno, **eliges quién lo paga** con un selector al lado del monto:

| Opción | Qué hace |
|---|---|
| **"Cliente final"** | El comprador lo paga. Suma al total de la nota de venta. La plata queda como ingreso de la automotora. **No** afecta al consignador. |
| **"Consignador"** | Se descuenta del monto que recibe el consignador (el dueño del auto). **No** aparece en la nota de venta porque el comprador no lo paga. |

**Por defecto:**
- Gastos → "Consignador" (como funcionaba antes).
- Ingresos → "Cliente final".

Podés cambiar el destinatario después con el dropdown que aparece en cada línea.

**Ejemplo:**

Auto consignado, vendido en $9.800.000, comisión $500.000.
Gestoría $50.000 (descontada al consignador), Seguro $300.000 (pagado por el cliente final).

```
Cierre de negocio:
  Para el Consignador:  $9.250.000  (9.8M − 500k comisión − 50k gestoría)
  Ingresos Automotora:    $850.000  (500k comisión + 50k gestoría + 300k seguro)

Nota de venta (lo que paga el comprador):
  Precio de venta del vehículo  $9.800.000
  + Seguro                       $300.000
  ─────────────────────────────────────────
  TOTAL                       $10.100.000
  ↑ La gestoría no aparece porque la pagó el consignador, no el comprador.
```

## Nota de venta — Ajuste de precio

Cuando vendes un vehículo a un precio menor al precio publicado, la nota de venta muestra automáticamente el desglose:

```
Precio publicado del vehículo   $10.000.000
- Ajuste de precio                 -$200.000
+ Valor de transferencia         $1.000.000
+ Seguro                           $300.000
TOTAL                           $11.100.000
```

Si vendiste exactamente al precio publicado, la línea de "Ajuste" no aparece.
