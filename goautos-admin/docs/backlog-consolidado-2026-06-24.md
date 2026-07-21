# Backlog consolidado GoAuto — 2026-06-24

Cruce de los **3 grupos de WhatsApp** (GoAuto DEv, Mallorca, SAC) contra el **estado real verificado en el código de `production`**. Objetivo: foto única de qué falta y **de quién depende**, para que nadie vuelva a pedir algo ya hecho.

> Relevados ~135 pedidos (DEv 67 · Mallorca 40 · SAC 28), muchos duplicados entre grupos. Acá están deduplicados y agrupados por responsable/estado.

---

## Resumen ejecutivo

- **Lo contable nuestro está cerrado y verificado** (fuente única de margen con test que la garantiza, IVA de compra, financieras, inventario, parte de pago + backfill, Transbank infra, cuotas a plazo, notas de venta). Los bugs de la contadora (Carny) están resueltos.
- Lo que mantiene el proyecto **bajo el 100% no es código nuestro**: son **integraciones de Diego** (MercadoLibre, ChileAutos, builder), **decisiones de la contadora**, **bloqueos de terceros** (Gonzalo, Meta), y un puñado de **bugs de UI**.
- Quedan **pocas cosas de código nuestro** realmente accionables (abajo, sección 🔴).

---

## ✅ Verificado HECHO (no repetir)

**Contabilidad / márgenes**
- Fuente única del margen (mismo número en detalle, dashboard, KPIs, charts, Excel, resumen) — con `test:margin` que garantiza `Σ por-auto == total`. → cierra "márgenes distintos" / "suma ≠ total".
- Compra con IVA entra por su NETO (`genera_credito_fiscal`). IVA de compra y de venta independientes.
- Captura de régimen afecto/exento al ingresar; desglose neto/bruto en los formularios.
- Margen de consignación usa el valor del **cierre** (lo pagado al consignante).
- Parte de pago: costo real obligatorio > $0 + **backfill histórico** (verificado: 0 autos en $0).
- Transbank: **monto provisional** marcable y corregible (transacciones del auto + gastos generales).
- Financieras: "Global" y otras en la lista + cuenta por cobrar (`financing_settled`).
- Inventario no se infla (autos sin costo valen $0, no precio lista) + alerta de autos sin costo.
- Editar venta/nota refresca resumen del mes y dashboards. Transferencia sin doble conteo.
- Comisión fija de vendedor (además de %); historial de comisiones en la línea de tiempo.
- Gastos fijos de la automotora; gastos no atribuibles a un auto.

**Ventas / inventario / ficha**
- Venta con **cuotas/letras a plazo** (las cuotas a plazo NO cuentan como pagadas).
- Ficha técnica: plantilla editable + se guarda como documento.
- Notas de venta: refresco inmediato al editar; plan de pagos.
- Precio de publicación default; lápiz de editar documentos (drawer) operativo.

**Tanda UX (12-16 jun)**: proveedor→vendedor, precio reserva, selector de columnas, dirección de sucursal, editar tareas, vehículos recién creados ya no desaparecen, formularios no se cierran al click fuera, clientes empresa (razón social) [VDT], subir inventario por Excel [VDT].

**ChileAutos (lado GoAuto)**: publicar al 100% (título/versión/badge), borrar baja de CA+ML, READ de estado real, sync de precio, edición parcial sin republicar (base).

**Infra/varios**: GAIA 2.0 + fix modelo Sonnet; SEO por cliente; permisos granulares por rol; changelog automático.

---

## 🔴 Accionable — CÓDIGO nuestro (lo que falta de verdad)

### Contable (sin decisión de la contadora)
- [ ] **Ingresos NO atribuibles a un vehículo** (Carssale): existe para gastos, falta para ingresos (inspecciones, ingresos mensuales). Código simétrico a `useUnattributedExpenses`.
- [ ] **Transferencia de COMPRA como costo** (R4 del fundamento): hoy solo existe la de venta. Campo + autocálculo sugerido (≈ valor×1,15% + $120.000). Como gasto opcional, no mueve márgenes viejos.
- [ ] **Brecha C — régimen del auto recibido en parte de pago**: no hereda `iva_exento` (nace NULL → toma el default del cliente). Fix chico; **decidir criterio** (un auto de particular suele ser exento). Toca el margen de esos autos.

