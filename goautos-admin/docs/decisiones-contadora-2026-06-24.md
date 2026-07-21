# Decisiones contables pendientes — para la contadora (2026-06-24)

Estas 5 definiciones **destraban todo lo contable que queda**. El resto del sistema ya está implementado y verificado; falta solo confirmar **reglas tributarias** antes de mover números que afectan utilidades reportadas. Para cada una: cómo funciona hoy, la pregunta concreta, y el impacto.

---

## 1. ¿El margen de la empresa debe descontar el IVA de venta en autos AFECTOS? ⭐ (la grande)

- **Hoy:** el margen de la **empresa** se muestra **bruto** (incluye el IVA de la venta). El costo de compra **sí** entra neto cuando hay factura con crédito fiscal. La comisión del **vendedor** ya se calcula sobre el margen **neto** (descuenta 19/119).
- **El fundamento contable dice:** "el IVA nunca toca el margen" → el margen de la empresa también debería ir **neto** en afectos.
- **Pregunta:** ¿aplicamos el régimen de margen de usados y netamos el IVA del margen de empresa en autos afectos?
- **Impacto:** **baja ~16% el margen reportado de TODOS los autos afectos.** Es el cambio más grande y es difícil de revertir una vez aplicado → necesita confirmación explícita.

## 2. Comisiones de Transbank: ¿costo o ingreso? ¿cómo se concilian?

- **Hoy:** ya se puede cargar el monto como **provisional** (estimado) y corregirlo después. Falta la regla.
- **Preguntas:**
  - ¿Es **costo** (lo absorbe la automotora) o **ingreso/recargo** (lo paga el cliente)? ¿Depende del caso?
  - La factura mensual de Transbank **agrupa varios autos** → ¿cómo se reparte/concilia? ¿se prorratea por auto o se carga como gasto general de la automotora?
- **Impacto:** define si Transbank entra al margen por auto o al resultado general.

## 3. IVA cobrado "sin factura" / en standby: ¿hace falta un 3er estado?

- **Hoy:** un auto es **afecto** o **exento**.
- **Planteo del cliente:** "el IVA que se cobra sale como utilidad y no es ganancia; debería quedar en standby" (somos revendedores).
- **Pregunta:** ¿se necesita un **3er tratamiento** (cobra IVA pero sin factura / IVA retenido) distinto de afecto y exento? ¿Cómo debe verse en el resultado?

## 4. Valor de transferencia (CRT): ¿pass-through o genera margen?

- **Hoy:** la transferencia de **venta** es **pass-through** (no afecta el margen), salvo que la automotora la absorba (ahí castiga el margen). La transferencia de **compra** no se registra como costo (a implementar).
- **Reporte:** "el ingreso de la transferencia (415k) suma en ingresos pero no afecta el neto".
- **Pregunta:** cuando el cliente paga la transferencia, ¿es estrictamente pass-through (lo correcto hoy) o la automotora **retiene un margen** sobre ella que debería sumar al neto?

## 5. Facturas afecta/exenta — neto vs bruto en compra y venta

- **Hoy:** se captura el régimen y se desglosa neto/bruto en los formularios; compra y venta de IVA son independientes.
- **Reporte:** "las facturas de compra y venta del vehículo siguen mal" (la de gasto está ok).
- **Pregunta:** ¿qué exactamente falta en el tratamiento de la factura de compra/venta? (confirmar con un caso concreto: número, qué muestra el sistema vs qué debería).

---

## Qué pasa después de la reunión

Con estas 5 resueltas, implemento de inmediato:
- (1) netear el margen de empresa en afectos — si se confirma.
- (2)(3) reglas de Transbank e IVA standby.
- (4) transferencia: ajustar si genera margen.
- (5) corregir el caso puntual de facturas.

Lo que **no depende de esto** ya está hecho (fuente única de margen, IVA de compra, financieras, inventario, parte de pago, cuotas, etc.).
