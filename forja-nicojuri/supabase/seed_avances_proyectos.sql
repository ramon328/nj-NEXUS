-- ============================================================
-- Seed: Proyectos de avance en el tablero "Ramón · Proyectos"
-- Fuente: Partes de Avance (PDR) del 05 jun y 08–09 jun 2026.
-- Ejecutar en el SQL Editor de Supabase (proyecto Forja).
--
-- Versión compacta: una sola sentencia (CTE) que crea los 13
-- proyectos y todas sus tarjetas. NO es idempotente: correr una
-- sola vez. Si lo corres dos veces, duplica.
--
-- Columnas: 'todo' = Por hacer · 'doing' = En progreso · 'done' = Hecho
-- ============================================================

with proj as (
  insert into forja_projects (name, description) values
    ('Plataforma Aliace', 'P0 · Plataforma comercial de clientes. Listo cuando cuadra al peso con Power BI.'),
    ('Ali — IA de Aliace', 'P0 máxima · IA que responde sobre el negocio de Aliace.'),
    ('Inteligencia de competencia (Impomin)', 'P2 · Monitoreo de precios de la competencia.'),
    ('Autos Intel', 'P2 · Inteligencia de autos usados (ChileAutos + Yapo).'),
    ('Repositorio de documentos por empresa', 'P1 · Sección privada del hub. Publicado en producción.'),
    ('App de scrapeo integrada al hub (SSO)', 'P1 · Acceso único desde Forja con el scraper corriendo solo.'),
    ('Plataforma de cálculo de clínica', 'Producto con IA de soporte para la operación de la clínica.'),
    ('Carga de datos históricos', 'Data y trazabilidad. Historial dentro del sistema.'),
    ('Conexión multibancos', 'Fintech sobre Rails. Conexión con múltiples bancos.'),
    ('Ali — agente de IA por WhatsApp (Alaice)', 'Agente de IA por WhatsApp para la plataforma Alaice.'),
    ('Ailnest — correo inteligente', 'Productividad con IA. Bandeja de correo inteligente.'),
    ('Experiencia móvil (PWA)', 'Frontend app-like. Instalar la web como app.'),
    ('Dominios e infraestructura', 'Infra y puesta en línea.')
  returning id, name
)
insert into forja_cards (project_id, column_key, title, description, position)
select pr.id, c.col, c.title, c.descr, c.pos
from proj pr
join (values
  ('Plataforma Aliace','done','Ventas y márgenes cuadran con Power BI','Margen 76,18% en el año, sin ventas duplicadas.',0),
  ('Plataforma Aliace','done','Mes en curso en vivo','Los números del mes ya no salen atrasados.',1),
  ('Plataforma Aliace','done','Gráfico de tendencia mes a mes','Compara historia, lo realizado y la meta.',2),
  ('Plataforma Aliace','done','Plataforma estable y publicada','Tras correcciones de infraestructura.',3),
  ('Ali — IA de Aliace','done','Responde preguntas del negocio desde el chat','Ventas, márgenes, entregas, facturas vencidas, riesgo.',0),
  ('Ali — IA de Aliace','done','Responde con tablas y gráficos','Explica de dónde sale cada número.',1),
  ('Ali — IA de Aliace','done','Memoria permanente','Aprende correcciones y reglas y las recuerda.',2),
  ('Ali — IA de Aliace','done','45 capacidades','Ventas por cliente, pagos, stock, cuentas por cobrar, libro mayor, etc.',3),
  ('Inteligencia de competencia (Impomin)','done','Prototipo que vigila precios automáticamente','En las tiendas online de la competencia.',0),
  ('Inteligencia de competencia (Impomin)','done','13 sitios operativos (de 4)','453 productos con nombre, precio, stock y enlace.',1),
  ('Inteligencia de competencia (Impomin)','done','Detecta promociones y cambios de precio','Los deja listos como alertas.',2),
  ('Inteligencia de competencia (Impomin)','doing','Activar capa minera','Modelo de camioneta, faena, kits. Se activa al sumar competidores reales.',3),
  ('Autos Intel','done','Base de 11.738 autos publicados','Desde ChileAutos y Yapo, con sus fotos.',0),
  ('Autos Intel','done','Apartado Oportunidades','La IA marca buen momento de comprar: excelente / buena / moderada.',1),
  ('Autos Intel','done','Panel en vivo','Enlaza a cada aviso en su tienda de origen.',2),
  ('Repositorio de documentos por empresa','done','Subir y ver documentos por empresa','Aliace, Mallorcautos, HN, Impomin, ACE, Food Expert.',0),
  ('Repositorio de documentos por empresa','done','Acepta imágenes, PDF y Office','Se ven dentro de la página sin descargar.',1),
  ('Repositorio de documentos por empresa','done','Compresión automática de imágenes','Al subir, para ahorrar espacio.',2),
  ('Repositorio de documentos por empresa','done','Publicado en producción','',3),
  ('App de scrapeo integrada al hub (SSO)','done','SSO con Forja','Se abre con la misma cuenta, sin volver a loguearse.',0),
  ('App de scrapeo integrada al hub (SSO)','done','Scraper automático programado','Corre solo mañana y noche.',1),
  ('Plataforma de cálculo de clínica','done','Ajuste a la operación real','Calza mejor con la operación de la clínica.',0),
  ('Plataforma de cálculo de clínica','done','IA de soporte','Asiste el uso y la operación día a día.',1),
  ('Carga de datos históricos','done','Carga de meses anteriores','La data histórica quedó dentro del sistema.',0),
  ('Carga de datos históricos','done','Historial real para métricas','Para medir cómo venimos y hacia dónde vamos.',1),
  ('Conexión multibancos','done','Página de conexión multibancos','Construida sobre Rails.',0),
  ('Conexión multibancos','done','Métricas financieras detalladas','',1),
  ('Conexión multibancos','done','Descarga de cartola','Directamente desde la página.',2),
  ('Conexión multibancos','todo','QA del conector bancario','Pendiente (próximos pasos del 05 jun).',3),
  ('Ali — agente de IA por WhatsApp (Alaice)','done','Agente de IA de Alaice','Responde por WhatsApp.',0),
  ('Ali — agente de IA por WhatsApp (Alaice)','done','Entrega los datos pedidos al toque','',1),
  ('Ali — agente de IA por WhatsApp (Alaice)','done','Mueve elementos de la página entre estados','',2),
  ('Ali — agente de IA por WhatsApp (Alaice)','todo','Métricas de adopción de Ali','Pendiente (próximos pasos del 05 jun).',3),
  ('Ailnest — correo inteligente','done','Detector de reuniones','Si el remitente quiere agendar, muestra solo el apartado para agendar.',0),
  ('Ailnest — correo inteligente','done','Crear correos con IA','Redactar y enviar sin fricción.',1),
  ('Ailnest — correo inteligente','doing','Filtrado de la bandeja','En trabajo.',2),
  ('Experiencia móvil (PWA)','done','Instalable como app','Ícono en la pantalla del teléfono.',0),
  ('Experiencia móvil (PWA)','done','Pantalla completa','Con sensación de app nativa.',1),
  ('Experiencia móvil (PWA)','todo','Pulido de la PWA','Pendiente (próximos pasos del 05 jun).',2),
  ('Dominios e infraestructura','done','Compra de dominios','Los dominios necesarios.',0),
  ('Dominios e infraestructura','done','nicojuri.com configurado','',1)
) as c(pname,col,title,descr,pos) on c.pname = pr.name;
