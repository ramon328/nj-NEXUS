# Vehículos — Guía de Usuario

## Acceso
Menú lateral → **Vehículos**

## Vista del Inventario

Al entrar ves tu inventario completo. Puedes cambiar entre tres vistas:

- **Tabla** — Vista clásica con todas las columnas. Puedes configurar qué columnas ver con el botón de engranaje.
- **Tablero** — Vista tipo Kanban organizada por estados (Publicado, En Preparación, Vendido, etc.). Puedes arrastrar vehículos entre estados.
- **Cards (móvil)** — Vista optimizada para celular.

### Filtros
Usa los filtros para buscar por marca, modelo, año, precio, estado, etc. Los filtros se mantienen mientras navegas.

### Cards de Estado
En la parte superior ves un resumen rápido: cuántos vehículos tienes en cada estado.

## Agregar un Vehículo

1. Click en **"+ Agregar"**
2. Completa los pasos:
   - **Info básica** — Marca, modelo, año, patente, color, combustible, transmisión
   - **Fotos** — Sube las fotos del vehículo (se comprimen automáticamente)
   - **Adquisición** — Costo, tipo (compra directa o consignación), datos bancarios
   - **Ventas** — Precio de venta y **precio mínimo (obligatorio)**. El precio mínimo es el piso bajo el cual el sistema te va a frenar al vender o cerrar negocio (ver guía de Ventas).
   - **Resumen** — Revisa todo y confirma

### Autocompletar por Patente
Si ingresas la patente chilena, el sistema puede autocompletar marca, modelo, año, combustible y más datos automáticamente.

### Patente repetida y recompra
No puedes crear dos vehículos con la misma patente si el existente sigue activo (publicado, reservado, etc.) — el sistema te pedirá editar el existente. La excepción es la **recompra**: si el vehículo con esa patente figura como **Vendido**, puedes agregarlo de nuevo sin problema; se crea como una unidad nueva de inventario y la venta anterior queda intacta en el historial.

## Detalle del Vehículo

Al hacer click en un vehículo ves:

- **Resumen** — Foto principal, precio, costo, margen, días publicado
- **Timeline** — Historial de todo lo que ha pasado con el vehículo
- **Detalles** — Especificaciones técnicas completas
- **Documentos** — Documentos asociados (compra, venta, consignación, etc.)
- **Checklist** — Lista de verificación de preparación. Cada item tiene un botón de comentarios (💬) que abre un panel inline donde se pueden dejar notas con autor y fecha. Los comentarios sirven para registrar contexto sobre ese item (ej: "Solo se cambiaron los neumáticos delanteros, los traseros están al 60%"). Cualquier usuario del cliente puede agregar comentarios; solo el autor o un admin pueden borrarlos.

> **Datos sensibles del detalle (por rol)**: el **precio de compra/acordado** y el **resumen financiero** se controlan con permisos propios en *Equipo → Gestionar roles* (categoría Inventario): **"Ver precio de compra (detalle vehículo)"** y **"Ver resumen financiero (detalle vehículo)"**. Un rol que no los tenga marcados podrá entrar al vehículo pero no verá esas secciones.

### Acciones desde el detalle
- Vender el vehículo
- Reservar
- Generar cotización
- Publicar en ChileAutos
- Editar información
- Cambiar estado

## Importar / Exportar

- **Importar** — Sube un archivo Excel para agregar múltiples vehículos a la vez
- **Exportar** — Descarga tu inventario actual como Excel. Incluye dos columnas referidas al checklist: **Checklist** (resumen tipo `6/8 (75%)`) e **Items Pendientes** (lista de los items que aún no se completaron, ej: `Documentación, Fotos`). Si todos los items están completos aparece `✓ Completo`.
