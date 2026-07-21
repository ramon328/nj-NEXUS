-- =============================================
-- Seed user-guide tutorials into updates table
-- These are global tutorials (client_id = NULL)
-- visible to all dealerships.
-- Author: Nicolás Moreno (superadmin)
-- =============================================

DO $$
DECLARE
  v_author_id UUID;
BEGIN
  -- Find Nicolás Moreno's auth_id from users table
  SELECT auth_id INTO v_author_id
  FROM users
  WHERE first_name ILIKE '%nicol%' AND last_name ILIKE '%moreno%'
  LIMIT 1;

  -- Fallback: use any superadmin
  IF v_author_id IS NULL THEN
    SELECT auth_id INTO v_author_id
    FROM users
    WHERE role = 'superadmin'
    LIMIT 1;
  END IF;

INSERT INTO updates (type, title, slug, excerpt, content_markdown, tags, category, read_time, status, featured, gradient, client_id, author_id, published_at)
VALUES

-- 1. Visión General
('tutorial', 'Bienvenido a GoAuto — Visión General', 'bienvenido-a-goauto',
'Conoce todos los módulos de GoAuto y cómo la plataforma te ayuda a gestionar tu automotora de forma integral.',
'# Bienvenido a GoAuto

GoAuto es una plataforma completa de gestión para automotoras. Permite administrar todo el negocio desde un solo lugar.

## Módulos Principales

| Módulo | Para qué sirve |
|--------|----------------|
| **Dashboard** | Ver métricas del negocio en tiempo real |
| **Vehículos** | Gestionar el inventario completo |
| **Ventas** | Registrar y aprobar ventas |
| **Clientes** | Base de datos de clientes |
| **Leads** | Gestionar oportunidades de negocio |
| **Financiamiento** | Administrar ventas a plazo |
| **Tareas** | Organizar el trabajo del equipo |
| **Calendario** | Agendar citas y eventos |
| **Documentos** | Generar y gestionar documentación |
| **Marketing** | Campañas y recomendaciones inteligentes |
| **Builder** | Diseñar el sitio web de la automotora |
| **Integraciones** | ChileAutos, Instagram, Facebook, MercadoLibre |
| **Configuración** | Personalizar el sistema |

## Roles de Usuario

- **Administrador** — Acceso completo al sistema
- **Vendedor** — Puede registrar ventas (requieren aprobación del admin), ver vehículos y clientes
- **Roles personalizados** — El admin puede crear roles con permisos específicos desde Equipo → Roles

## Navegación

La barra lateral izquierda muestra todos los módulos disponibles según tus permisos. Los **badges rojos** indican items pendientes (leads nuevos, tareas, etc.).

> 💡 **Tip:** Pregúntale a GAIA (el asistente IA) cualquier duda sobre cómo usar la plataforma.',
ARRAY['inicio', 'overview', 'módulos', 'roles'],
'guide', '3 min', 'published', true, 'from-blue-600 to-cyan-500', NULL, v_author_id, NOW()),

