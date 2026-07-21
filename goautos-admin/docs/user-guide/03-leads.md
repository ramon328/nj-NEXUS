# Leads — Guía de Usuario

## Acceso
Menú lateral → **Leads**

## ¿Qué es un lead?

Un lead es una oportunidad de negocio. Puede ser alguien que:
- Quiere **comprar** un vehículo
- Quiere **vender** o **consignar** su vehículo
- Busca **financiamiento**
- Solicita una **transferencia**
- Hace un **contacto** general

## Vistas

### Kanban
Vista de tablero con columnas por estado. Arrastra los leads entre columnas para cambiar su estado.

### Tabla
Vista lista con todos los datos visibles y filtros avanzados.

## Gestionar un Lead

1. Click en un lead para ver su detalle
2. En el panel lateral puedes:
   - Ver toda la información del lead
   - Cambiar su estado
   - Asignar a un vendedor
   - Agregar notas
   - Contactar al cliente

## Leads por vendedor

Por defecto todos los vendedores ven todos los leads de la automotora. Si quieres que **cada vendedor vea solo sus propios leads**:

1. Ve a **Configuración → Permisos de vendedores**.
2. Desactiva **"Ver todos los leads"**.

Con esto:
- Cada lead que un vendedor ingresa queda como **suyo** y solo él lo ve.
- Los **administradores** y **gerentes comerciales** siguen viendo todos los leads y pueden **reasignar** un lead a otro vendedor desde el detalle del lead.
- Los leads que entran por la web o marketplaces quedan **sin asignar** hasta que un admin los asigne a un vendedor.

## Filtros

Filtra por:
- Tipo de lead (compra, venta, financiamiento, etc.)
- Estado
- Fecha
- Vendedor asignado

## Notificaciones

Los nuevos leads pueden notificarte por:
- Badge en el menú lateral
- Notificación push
- WhatsApp (si configurado)

## Cards de Estado

En la parte superior ves métricas de conversión: cuántos leads tienes en cada etapa y tasas de conversión.

## Exportar leads a Excel

Con el botón **Exportar** (arriba, junto a "Agregar Lead") descargas un Excel con los leads que estás viendo (respeta el tab y los filtros activos). Incluye datos del cliente, vehículo, estado y el **vendedor asignado**. Mismo formato que el export de Contactos de ChileAutos.

## Que los vendedores "tomen" leads (pool)

En **Configuración → Permisos de vendedores**, si desactivas "Ver todos los leads" aparece la opción **"Permitir tomar leads sin asignar (pool)"**. Con ella activada, cada vendedor ve sus leads asignados **más** los leads sin asignar, y puede tomarlos con el botón "Tomar este lead" (o soltarlos para devolverlos al pool). Nunca ve los leads asignados a sus compañeros.

## Historial del lead

Al abrir un lead ves su **Historial**: cuándo se creó y por qué vía (Web/ChileAutos/Panel), cuándo se asignó/reasignó, los cambios de estado y cuándo se **actualizaron las notas**, con fecha y responsable. Cada vez que alguien edita las notas queda registrado "Notas actualizadas" con quién y cuándo (no se muestra el texto, solo que hubo un cambio).

## Avisos y liberación de leads botados

En **Configuración → Permisos de vendedores** puedes activar:
- **Avisar por leads sin seguimiento**: una vez al día notifica los leads sin actividad por el tiempo que configures (al vendedor; los sin asignar, al admin). "Sin actividad" = el vendedor dueño no abrió el lead. Las horas son configurables (por defecto 48h).
- **Liberar automáticamente los leads botados**: si tras avisar el lead sigue sin seguimiento por el tiempo que configures, vuelve a "Pendiente" y se le quita el vendedor, para que otro lo tome. Las horas son configurables (por defecto 72h; no puede ser antes del aviso).

Ambas opciones aplican solo a los leads recibidos **desde que las activas** (no afectan los leads viejos).