### Bugs (nuestros)
- [ ] **Drawers/pop-ups se cierran solos** al hacer click al lado y se pierde lo cargado — **el más reportado** (Auto FC, multi-cliente, recurrente desde mayo).
- [ ] **"Días en Stock" sale NaN** (general).
- [ ] **DAP**: no se pueden actualizar los **consignantes** en autos cargados por importación masiva.
- [ ] **DAP**: cargar cliente en un auto **sin foto** y luego subir la foto → **se pierde el cliente**.
- [ ] **Movek**: en inventario **solo aparecen 2 autos** (posible relación con aprobación de venta por admin).
- [ ] **"Parpadeo"/inventario tiritando** y se cae la sesión — sin reproducir (varios clientes).
- [ ] **Un solo OWNER** por organización.
- [ ] **Soft-delete de usuarios** impide recrear un usuario borrado.
- [ ] **Modal "completá info legal primero"** cuando falta en configuración.
- [ ] Repro pendiente: **botón "agregar vehículo" tapado**, **config de sucursal rota**.

### Features (nuestras, sin priorizar)
- [ ] **Módulo de financiamiento** (registrar financiamiento + comisión/utilidad, sumar al auto).
- [ ] **API REST pública** (consultar inventario/precios por patente + webhooks de stock).
- [ ] **Centro de "Novedades" in-app** (avisar funciones nuevas a los clientes).
- [ ] **Reseñas de Google** en el builder (Carssale).

---

## 👤 Diego — integraciones (no tocar, su dominio)

### MercadoLibre (bloque entero, arrastrado)
- Token se vence sin avisar; aun reconectando no sincroniza/publica ("sube 0").
- Publica con ubicación/logo de **otra automotora** (Beichek, Trade Cars); no sube WhatsApp, descripción ni patente; sale como Región Metropolitana / dirección de Quilpué.
- Detecta mal el plan/límite; "ML de motores" nuevo.

### ChileAutos
- Drawer de detalle al publicar **desde Vehículos**; BBDD de **versiones**; editar sin republicar (detalles).
- Fotos: sube solo las **10 primeras** / se "caen" de las publicaciones.
- **Link directo** de la publicación en inventario; reflejar **precio descuento** en CA; **stats/CP panel** (sin visibilidad).
- **Leads**: descargar tabla, generar tareas, push por leads botados, logs del lead, **reglas configurables** (asignación/liberación), URL de integración de leads.

### Builder / Website
- Crear páginas (multi-página), editar páginas legales (T&C/Privacidad), autoplay de YouTube, **UI de dominio personalizado**, builder legacy que no refleja cambios.

---

## 🔒 Bloqueado por terceros

- **Contadora** (4 decisiones — ver doc aparte): margen afecto→neto (~16%), Transbank (costo/ingreso + conciliación), IVA sin factura (3er estado), transferencia pass-through vs margen, tratamiento de facturas afecta/exenta.
- **Gonzalo**: tabla/cartola descargable (ingresos + gastos + IVA por patente) + formato del Excel.
- **Meta**: aprobación de la cuenta dev de Facebook + IG (modal de preview, vincular >1 perfil, FB Marketplace, pixel).
- **HTML de Mallorca**: "sistema de ingreso de GoAuto" + checklist.
- **Portales nuevos**: `linze.cl`, "ML de motores" (planear integración).

---

## ⚠️ Puntos ciegos — en audio/video (revisar a mano; pueden esconder pedidos)

- **Carny · 29-05 · 3 videos**: "error al filtrar las ventas del mes de **abril**". (Arreglamos el filtro de mes a nivel general — confirmar el caso puntual.)
- **Nico · 06-06 · 2 videos**: posible bug de plataforma (derivado a Diego/Adrián, sin cierre).
- **SAC · 12-05 · video+audio**: bug en `/vehiculos` que nadie pudo reproducir.
- **Sebastian · 23-06 · audio**: info legal en configuración.
- **Sebastian · 22-06 · audio**: Movek + Instagram.
- **15-06 · video**: bug de navbar (Diego: "se me olvidó mergearlo" → confirmar merge).

---

## Issues abiertos de infra

- **Outage recurrente de Supabase** (se cae ~2×/día, "no registra ventas"). Causa previa: cron que abría demasiadas conexiones (ya eliminado). Pendiente: mirar el gráfico de conexiones/CPU del momento de la caída y decidir si subir compute.

---

## Referencia rápida por cliente

| Cliente | Lo que más pesa abierto |
|---|---|
| **Mallorca** | Decisiones contadora (IVA/Transbank/facturas), tabla Gonzalo, leads ChileAutos, fotos CA, ML |
| **Tuauto** | Parte de pago > monto del auto + saldo a favor (confirmar); cuotas (ya arreglado) |
| **DAP** | Consignantes en importación masiva; cliente se pierde al subir foto |
| **Carssale** | Ingresos no atribuibles; reseñas Google; Automatch; conectar IG |
| **Movek** | Inventario muestra 2 autos; editar páginas legales |
| **Trade Cars / RS / Beichek** | MercadoLibre (logo/dirección/WhatsApp/descr.) |
| **Calderón / general** | Dashboard de inventario; "Días en Stock" NaN |

---

*Generado del cruce de 3 chats + verificación de código (`production`). Mantener al cerrar cada ítem.*