-- 2. Vehículos
('tutorial', 'Cómo Gestionar tu Inventario de Vehículos', 'gestion-inventario-vehiculos',
'Aprende a agregar vehículos, usar las vistas de inventario, importar desde Excel y más.',
'# Gestión de Vehículos

## Acceso
📍 Menú lateral → **Vehículos**

## Vistas del Inventario

Al entrar ves tu inventario completo. Puedes cambiar entre tres vistas:

### 📋 Tabla
Vista clásica con columnas. Puedes configurar qué columnas ver con el botón de **engranaje** (⚙️).

### 📊 Tablero
Vista tipo Kanban organizada por estados (Publicado, En Preparación, Vendido, etc.). **Arrastra** vehículos entre columnas para cambiar su estado.

### 📱 Cards (Móvil)
Vista optimizada para celular con tarjetas compactas.

---

## Agregar un Vehículo

1. Click en **"+ Agregar"**
2. Completa los pasos:
   - **Info básica** — Marca, modelo, año, patente, color, combustible, transmisión
   - **Fotos** — Sube las fotos (se comprimen automáticamente)
   - **Adquisición** — Costo, tipo (compra directa o consignación)
   - **Ventas** — Precio de venta
   - **Resumen** — Revisa todo y confirma

### 🔍 Autocompletar por Patente
Si ingresas la **patente chilena**, el sistema autocompleta marca, modelo, año, combustible y más datos automáticamente.

---

## Detalle del Vehículo

Click en cualquier vehículo para ver:

- **Resumen** — Foto, precio, costo, margen, días publicado
- **Timeline** — Historial completo de cambios
- **Detalles** — Especificaciones técnicas
- **Documentos** — Documentos asociados
- **Checklist** — Lista de preparación

### Acciones Disponibles
Desde el detalle puedes: **Vender**, **Reservar**, **Cotizar**, **Publicar en ChileAutos**, **Editar**, **Cambiar estado**.

---

## Importar / Exportar

- **Importar** — Sube un archivo Excel para agregar múltiples vehículos
- **Exportar** — Descarga tu inventario actual como Excel',
ARRAY['vehículos', 'inventario', 'importar', 'exportar', 'patente'],
'guide', '5 min', 'published', false, 'from-emerald-500 to-teal-400', NULL, v_author_id, NOW()),

-- 3. Ventas
('tutorial', 'Cómo Registrar y Aprobar Ventas', 'registrar-aprobar-ventas',
'Todo sobre el flujo de ventas: desde registrar hasta aprobar, comisiones y más.',
'# Ventas

## Acceso
📍 Menú lateral → **Ventas**

## Registrar una Venta

1. Ve al **detalle de un vehículo**
2. Click en **"Vender"**
3. Completa los pasos:
   - **Cliente** — Selecciona existente o crea uno nuevo
   - **Info de venta** — Precio, método de pago, vendedor asignado
   - **Parte de pago** — Vehículo como parte de pago (opcional)
   - **Pagos** — Desglose (abonos, cuotas)
   - **Resumen** — Revisa y confirma

---

## Flujo de Aprobación

| Quién registra | Qué pasa |
|----------------|----------|
| **Administrador** | Se aprueba automáticamente → vehículo pasa a "Vendido" |
| **Vendedor** | Queda **pendiente** → admin debe aprobar |

### Revisar Ventas Pendientes

1. En la página **Ventas**, el tab por defecto muestra las **pendientes**
2. Click en **"Revisar"**
3. Opciones:
   - ✅ **Aprobar** — Venta confirmada, vehículo se marca como vendido
   - ❌ **Rechazar** — Venta cancelada, vehículo vuelve a estar disponible
   - ✏️ Ajustar la **comisión** antes de aprobar

---

## Estados de una Venta

| Estado | Color | Significado |
|--------|-------|------------|
| Pendiente | 🟡 Amarillo | Esperando aprobación |
| Aprobada | 🟢 Verde | Confirmada |
| Rechazada | 🔴 Rojo | Cancelada |

---

## Comisiones

- Se calculan **automáticamente** según la configuración del vendedor
- Base de cálculo: **precio total** o **margen** (precio - costo)
- Se pueden **dividir** entre varios vendedores
- El admin puede ajustar antes de aprobar

---

## Integración con ChileAutos

Si tienes ChileAutos con "sincronizar al vender" activo, al aprobar una venta el vehículo se marca como vendido en ChileAutos automáticamente.',
ARRAY['ventas', 'aprobación', 'comisiones', 'vendedor'],
'guide', '5 min', 'published', false, 'from-green-500 to-emerald-400', NULL, v_author_id, NOW()),

-- 4. Leads
('tutorial', 'Cómo Gestionar Leads y Oportunidades', 'gestionar-leads',
'Aprende a usar el tablero Kanban de leads, filtros y notificaciones.',
'# Leads

## Acceso
📍 Menú lateral → **Leads**

## ¿Qué es un Lead?

Un lead es una **oportunidad de negocio**. Puede ser alguien que:
- 🚗 Quiere **comprar** un vehículo
- 📋 Quiere **consignar** su vehículo
- 🔍 **Busca** un vehículo específico
- 💰 Solicita **financiamiento**
- 📞 Hace un **contacto** general

---

## Vistas

### 📊 Kanban
Tablero con columnas por estado. **Arrastra** los leads entre columnas para cambiar su estado.

### 📋 Tabla
Vista lista con filtros avanzados y todos los datos visibles.

---

## Gestionar un Lead

1. Click en un lead para abrir el **panel lateral**
2. Puedes:
   - Ver toda la información
   - Cambiar estado
   - Asignar a un vendedor
   - Agregar notas
   - Contactar al cliente

---

## Filtros

Filtra por: **tipo** de lead, **estado**, **fecha**, **vendedor** asignado.

## Notificaciones

Nuevos leads te notifican por:
- 🔴 Badge en el menú lateral
- 📱 Notificación push
- 💬 WhatsApp (si configurado en Configuración → Mensajería)',
ARRAY['leads', 'oportunidades', 'kanban', 'prospectos'],
'guide', '3 min', 'published', false, 'from-amber-500 to-orange-400', NULL, v_author_id, NOW()),

-- 5. Financiamiento
('tutorial', 'Cómo Administrar Financiamientos', 'administrar-financiamientos',
'Crea planes de pago, registra cuotas y haz seguimiento del progreso de cada financiamiento.',
'# Financiamiento

## Acceso
📍 Menú lateral → **Financiamiento**

## Crear un Financiamiento

1. Click en **"Nuevo financiamiento"**
2. Selecciona el **vehículo** y el **cliente**
3. Define:
   - 💵 **Pie** — Monto inicial
   - 📅 **Cuota mensual** — Valor de cada cuota
   - 🔢 **Cantidad de cuotas** — Total de pagos
   - 📊 **Tasa de interés**
4. El sistema genera el **calendario de pagos automáticamente**

---

## Lista de Financiamientos

Cada financiamiento muestra:
- Nombre del cliente y vehículo
- Pie y cuota mensual
- Estado (al día, atrasado, completado)
- Próximo pago
- **Barra de progreso** (cuotas pagadas vs. total)

---

## Detalle

Click en un financiamiento para ver:
- **Info del cliente y vehículo**
- **Calendario de pagos** — Todas las cuotas con fecha y estado
- **Registrar pago** — Marca cuotas como pagadas
- **Progreso visual** — Cuántas cuotas van vs. total',
ARRAY['financiamiento', 'cuotas', 'pagos', 'plazo'],
'guide', '3 min', 'published', false, 'from-violet-500 to-purple-400', NULL, v_author_id, NOW()),

-- 6. Clientes
('tutorial', 'Cómo Gestionar tu Base de Clientes', 'gestionar-clientes',
'Agrega clientes manualmente, importa desde Excel y mantén tu base actualizada.',
'# Clientes

## Acceso
📍 Menú lateral → **Clientes**

## Ver Clientes

La tabla muestra todos tus clientes con nombre, RUT, email, teléfono y fecha. Usa la **barra de búsqueda** para encontrar rápidamente.

## Agregar un Cliente

Click en **"+ Nuevo cliente"** y completa:
- Nombre y apellido
- RUT
- Email
- Teléfono
- Fecha de nacimiento

## Importar desde Excel

Si ya tienes una base de clientes:
1. Click en **"Importar"**
2. Sube tu archivo Excel
3. Mapea las columnas
4. Confirma la importación

---

## ¿Dónde se usan los clientes?

Los clientes se seleccionan al:
- 🚗 Registrar una **venta**
- 💰 Crear un **financiamiento**
- 📋 Registrar un **lead**
- 🔒 Hacer una **reserva**
- 📄 Generar **documentos** (cotización, compraventa, etc.)',
ARRAY['clientes', 'importar', 'excel', 'contactos'],
'guide', '2 min', 'published', false, 'from-sky-500 to-blue-400', NULL, v_author_id, NOW()),

-- 7. Tareas y Calendario
('tutorial', 'Cómo Usar Tareas, Calendario y Agendamientos', 'tareas-calendario-agendamientos',
'Organiza el trabajo con el tablero Kanban, calendario unificado y agendamientos.',
'# Tareas, Calendario y Agendamientos

## Tareas

📍 Menú lateral → **Tareas**

### Tablero Kanban
Tres columnas: **Pendiente** → **En progreso** → **Completada**. Arrastra para cambiar estado.

### Crear una Tarea
1. Click en **"+ Nueva tarea"**
2. Define: título, descripción, prioridad, asignado, fecha límite

### Tipos
- **Manuales** — Las creas tú
- **De checklist** — Se generan automáticamente desde el checklist de preparación de un vehículo

---

## Calendario

📍 Menú lateral → **Calendario**

Vista mensual que **unifica**:
- 📅 Eventos que creas
- ✅ Tareas con fecha límite
- 🤝 Agendamientos de clientes
- ⚠️ Vencimientos de documentos

Click en una fecha para crear un evento.

---

## Agendamientos

📍 Menú lateral → **Agendamientos**

Para gestionar citas con clientes: test drives, visitas, entregas. Vista calendario o tabla.

---

## Solicitudes de Vehículos

📍 Menú lateral → **Solicitudes**

Cuando un cliente busca un vehículo que no tienes en stock, crea una solicitud. Se gestionan con tablero Kanban.',
ARRAY['tareas', 'calendario', 'agendamientos', 'solicitudes', 'kanban'],
'guide', '4 min', 'published', false, 'from-indigo-500 to-blue-400', NULL, v_author_id, NOW()),

-- 8. Integraciones
('tutorial', 'Cómo Configurar tus Integraciones', 'configurar-integraciones',
'Conecta ChileAutos, Instagram, Facebook Marketplace y WhatsApp con tu automotora.',
'# Integraciones

## ChileAutos

📍 Menú lateral → **ChileAutos**

### Configuración
1. Ingresa tu **Seller Identifier**
2. Conecta con tu cuenta **OAuth**
3. Configura sincronización automática:
   - ✅ **Al publicar** — Se publica cuando cambias estado a "Publicado"
   - ✅ **Al editar** — Se actualiza al editar el vehículo
   - ✅ **Al vender** — Se marca vendido al aprobar la venta

### Publicar
- **Individual**: Desde el detalle del vehículo
- **Masivo**: Desde la página de ChileAutos

### Productos Premium
Agrega topspot, showcase o certificado a tus publicaciones.

---

## Instagram

📍 Menú lateral → **Instagram**

- Publica fotos de vehículos directamente
- Gestiona mensajes directos (DMs)
- Recibe notificaciones de nuevos mensajes

---

## Facebook Marketplace

📍 Menú lateral → **Facebook Marketplace**

Selecciona vehículos para publicar y ve el estado de cada publicación.

---

## WhatsApp

📍 Configuración → **Mensajería** → WhatsApp

Notificaciones automáticas cuando:
- 📩 Llega un nuevo lead
- 💬 Recibes mensaje de Instagram
- 💰 Solicitan financiamiento
- 🚗 Agendan un test drive

Configura tu número y haz una prueba con **"Enviar notificación de prueba"**.',
ARRAY['chileautos', 'instagram', 'facebook', 'whatsapp', 'integraciones'],
'guide', '5 min', 'published', false, 'from-rose-500 to-pink-400', NULL, v_author_id, NOW()),

-- 9. Website Builder
('tutorial', 'Cómo Diseñar tu Sitio Web con el Builder', 'disenar-sitio-web-builder',
'Usa el editor visual drag-and-drop para crear el sitio web de tu automotora sin programar.',
'# Website Builder

## Acceso
📍 Menú lateral → **Builder**

## Empezar

### Elegir un Template
Al entrar, elige un template base:

| Template | Estilo |
|----------|--------|
| **Clásico** | Tradicional, limpio y profesional |
| **Moderno** | Contemporáneo con animaciones |
| **Premium** | Oscuro, ultra premium estilo Porsche/Mercedes |
| **Minimalista** | Simple y directo |

---

## Personalizar

1. **Arrastra secciones** desde el panel izquierdo
2. **Edita textos** haciendo click directamente
3. **Configura cada sección** desde el panel de settings
4. **Cambia colores** en el panel de tema
5. **Preview** en desktop, tablet y móvil

---

## Secciones Disponibles

### 🎬 Hero (Portada)
Más de 13 estilos: con imagen de fondo, buscador, cards, minimalista, etc.

### 🚗 Vehículos
Muestra tu inventario: grilla, carrusel, lista, con filtros.

### 📝 Contenido
Por qué elegirnos, FAQ, equipo, testimonios.

### 📸 Galería
La **Galería Premium** autocarga fotos reales de tus vehículos automáticamente.

### 📞 Contacto
Llamada a la acción con botón, mapa de ubicación.

### 📊 Marketing
Contador de estadísticas, banner promocional.

---

## Guardar

Los cambios se guardan automáticamente. Tu sitio web se actualiza en tiempo real.',
ARRAY['builder', 'sitio web', 'diseño', 'drag-and-drop', 'templates'],
'guide', '4 min', 'published', false, 'from-fuchsia-500 to-purple-400', NULL, v_author_id, NOW()),

-- 10. Dashboard
('tutorial', 'Cómo Leer y Usar tu Dashboard', 'como-usar-dashboard',
'Entiende las métricas de tu negocio: ventas, inventario, web y vendedores.',
'# Dashboard

## Acceso
Es la **página principal** al entrar al sistema.

---

## Pestañas

### 💰 Comercial
- **Ventas totales** — Cuánto has vendido
- **Gastos** — Tus gastos del periodo
- **Margen bruto** — Ganancia (ventas - costos)
- **Valor inventario** — Valor de tu stock actual
- **Rendimiento** — Indicadores de eficiencia
- **Alertas** — Situaciones que requieren atención
- **Resumen comercial** — Métricas promedio por vehículo

### 📦 Inventario
- Vehículos por estado
- Gráficos de rotación
- Vehículos con mucho tiempo publicados
- Recomendaciones de stock

### 🌐 Web
- Visitas a tu sitio web
- Páginas más vistas
- Tendencias de tráfico

### 👥 Vendedores
- Ranking por ventas
- Comisiones acumuladas
- Performance individual

---

## Periodo de Tiempo

Cambia el periodo para ver datos de: **hoy**, **esta semana**, **este mes** o **personalizado**.

---

## Alertas Inteligentes

El sistema analiza tu negocio y te avisa sobre:
- ⚠️ Vehículos mucho tiempo publicados
- 📄 Documentos próximos a vencer
- 📉 Métricas que bajan vs. periodo anterior
- 💡 Oportunidades de mejora',
ARRAY['dashboard', 'métricas', 'kpi', 'alertas', 'reportes'],
'guide', '3 min', 'published', false, 'from-cyan-500 to-blue-400', NULL, v_author_id, NOW()),

-- 11. Configuración
('tutorial', 'Cómo Configurar tu Automotora', 'configurar-automotora',
'Personaliza estados de vehículos, equipo, permisos, notificaciones y más.',
'# Configuración

## Acceso
📍 Menú lateral → **Configuración**

---

## Secciones

### ⚙️ General
Nombre, logo, favicon, colores del tema, moneda (CLP/USD), idioma (es/en/pt).

### 🏢 Sucursales
Gestiona múltiples sucursales con dirección, teléfono, email y ubicación en mapa.

### 📜 Info Legal
Razón social, RUT de empresa, representante legal, dirección legal.

### 🚗 Vehículos
- **Estados personalizados** — Crea y ordena tus estados (Publicado, En Preparación, Vendido, etc.)
- **Campos obligatorios** — Elige qué documentos son obligatorios al agregar vehículo
- **Configuración de página** — Personaliza la vista

### ✅ Checklist
Items del checklist de preparación. Se convierten en tareas automáticas.

### 🔔 Notificaciones
Push y WhatsApp con triggers configurables.

---

## Equipo

📍 Menú lateral → **Equipo**

### Tabs

| Tab | Contenido |
|-----|-----------|
| **Administradores** | Gestionar usuarios admin |
| **Vendedores** | Gestionar vendedores con comisiones configurables |
| **Roles** | Crear roles personalizados con permisos específicos |

> 💡 Cada permiso controla acceso a un módulo o funcionalidad específica. Puedes crear roles como "Vendedor Senior" con más permisos que un vendedor estándar.',
ARRAY['configuración', 'equipo', 'roles', 'permisos', 'notificaciones'],
'guide', '4 min', 'published', false, 'from-slate-500 to-gray-400', NULL, v_author_id, NOW()),

-- 12. Documentos
('tutorial', 'Cómo Generar y Gestionar Documentos', 'generar-gestionar-documentos',
'Genera documentos de compraventa, cotizaciones, reservas y más con templates personalizables.',
'# Documentos

## Acceso
📍 Menú lateral → **Documentos**

---

## Tipos de Documentos

| Tipo | Cuándo se genera |
|------|-----------------|
| **Compraventa** | Al registrar una venta |
| **Compra** | Al comprar un vehículo |
| **Consignación** | Al recibir en consignación |
| **Reserva** | Al reservar un vehículo |
| **Cotización** | Al cotizar para un cliente |
| **Cierre de negocio** | Al cerrar un trato |

---

## Templates Personalizables

1. Ve a **Documentos → Templates**
2. Selecciona el tipo de documento
3. Edita usando **variables dinámicas**:

| Variable | Valor |
|----------|-------|
| `{cliente_nombre}` | Nombre del cliente |
| `{vehiculo_marca}` | Marca del vehículo |
| `{vehiculo_modelo}` | Modelo |
| `{precio_venta}` | Precio de venta |

---

## Generar un Documento

Desde el **detalle del vehículo**:
1. Ve a tab **Documentos**
2. Click en **"Generar documento"**
3. Selecciona tipo y cliente
4. Revisa y confirma

La **numeración es automática** y secuencial.',
ARRAY['documentos', 'templates', 'cotización', 'compraventa'],
'guide', '3 min', 'published', false, 'from-orange-500 to-amber-400', NULL, v_author_id, NOW()),

-- 13. Marketing y Alertas
('tutorial', 'Marketing, Alertas Inteligentes y Tasador', 'marketing-alertas-tasador',
'Usa las recomendaciones automáticas, alertas de negocio y el tasador IA.',
'# Marketing, Alertas y Tasador

## Marketing

📍 Menú lateral → **Marketing**

El sistema analiza el historial de compras y preferencias de tus clientes para **recomendar a quién contactar** para cada vehículo.

- 🎯 **Recomendaciones automáticas** — Clientes que podrían interesarse en un vehículo
- 👥 **Segmentación** — Filtra por preferencias, historial, ubicación

---

## Alertas Inteligentes

📍 Menú lateral → **Alertas Inteligentes**

Alertas automáticas que el sistema genera analizando tu negocio:

- ⚠️ **Vencimientos** — Documentos de vehículos próximos a vencer
- 📦 **Stock estancado** — Vehículos mucho tiempo sin venderse
- 📉 **Tendencias negativas** — Métricas que bajan
- 💡 **Oportunidades** — Donde podrías mejorar

Incluye tarjetas KPI y un panel de **sugerencias de IA**.

---

## Tasador

📍 Menú lateral → **Tasador**

Herramienta de valorización con IA. Ingresa los datos del vehículo y obtén un **rango de precio estimado** basado en datos del mercado.

---

## Asistente IA (GAIA)

📍 Menú lateral → **Asistente**

Chat con inteligencia artificial que puede:
- 📊 Responder sobre tus métricas y datos
- 🎓 **Enseñarte cómo usar** cualquier función de GoAuto
- 💡 Darte recomendaciones de negocio
- 📋 Buscar datos específicos en tiempo real

Guarda historial de conversaciones para que retomes donde dejaste.',
ARRAY['marketing', 'alertas', 'tasador', 'ia', 'gaia', 'asistente'],
'guide', '4 min', 'published', false, 'from-pink-500 to-rose-400', NULL, v_author_id, NOW())

ON CONFLICT (slug) DO NOTHING;

END $$;
