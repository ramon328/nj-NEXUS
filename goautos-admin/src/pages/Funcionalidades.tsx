import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useMotionValueEvent, MotionValue } from 'framer-motion';
import {
  Car,
  ShoppingCart,
  CreditCard,
  Users,
  Target,
  Share2,
  Mail,
  Globe,
  FileText,
  BarChart3,
  UserCog,
  Calendar,
  Settings,
  Shield,
  Check,
  ArrowRight,
  Zap,
  Clock,
  TrendingUp,
  Search,
  Image,
  FileSpreadsheet,
  DollarSign,
  Bell,
  Smartphone,
  Monitor,
  Tablet,
  Lock,
  RefreshCw,
  Upload,
  Filter,
  LayoutGrid,
  List,
  Percent,
  Receipt,
  UserPlus,
  Building2,
  ExternalLink,
  Brain,
  Palette,
  MousePointer,
  Layers,
  MessageSquare,
  Printer,
  PenTool,
  CheckCircle2,
  CircleDollarSign,
  Repeat,
  ChevronRight,
  ChevronDown,
  X,
  Rocket,
  BadgeCheck,
  Minus,
  Instagram,
  Facebook,
  Handshake,
  Download,
  Sparkles,
  BellRing,
  ClipboardList,
  Command,
  ShieldCheck,
  Wifi,
  Bot,
  SendHorizonal,
  GripVertical,
  Eye,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

// Apple-style easing - used throughout for consistent, premium feel
const appleEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// Function to generate PDF report - Professional clean style
const generatePDFReport = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 25;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }
  };

  const addTitle = (text: string, size: number, spacing = 8) => {
    checkPageBreak(size + spacing);
    doc.setFontSize(size);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(text, margin, y);
    y += spacing;
  };

  const addSubtitle = (text: string) => {
    checkPageBreak(12);
    y += 4;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(text, margin, y);
    y += 7;
  };

  const addParagraph = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentWidth);
    checkPageBreak(lines.length * 5);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 3;
  };

  const addBullet = (text: string, indent = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const bulletIndent = margin + indent;
    const textIndent = bulletIndent + 5;
    const lines = doc.splitTextToSize(text, contentWidth - indent - 5);
    checkPageBreak(lines.length * 4.5);
    doc.text('•', bulletIndent, y);
    doc.text(lines, textIndent, y);
    y += lines.length * 4.5 + 1;
  };

  const addBoldBullet = (label: string, text: string) => {
    // Simple approach: print label bold on its own line, then text as sub-bullet
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.setFont('helvetica', 'bold');
    checkPageBreak(10);
    doc.text('•', margin, y);
    doc.text(label, margin + 5, y);
    y += 4.5;

    // Text as indented content
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    const lines = doc.splitTextToSize(text, contentWidth - 10);
    checkPageBreak(lines.length * 4.5);
    doc.text(lines, margin + 8, y);
    y += lines.length * 4.5 + 2;
  };

  const addSeparator = () => {
    y += 3;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  // === TITLE PAGE ===
  y = 60;
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('GoAuto', margin, y);

  y += 12;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Plataforma Integral para Automotoras', margin, y);

  y += 25;
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100);
  doc.text('Informe de Funcionalidades', margin, y);
  doc.text(new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long' }), margin, y + 6);

  // === PAGE 2: RESUMEN ===
  doc.addPage();
  y = margin;

  addTitle('Resumen Ejecutivo', 18, 10);
  addParagraph('GoAuto es una plataforma integral de gestión diseñada específicamente para concesionarios de vehículos (automotoras). Centraliza todas las operaciones del negocio en un solo lugar: inventario, ventas, financiamiento, clientes, leads, marketing y presencia digital.');
  y += 5;

  // === SECTION 1 ===
  addSeparator();
  addTitle('1. Gestión de Inventario', 14, 8);

  addSubtitle('Panel de Vehículos');
  addBullet('Vista de tabla con columnas personalizables');
  addBullet('Vista Kanban tipo Trello con estados arrastrables');
  addBullet('Filtros avanzados: marca, modelo, año, precio, kilometraje, condición, combustible');
  addBullet('Búsqueda por patente, VIN o descripción');
  addBullet('Exportación a Excel del inventario completo');

  addSubtitle('Agregar Vehículos');
  addBoldBullet('Autocompletado por patente', 'ingresa la patente y el sistema completa automáticamente marca, modelo, año y más datos');
  addBullet('Formulario guiado paso a paso');
  addBullet('Carga de imagen principal y galería de fotos ilimitada');
  addBullet('Compresión automática de imágenes para optimizar almacenamiento');

  addSubtitle('Tipos de Adquisición');
  addBoldBullet('Compra directa', 'vehículos propios del concesionario');
  addBoldBullet('Consignación', 'vehículos de terceros con datos del consignador');
  addBoldBullet('Consignación con pago', 'consignación con adelanto al propietario');

  // === SECTION 2 ===
  addSeparator();
  addTitle('2. Gestión de Ventas', 14, 8);

  addSubtitle('Proceso de Venta Completo');
  addBullet('Selección del vehículo y cliente comprador');
  addBullet('Definición del precio de venta');
  addBullet('Registro de vehículo en parte de pago (trade-in) si aplica');
  addBullet('Definición de método de pago y desglose');
  addBullet('Cálculo automático de comisión del vendedor');
  addBullet('Generación de documento de venta');

  addSubtitle('Reservas');
  addBullet('Sistema de reservas con pago inicial');
  addBullet('Seguimiento de pagos adicionales');
  addBullet('Conversión de reserva a venta');

  // === SECTION 3 ===
  addSeparator();
  addTitle('3. Crédito Directo', 14, 8);

  addSubtitle('Gestión de Créditos');
  addBullet('Crear planes de financiamiento: cuota inicial, monto mensual, número de cuotas');
  addBullet('Cronograma visual de cuotas');
  addBullet('Estados: pendiente, pagado, atrasado');
  addBullet('Barra de progreso del crédito');
  addBullet('Cálculo de intereses por mora');
  addBullet('Alertas de pagos vencidos');

  // === SECTION 4 ===
  addSeparator();
  addTitle('4. Gestión de Clientes', 14, 8);
  addBullet('Registro completo: nombre, RUT, teléfono, email, dirección');
  addBullet('Información bancaria para pagos (consignadores)');
  addBullet('Historial de transacciones por cliente');
  addBullet('Importación masiva desde archivo Excel');
  addBullet('Tipos: Compradores, Vendedores/Consignadores, Prospectos');

  // === SECTION 5 ===
  addSeparator();
  addTitle('5. Gestión de Leads y Oportunidades', 14, 8);
  addBoldBullet('Compra directa', 'cliente quiere comprar un vehículo');
  addBoldBullet('Consignación', 'cliente quiere dejar vehículo en consignación');
  addBoldBullet('Búsqueda', 'cliente busca un vehículo específico');
  addBoldBullet('Venta', 'cliente quiere vender su vehículo');
  addBoldBullet('Financiamiento', 'cliente solicita información de crédito');
  y += 3;
  addBullet('Estados: pendiente, asignado, completado, cancelado');
  addBullet('Asignación a vendedores con notas e historial');
  addBullet('Captura automática desde sitio web');

  // === SECTION 6 ===
  addSeparator();
  addTitle('6. Integraciones con Redes Sociales y Marketplaces', 14, 8);

  addSubtitle('Instagram');
  addBullet('Conexión OAuth con cuenta de Instagram Business');
  addBullet('Publicar vehículos directamente desde el inventario');
  addBullet('Ver estadísticas de posts (likes, comentarios)');

  addSubtitle('Facebook Marketplace');
  addBullet('Publicar vehículos en Marketplace');
  addBullet('Sincronización automática de estado (disponible/vendido)');
  addBullet('CTA personalizable (WhatsApp, Messenger, Landing page)');

  addSubtitle('Mercado Libre');
  addBullet('Conexión OAuth con cuenta de vendedor');
  addBullet('Publicación automática de vehículos');
  addBullet('Renovación de publicaciones expiradas');

  // === SECTION 7 ===
  addSeparator();
  addTitle('7. Marketing y Campañas', 14, 8);
  addBullet('Campañas de email con selección de vehículo a promocionar');
  addBullet('Búsqueda inteligente de clientes con IA');
  addBullet('Filtros: umbral de similitud, tipo de cliente, rango de precio');
  addBullet('Tasador automático con IA: análisis de mercado en tiempo real');
  addBullet('Historial de campañas enviadas');

  // === SECTION 8 ===
  addSeparator();
  addTitle('8. Constructor de Sitio Web', 14, 8);
  addBullet('Editor visual Drag & Drop - construye tu sitio sin programar');
  addBullet('Secciones prediseñadas: Hero, Catálogo, Testimonios, FAQ, Mapa, Contacto');
  addBullet('Personalización de colores, logo, tema claro/oscuro');
  addBullet('Vista responsive (desktop, tablet, móvil)');
  addBullet('Catálogo de vehículos actualizado automáticamente');
  addBullet('Chat con IA para responder consultas');

  // === SECTION 9 ===
  addSeparator();
  addTitle('9. Documentos y Contratos', 14, 8);
  addBullet('Tipos: Compraventa, Consignación, Reserva, Cierre de negocio');
  addBullet('Plantillas personalizables con términos editables');
  addBullet('Campos autocompletados con datos del vehículo y cliente');
  addBullet('Generación automática de documentos');

  // === SECTION 10 ===
  addSeparator();
  addTitle('10. Dashboard y Reportes', 14, 8);
  addBullet('KPIs en tiempo real: vehículos en stock, ventas del mes, clientes nuevos');
  addBullet('Gráfico de tendencia de ventas');
  addBullet('Distribución de vehículos por estado y categoría');
  addBullet('Análisis de rendimiento y comisiones por vendedor');
  addBullet('Registro de gastos operacionales');

  // === SECTION 11 ===
  addSeparator();
  addTitle('11. Gestión de Equipo', 14, 8);
  addBoldBullet('Superadmin', 'acceso total al sistema, gestión de clientes');
  addBoldBullet('Admin', 'gestión completa del concesionario, usuarios, configuración');
  addBoldBullet('Vendedor', 'gestión de vehículos asignados, clientes, ventas propias');

  // === SECTION 12 ===
  addSeparator();
  addTitle('12. Agendamientos Públicos', 14, 8);
  addBullet('Formulario público para que clientes agenden visitas desde tu sitio web');
  addBullet('Confirmación, rechazo y reagendamiento de citas');
  addBullet('Integración con calendario unificado');
  addBullet('Notificaciones automáticas al equipo');
  addBullet('Asociación con vehículo de interés');
  addBullet('Estados: Pendiente, Confirmada, Cancelada');

  // === SECTION 13 ===
  addSeparator();
  addTitle('13. Calendario Unificado', 14, 8);
  addBullet('Vista mensual con todos los eventos del negocio');
  addBullet('Fuentes unificadas: tareas, solicitudes, agendamientos, eventos manuales');
  addBullet('Filtros por tipo de fuente');
  addBullet('Creación rápida de eventos desde el calendario');
  addBullet('Panel lateral con detalle del día y resumen del mes');
  addBullet('Responsive: dots en móvil, previews en desktop');

  // === SECTION 14 ===
  addSeparator();
  addTitle('14. Gestión de Tareas', 14, 8);
  addBullet('Crear tareas con título, descripción y fecha límite');
  addBullet('Asignación a cualquier miembro del equipo');
  addBullet('Prioridades: baja, media, alta, urgente');
  addBullet('Estados: pendiente, en progreso, completada');
  addBullet('Integración automática con el calendario');
  addBullet('Notificaciones al asignado');

  // === SECTION 15 ===
  addSeparator();
  addTitle('15. Checklist por Vehículo', 14, 8);
  addBullet('Lista de verificación por categorías: mecánica, estética, documentos, extras');
  addBullet('Items configurables por el administrador');
  addBullet('Progreso visual con barra por vehículo');
  addBullet('Historial de quién marcó cada item');
  addBullet('Visible en el detalle de cada vehículo');

  // === SECTION 16 ===
  addSeparator();
  addTitle('16. Configuración', 14, 8);
  addBullet('Nombre del concesionario, logo, tema de colores');
  addBullet('Múltiples sucursales con direcciones y horarios');
  addBullet('Estados de vehículos personalizables');
  addBullet('Información legal: razón social, RUT, representante');

  // === SECTION 17 ===
  addSeparator();
  addTitle('17. Suscripción y Pagos', 14, 8);
  addBullet('Pago mensual o anual con Mercado Pago');
  addBullet('Trial de 7 días para nuevos clientes');
  addBullet('Gestión de suscripción e historial de pagos');

  // === BENEFITS ===
  addSeparator();
  addTitle('Resumen de Beneficios', 14, 8);
  addBoldBullet('Todo en uno', 'inventario, ventas, clientes, marketing y sitio web en una sola plataforma');
  addBoldBullet('Ahorro de tiempo', 'automatización de tareas repetitivas');
  addBoldBullet('Más ventas', 'publicación multi-canal y marketing inteligente');
  addBoldBullet('Control total', 'dashboard con métricas en tiempo real');
  addBoldBullet('Profesionalismo', 'sitio web propio y documentos profesionales');
  addBoldBullet('Escalabilidad', 'desde 1 vehículo hasta inventarios ilimitados');

  // === CONTACT ===
  y += 10;
  addSeparator();
  addTitle('Contacto', 14, 8);
  addParagraph('WhatsApp: +56 9 8990 4038');
  addParagraph('Email: contacto@goauto.cl');
  addParagraph('Web: https://goauto.cl');

  // === FOOTER ON ALL PAGES ===
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`${i} / ${totalPages}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
    if (i > 1) {
      doc.text('GoAuto - Plataforma Integral para Automotoras', margin, pageHeight - 15);
    }
  }

  doc.save('GoAuto-Informe-Funcionalidades.pdf');
};

// Animated counter with intersection observer
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 1500;
          const steps = 40;
          const increment = value / steps;
          let current = 0;

          const timer = setInterval(() => {
            current += increment;
            if (current >= value) {
              setCount(value);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, hasAnimated]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

// Subtle floating animation
const FloatingElement = ({ children, delay = 0, duration = 4 }: { children: React.ReactNode; delay?: number; duration?: number }) => (
  <motion.div
    animate={{ y: [0, -8, 0] }}
    transition={{
      duration,
      repeat: Infinity,
      delay,
      ease: 'easeInOut',
    }}
  >
    {children}
  </motion.div>
);

// 3D Card with pronounced rotation effect
const Card3D = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  // Higher stiffness = faster response, lower damping = less latency
  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 20 });

  // Rotation follows mouse position intuitively
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['5deg', '-5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-5deg', '5deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <div
      style={{ perspective: '1000px' }}
      className={cn('relative', className)}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          transformOrigin: 'center center',
        }}
        animate={{
          scale: isHovered ? 1.01 : 1,
        }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative cursor-pointer"
      >
        <div
          className="absolute inset-0 rounded-[20px] transition-shadow duration-150 pointer-events-none"
          style={{
            boxShadow: isHovered
              ? '0 30px 60px -15px rgba(0,0,0,0.25)'
              : '0 20px 40px -15px rgba(0,0,0,0.12)',
          }}
        />
        {children}
      </motion.div>
    </div>
  );
};

// Animated Dashboard Preview - Apple Style
const DashboardPreview = () => {
  const [activeVehicle, setActiveVehicle] = useState(0);
  const vehicles = [
    { marca: 'Toyota', modelo: 'Hilux 2024', precio: 18990000, estado: 'Disponible', km: '0 km' },
    { marca: 'Hyundai', modelo: 'Tucson 2023', precio: 15990000, estado: 'Reservado', km: '12.000 km' },
    { marca: 'Kia', modelo: 'Sportage 2024', precio: 14500000, estado: 'Disponible', km: '5.000 km' },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveVehicle((prev) => (prev + 1) % vehicles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: appleEase }}
      className="relative"
    >
      <Card3D className="w-full max-w-[520px] mx-auto">
        {/* Main Dashboard Card */}
        <div className="bg-white rounded-[20px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-200/60 overflow-hidden">
          {/* macOS Style Header */}
          <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3 flex items-center border-b border-slate-200/80">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
              <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-[13px] font-medium text-slate-500">GoAuto Dashboard</span>
            </div>
            <div className="w-14" />
          </div>

          {/* Dashboard Content */}
          <div className="p-5 space-y-5 bg-[#f5f5f7]">
            {/* Stats Cards Row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Vehículos', value: '24', change: '+3', trend: 'up' },
                { label: 'Ventas', value: '$48M', change: '+12%', trend: 'up' },
                { label: 'Leads', value: '15', change: '+5', trend: 'up' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.08, duration: 0.5, ease: appleEase }}
                  className="bg-white rounded-xl p-3.5 shadow-sm"
                >
                  <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{stat.label}</div>
                  <div className="text-2xl font-semibold text-slate-900 mt-1">{stat.value}</div>
                  <div className="text-[11px] font-medium text-emerald-500 mt-0.5">{stat.change}</div>
                </motion.div>
              ))}
            </div>

            {/* Vehicle List Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.85, duration: 0.5, ease: appleEase }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-[13px] font-semibold text-slate-900">Inventario reciente</span>
              </div>
              <div className="divide-y divide-slate-100">
                {vehicles.map((v, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      backgroundColor: activeVehicle === i ? '#f0f9ff' : '#ffffff',
                    }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        activeVehicle === i ? "bg-blue-500" : "bg-slate-100"
                      )}>
                        <Car className={cn("h-5 w-5", activeVehicle === i ? "text-white" : "text-slate-500")} />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-slate-900">{v.marca} {v.modelo}</div>
                        <div className="text-[11px] text-slate-400">{v.km}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[13px] font-semibold text-slate-900">${(v.precio / 1000000).toFixed(1)}M</div>
                      <div className={cn(
                        "text-[10px] font-medium",
                        v.estado === 'Disponible' ? "text-emerald-500" : "text-amber-500"
                      )}>
                        {v.estado}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Chart Card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.05, duration: 0.5, ease: appleEase }}
              className="bg-white rounded-xl shadow-sm p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-semibold text-slate-900">Ventas mensuales</span>
                <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">+23%</span>
              </div>
              <div className="flex items-end gap-2 h-16">
                {[35, 55, 40, 70, 50, 85, 65].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: 1.25 + i * 0.06, duration: 0.5, ease: appleEase }}
                    className={cn(
                      "flex-1 rounded-md",
                      i === 5 ? "bg-blue-500" : "bg-slate-200"
                    )}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                <span>Ene</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Abr</span>
                <span>May</span>
                <span>Jun</span>
                <span>Jul</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Subtle Shadow/Glow */}
        <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/50 to-purple-100/30 blur-3xl -z-10 rounded-3xl opacity-60" />
      </Card3D>

      {/* Floating Notification - Top Right */}
      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.4, duration: 0.6, ease: appleEase }}
        className="absolute -top-3 -right-6 hidden xl:block"
      >
        <FloatingElement delay={0} duration={4}>
          <div className="bg-white rounded-2xl shadow-lg px-4 py-3 border border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-full flex items-center justify-center">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-slate-900">Venta completada</div>
              <div className="text-[11px] text-slate-400">Hilux 2024 • $18.9M</div>
            </div>
          </div>
        </FloatingElement>
      </motion.div>

      {/* Floating Notification - Bottom Left */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: 10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 1.6, duration: 0.6, ease: appleEase }}
        className="absolute -bottom-2 -left-8 hidden xl:block"
      >
        <FloatingElement delay={1.5} duration={3.5}>
          <div className="bg-slate-900 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-[12px] font-semibold text-white">Nuevo lead</div>
              <div className="text-[11px] text-slate-400">Busca SUV familiar</div>
            </div>
          </div>
        </FloatingElement>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// SCROLL-DRIVEN SHOWCASE COMPONENTS
// ============================================

// Data for the 5 main features in showcase
const showcaseFeatures = [
  {
    id: 'inventario',
    icon: Car,
    title: 'Gestión de Inventario',
    description: 'Control total de tu stock con vistas Kanban, filtros avanzados y estados personalizables.',
    gradient: 'from-blue-500 to-blue-600',
    highlights: ['Vista Kanban arrastrables', 'Autocompletado por patente', 'Galería de fotos ilimitada', 'Exportación a Excel'],
  },
  {
    id: 'ventas',
    icon: ShoppingCart,
    title: 'Gestión de Ventas',
    description: 'Proceso completo y automatizado desde el vehículo hasta el documento final.',
    gradient: 'from-emerald-500 to-emerald-600',
    highlights: ['Flujo paso a paso guiado', 'Trade-in integrado', 'Comisiones automáticas', 'Documentos pre-llenados'],
  },
  {
    id: 'credito',
    icon: CreditCard,
    title: 'Crédito Directo',
    description: 'Ofrece financiamiento propio con cronogramas y seguimiento de pagos.',
    gradient: 'from-violet-500 to-violet-600',
    highlights: ['Planes personalizados', 'Cronograma visual', 'Alertas de pagos', 'Cálculo de intereses'],
  },
  {
    id: 'leads',
    icon: Target,
    title: 'Leads y Oportunidades',
    description: 'Captura automática desde tu sitio web y gestión con pipeline visual.',
    gradient: 'from-rose-500 to-rose-600',
    highlights: ['Captura automática', 'Pipeline visual', 'Asignación a vendedores', 'Historial completo'],
  },
  {
    id: 'integraciones',
    icon: Share2,
    title: 'Integraciones Sociales',
    description: 'Publica en Instagram, Facebook Marketplace y Mercado Libre con un clic.',
    gradient: 'from-pink-500 to-pink-600',
    highlights: ['Instagram Business', 'Facebook Marketplace', 'Mercado Libre', 'Sincronización automática'],
  },
];

// Estado 1: Inventario - Con animaciones sutiles
const InventarioState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 relative"
    >
      {/* Floating element for 3D feel */}
      <motion.div
        className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500/10 rounded-full blur-sm"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-900">Inventario</span>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 500 }}
          className="text-[11px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium"
        >
          +3 nuevos
        </motion.span>
      </div>

      {/* Kanban States */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { estado: 'Disponible', count: 12, color: 'bg-emerald-500' },
          { estado: 'Reservado', count: 5, color: 'bg-amber-500' },
          { estado: 'Vendido', count: 7, color: 'bg-slate-400' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 300 }}
            whileHover={{ y: -2, scale: 1.02 }}
            className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm cursor-pointer"
          >
            <motion.div
              className={cn("w-3 h-3 rounded-full mb-2", item.color)}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ delay: 0.5 + i * 0.2, duration: 0.4 }}
            />
            <span className="text-[11px] text-slate-500">{item.estado}</span>
            <div className="text-xl font-semibold text-slate-900">{item.count}</div>
          </motion.div>
        ))}
      </div>

      {/* Vehicle List */}
      <div className="space-y-2">
        {[
          { name: 'Toyota Hilux 2024', km: '0 km', status: 'emerald', isNew: true },
          { name: 'Hyundai Tucson', km: '12.000 km', status: 'amber', isNew: false },
          { name: 'Kia Sportage', km: '5.000 km', status: 'emerald', isNew: false },
        ].map((v, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1, type: "spring", stiffness: 200 }}
            whileHover={{ x: 4, backgroundColor: "rgba(248, 250, 252, 1)" }}
            className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-slate-200/60 shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <motion.div
                className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center"
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.3 }}
              >
                <Car className="h-4 w-4 text-slate-500" />
              </motion.div>
              <div>
                <div className="text-[13px] font-medium text-slate-900 flex items-center gap-2">
                  {v.name}
                  {v.isNew && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.6, type: "spring" }}
                      className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full"
                    >
                      NUEVO
                    </motion.span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400">{v.km}</div>
              </div>
            </div>
            <motion.div
              className={cn("w-2.5 h-2.5 rounded-full", v.status === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500')}
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ delay: 0.8 + i * 0.15, duration: 0.3 }}
            />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Estado 2: Ventas - Con animaciones
const VentasState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 relative"
    >
      {/* Floating particles */}
      <motion.div
        className="absolute top-0 right-4 w-6 h-6 bg-emerald-500/10 rounded-full"
        animate={{ y: [0, -8, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-10 left-2 w-4 h-4 bg-emerald-500/10 rounded-full"
        animate={{ y: [0, -6, 0], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-900">Proceso de Venta</span>
        <motion.span
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-[11px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium"
        >
          Paso 3 de 4
        </motion.span>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-between px-2">
        {['Vehículo', 'Cliente', 'Precio', 'Pago'].map((step, i) => (
          <React.Fragment key={i}>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.15, type: "spring", stiffness: 300 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                  i < 3 ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                )}
                whileHover={{ scale: 1.1 }}
              >
                {i < 3 ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.3 + i * 0.15, type: "spring" }}
                  >
                    <Check className="h-5 w-5" />
                  </motion.div>
                ) : (
                  <motion.span
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {i + 1}
                  </motion.span>
                )}
              </motion.div>
              <span className="text-[11px] text-slate-500 mt-1.5">{step}</span>
            </motion.div>
            {i < 3 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.2 + i * 0.15, duration: 0.4 }}
                className={cn("flex-1 h-1 mx-1 rounded-full origin-left", i < 2 ? 'bg-emerald-500' : 'bg-slate-200')}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Sale Detail */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.01 }}
        className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm"
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="text-[14px] font-semibold text-slate-900">Toyota Hilux 2024</div>
            <div className="text-[12px] text-slate-400">0 km • Disponible</div>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="text-right"
          >
            <div className="text-[18px] font-bold text-emerald-600">$18.9M</div>
            <div className="text-[11px] text-slate-400">Precio venta</div>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="pt-3 border-t border-slate-100"
        >
          <div className="flex justify-between text-[12px]">
            <span className="text-slate-500">Cliente: Juan Pérez</span>
            <motion.span
              animate={{ color: ["#10b981", "#059669", "#10b981"] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="font-medium"
            >
              Comisión: $285.000
            </motion.span>
          </div>
        </motion.div>
      </motion.div>

      {/* Success */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.9, type: "spring" }}
        className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-3 flex items-center gap-3 text-white overflow-hidden relative"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 1.2, repeat: 2 }}
          className="text-2xl"
        >
          🎉
        </motion.span>
        <div className="text-[13px] font-medium">¡Venta casi completa!</div>
      </motion.div>
    </motion.div>
  );
};

// Estado 3: Crédito - Con animaciones
const CreditoState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 relative"
    >
      {/* Floating orbs */}
      <motion.div
        className="absolute -top-1 right-6 w-5 h-5 bg-violet-500/10 rounded-full"
        animate={{ y: [0, -6, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-900">Crédito Directo</span>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="text-[11px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium"
        >
          6 cuotas
        </motion.span>
      </div>

      {/* Progress */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm"
      >
        <div className="flex justify-between items-center mb-3">
          <span className="text-[13px] font-medium text-slate-900">Progreso del crédito</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-[18px] font-bold text-violet-600"
          >
            60%
          </motion.span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "60%" }}
            transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 1.3 }}
            />
          </motion.div>
        </div>
        <div className="flex justify-between mt-2 text-[11px] text-slate-400">
          <span>$5.4M pagado</span>
          <span>$3.6M pendiente</span>
        </div>
      </motion.div>

      {/* Payment Schedule */}
      <div className="space-y-1.5">
        {[
          { month: 'Ene', status: 'paid' },
          { month: 'Feb', status: 'paid' },
          { month: 'Mar', status: 'paid' },
          { month: 'Abr', status: 'current' },
          { month: 'May', status: 'pending' },
          { month: 'Jun', status: 'pending' },
        ].map((payment, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 200 }}
            whileHover={{ x: 3, scale: 1.01 }}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer",
              payment.status === 'current'
                ? 'bg-violet-50 border-2 border-violet-300'
                : 'bg-white border border-slate-200/60'
            )}
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  payment.status === 'paid' ? 'bg-emerald-500' : payment.status === 'current' ? 'bg-violet-500' : 'bg-slate-200'
                )}
              >
                {payment.status === 'paid' ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : payment.status === 'current' ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Clock className="h-3.5 w-3.5 text-white" />
                  </motion.div>
                ) : (
                  <span className="text-[10px] text-slate-400">{i + 1}</span>
                )}
              </motion.div>
              <span className="text-[12px] text-slate-600">{payment.month} 2024</span>
            </div>
            <span className={cn(
              "text-[11px] font-medium",
              payment.status === 'paid' ? 'text-emerald-600' : payment.status === 'current' ? 'text-violet-600' : 'text-slate-400'
            )}>
              {payment.status === 'paid' ? '✓ Pagado' : payment.status === 'current' ? 'Próximo' : '$900k'}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Alert */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, type: "spring" }}
        className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-3 flex items-center gap-3 text-white relative overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
        />
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 2 }}
        >
          <Bell className="h-5 w-5" />
        </motion.div>
        <div className="text-[12px]">
          <div className="font-semibold">Próximo pago: 15 Abril</div>
          <div className="text-amber-100">Cuota $900.000</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Estado 4: Leads - Con animaciones
const LeadsState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 relative"
    >
      {/* Floating elements */}
      <motion.div
        className="absolute top-2 right-2 w-4 h-4 bg-rose-500/10 rounded-full"
        animate={{ y: [0, -5, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 left-0 w-3 h-3 bg-amber-500/10 rounded-full"
        animate={{ y: [0, -4, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-900">Pipeline de Leads</span>
        <motion.span
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
          className="text-[11px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium"
        >
          +2 nuevos
        </motion.span>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { title: 'Nuevos', count: 5, color: '#f43f5e', bgColor: 'bg-rose-50', leads: ['María G.', 'Pedro L.'] },
          { title: 'Contactado', count: 3, color: '#f59e0b', bgColor: 'bg-amber-50', leads: ['Ana M.'] },
          { title: 'Cerrado', count: 8, color: '#10b981', bgColor: 'bg-emerald-50', leads: ['Juan P.'] },
        ].map((col, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.1, type: "spring", stiffness: 250 }}
            whileHover={{ y: -2, scale: 1.02 }}
            className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <motion.div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: col.color }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.3 }}
              />
              <span className="text-[11px] font-medium text-slate-600">{col.title}</span>
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 + i * 0.1, type: "spring" }}
                className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full ml-auto font-semibold"
              >
                {col.count}
              </motion.span>
            </div>
            <div className="space-y-1.5">
              {col.leads.map((lead, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 + j * 0.1, type: "spring" }}
                  whileHover={{ x: 2 }}
                  className={cn("rounded-lg px-2.5 py-2 text-[11px] text-slate-600 cursor-pointer", col.bgColor)}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium">
                      {lead.split(' ')[0][0]}{lead.split(' ')[1]?.[0] || ''}
                    </div>
                    {lead}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* New Lead Notification */}
      <motion.div
        initial={{ opacity: 0, y: 15, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.6, type: "spring" }}
        className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl p-4 text-white relative overflow-hidden"
      >
        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
        />
        <div className="flex items-center gap-3 relative">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
          >
            <Target className="h-5 w-5" />
          </motion.div>
          <div>
            <div className="text-[13px] font-semibold flex items-center gap-2">
              Nuevo lead capturado
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-white"
              />
            </div>
            <div className="text-[12px] text-rose-100">Busca SUV familiar • Desde sitio web</div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Estado 5: Integraciones - Con animaciones
const IntegracionesState = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-4 relative"
    >
      {/* Floating sync particles */}
      <motion.div
        className="absolute top-4 right-8 w-3 h-3 bg-emerald-500/20 rounded-full"
        animate={{ y: [0, -8, 0], x: [0, 3, 0], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-12 left-4 w-2 h-2 bg-pink-500/20 rounded-full"
        animate={{ y: [0, -5, 0], scale: [1, 1.3, 1] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      />

      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-slate-900">Integraciones</span>
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            />
          ))}
          <span className="text-[11px] text-emerald-600 font-medium ml-1">Conectadas</span>
        </motion.div>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            name: 'Instagram',
            color: 'from-purple-500 via-pink-500 to-orange-400',
            icon: <Instagram className="w-5 h-5 text-white" />,
            posts: 24
          },
          {
            name: 'Facebook',
            color: 'from-blue-600 to-blue-400',
            icon: <Facebook className="w-5 h-5 text-white" />,
            posts: 18
          },
          {
            name: 'Mercadolibre',
            color: 'from-yellow-400 to-yellow-500',
            icon: <Handshake className="w-5 h-5 text-white" />,
            posts: 32
          },
        ].map((platform, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8, rotateY: -30 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ delay: i * 0.12, type: "spring", stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -3 }}
            className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm text-center cursor-pointer relative"
          >
            {/* Connection indicator */}
            <motion.div
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            />
            <motion.div
              whileHover={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 0.3 }}
              className={cn("w-11 h-11 rounded-xl bg-gradient-to-br mx-auto mb-2 flex items-center justify-center shadow-lg", platform.color)}
            >
              {platform.icon}
            </motion.div>
            <div className="text-[11px] font-medium text-slate-600">{platform.name}</div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="text-[16px] font-bold text-slate-900"
            >
              {platform.posts}
            </motion.div>
            <div className="text-[9px] text-slate-400">publicaciones</div>
          </motion.div>
        ))}
      </div>

      {/* Sync Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium text-slate-900">Sincronización</span>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw className="h-4 w-4 text-emerald-500" />
            </motion.div>
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-[11px] text-emerald-600 font-semibold"
            >
              LIVE
            </motion.span>
          </div>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 0.5, duration: 1.2, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 1.5 }}
            />
          </motion.div>
        </div>
      </motion.div>

      {/* Success Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.7, type: "spring" }}
        className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-white relative overflow-hidden"
      >
        {/* Shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1 }}
        />
        <div className="flex items-center gap-3 relative">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center"
          >
            <Check className="h-5 w-5" />
          </motion.div>
          <div>
            <div className="text-[13px] font-semibold">Publicado en 3 canales</div>
            <div className="text-[12px] text-slate-400">Toyota Hilux 2024 • Hace 5 min</div>
          </div>
          <motion.span
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1, type: "spring", stiffness: 300 }}
            className="ml-auto text-2xl"
          >
            🚀
          </motion.span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Transforming Dashboard Component
const TransformingDashboard = ({ progress }: { progress: MotionValue<number> }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(progress, "change", (v) => {
    // Calculate active index: 0-0.2 = 0, 0.2-0.4 = 1, etc.
    // Add small offset to prevent flickering at boundaries
    const newIndex = Math.min(4, Math.floor(v * 5 + 0.001));
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  });

  return (
    <Card3D className="w-full max-w-[480px]">
      <div className="bg-white rounded-[20px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-200/60 overflow-hidden">
        {/* macOS Style Header */}
        <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3 flex items-center border-b border-slate-200/80">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-[13px] font-medium text-slate-500">GoAuto Dashboard</span>
          </div>
          <div className="w-14" />
        </div>

        {/* Content that morphs */}
        <div className="p-5 bg-[#f5f5f7] min-h-[420px]">
          <AnimatePresence mode="wait">
            {activeIndex === 0 && <InventarioState key="inv" />}
            {activeIndex === 1 && <VentasState key="ven" />}
            {activeIndex === 2 && <CreditoState key="cre" />}
            {activeIndex === 3 && <LeadsState key="lea" />}
            {activeIndex === 4 && <IntegracionesState key="int" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Glow Effect */}
      <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/40 to-purple-100/30 blur-3xl -z-10 rounded-3xl opacity-60" />
    </Card3D>
  );
};

// Feature Text Block
const FeatureTextBlock = ({
  feature,
  index,
  progress
}: {
  feature: typeof showcaseFeatures[0];
  index: number;
  progress: MotionValue<number>;
}) => {
  // Each feature occupies 20% of the scroll (5 features = 100%)
  // Transitions overlap slightly for smooth morph
  const segmentSize = 1 / 5; // 0.2
  const transitionZone = 0.05; // 5% overlap

  const start = Math.max(0, index * segmentSize - transitionZone);
  const activeStart = index * segmentSize;
  const activeEnd = (index + 1) * segmentSize;
  const end = Math.min(1, (index + 1) * segmentSize + transitionZone);

  // First feature starts fully visible, last feature stays visible at end
  const opacityRange = index === 0
    ? [1, 1, 0]
    : index === 4
      ? [0, 1, 1]
      : [0, 1, 0];

  const opacity = useTransform(
    progress,
    index === 0
      ? [0, activeEnd - transitionZone, activeEnd + transitionZone]
      : index === 4
        ? [activeStart - transitionZone, activeStart + transitionZone, 1]
        : [start, (activeStart + activeEnd) / 2, end],
    opacityRange
  );

  const y = useTransform(
    progress,
    [start, (activeStart + activeEnd) / 2, end],
    [30, 0, -30]
  );

  const scale = useTransform(
    progress,
    [start, (activeStart + activeEnd) / 2, end],
    [0.97, 1, 0.97]
  );

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className="absolute inset-0 flex flex-col justify-center"
    >
      {/* Badge */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", feature.gradient)}>
          <feature.icon className="h-7 w-7 text-white" />
        </div>
        <span className="text-sm text-slate-400 uppercase tracking-wider font-medium">
          {index + 1} de 5
        </span>
      </div>

      {/* Title */}
      <h2 className="text-[2.5rem] lg:text-[3rem] font-semibold text-slate-900 tracking-tight leading-[1.1] mb-4">
        {feature.title}
      </h2>

      {/* Description */}
      <p className="text-xl text-slate-500 mb-8 leading-relaxed max-w-md">
        {feature.description}
      </p>

      {/* Highlights */}
      <ul className="space-y-3">
        {feature.highlights.map((h, i) => (
          <li key={i} className="flex items-center gap-3 text-slate-600">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-3 w-3 text-emerald-600" />
            </div>
            <span className="text-[16px]">{h}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

// Feature Text Block Simple (uses activeIndex directly)
const FeatureTextBlockSimple = ({
  feature,
  index,
  activeIndex
}: {
  feature: typeof showcaseFeatures[0];
  index: number;
  activeIndex: number;
}) => {
  const isActive = index === activeIndex;

  return (
    <motion.div
      initial={false}
      animate={{
        opacity: isActive ? 1 : 0,
        y: isActive ? 0 : (index < activeIndex ? -30 : 30),
        scale: isActive ? 1 : 0.95,
      }}
      transition={{ duration: 0.5, ease: appleEase }}
      className="absolute inset-0 flex flex-col justify-center"
      style={{ pointerEvents: isActive ? 'auto' : 'none' }}
    >
      {/* Badge */}
      <div className="flex items-center gap-3 mb-6">
        <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", feature.gradient)}>
          <feature.icon className="h-7 w-7 text-white" />
        </div>
        <span className="text-sm text-slate-400 uppercase tracking-wider font-medium">
          {index + 1} de 5
        </span>
      </div>

      {/* Title */}
      <h2 className="text-[2.5rem] lg:text-[3rem] font-semibold text-slate-900 tracking-tight leading-[1.1] mb-4">
        {feature.title}
      </h2>

      {/* Description */}
      <p className="text-xl text-slate-500 mb-8 leading-relaxed max-w-md">
        {feature.description}
      </p>

      {/* Highlights */}
      <ul className="space-y-3">
        {feature.highlights.map((h, i) => (
          <li key={i} className="flex items-center gap-3 text-slate-600">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="h-3 w-3 text-emerald-600" />
            </div>
            <span className="text-[16px]">{h}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

// Transforming Dashboard Simple (uses activeIndex directly)
const TransformingDashboardSimple = ({ activeIndex }: { activeIndex: number }) => {
  return (
    <Card3D className="w-full max-w-[480px]">
      <div className="bg-white rounded-[20px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.2)] border border-slate-200/60 overflow-hidden">
        {/* macOS Style Header */}
        <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3 flex items-center border-b border-slate-200/80">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <div className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-[13px] font-medium text-slate-500">GoAuto Dashboard</span>
          </div>
          <div className="w-14" />
        </div>

        {/* Content that morphs */}
        <div className="p-5 bg-[#f5f5f7] min-h-[420px]">
          <AnimatePresence mode="wait">
            {activeIndex === 0 && <InventarioState key="inv" />}
            {activeIndex === 1 && <VentasState key="ven" />}
            {activeIndex === 2 && <CreditoState key="cre" />}
            {activeIndex === 3 && <LeadsState key="lea" />}
            {activeIndex === 4 && <IntegracionesState key="int" />}
          </AnimatePresence>
        </div>
      </div>

      {/* Glow Effect */}
      <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/40 to-purple-100/30 blur-3xl -z-10 rounded-3xl opacity-60" />
    </Card3D>
  );
};

// Progress Dots Simple (uses activeIndex directly)
const ProgressDotsSimple = ({ activeIndex }: { activeIndex: number }) => {
  return (
    <div className="absolute bottom-0 left-0 flex gap-2">
      {showcaseFeatures.map((_, i) => (
        <motion.div
          key={i}
          animate={{
            width: i === activeIndex ? 32 : 8,
            backgroundColor: i === activeIndex ? '#0f172a' : '#cbd5e1'
          }}
          transition={{ duration: 0.3, ease: appleEase }}
          className="h-2 rounded-full"
        />
      ))}
    </div>
  );
};

// Showcase Feature Block - Each feature gets its own section with dashboard
const ShowcaseFeatureBlock = ({
  feature,
  index,
  isReversed = false
}: {
  feature: typeof showcaseFeatures[0];
  index: number;
  isReversed?: boolean;
}) => {
  const states = [InventarioState, VentasState, CreditoState, LeadsState, IntegracionesState];
  const ActiveState = states[index];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.6, ease: appleEase }}
      className={cn(
        "grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20 lg:py-32",
        isReversed && "lg:grid-flow-col-dense"
      )}
    >
      {/* Text Content */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7, delay: 0.1, ease: appleEase }}
        className={cn(isReversed && "lg:col-start-2")}
      >
        {/* Badge */}
        <div className="flex items-center gap-3 mb-6">
          <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg", feature.gradient)}>
            <feature.icon className="h-7 w-7 text-white" />
          </div>
          <span className="text-sm text-slate-400 uppercase tracking-wider font-medium">
            {index + 1} de 5
          </span>
        </div>

        {/* Title */}
        <h2 className="text-[2rem] lg:text-[2.75rem] font-semibold text-slate-900 tracking-tight leading-[1.1] mb-4">
          {feature.title}
        </h2>

        {/* Description */}
        <p className="text-lg lg:text-xl text-slate-500 mb-8 leading-relaxed max-w-md">
          {feature.description}
        </p>

        {/* Highlights */}
        <ul className="space-y-3">
          {feature.highlights.map((h, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1, ease: appleEase }}
              className="flex items-center gap-3 text-slate-600"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3 text-emerald-600" />
              </div>
              <span className="text-[15px] lg:text-[16px]">{h}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>

      {/* Dashboard Preview */}
      <motion.div
        initial={{ opacity: 0, x: isReversed ? -30 : 30, scale: 0.95 }}
        whileInView={{ opacity: 1, x: 0, scale: 1 }}
        viewport={{ once: true, margin: "-10%" }}
        transition={{ duration: 0.7, delay: 0.2, ease: appleEase }}
        className={cn("flex justify-center", isReversed && "lg:col-start-1")}
      >
        <Card3D className="w-full max-w-[420px]">
          <div className="bg-white rounded-[20px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-200/60 overflow-hidden">
            {/* macOS Style Header */}
            <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-2.5 flex items-center border-b border-slate-200/80">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1 text-center">
                <span className="text-[12px] font-medium text-slate-500">GoAuto</span>
              </div>
              <div className="w-10" />
            </div>

            {/* Content */}
            <div className="p-4 bg-[#f5f5f7] min-h-[380px]">
              <ActiveState />
            </div>
          </div>

          {/* Glow Effect */}
          <div className={cn(
            "absolute -inset-4 blur-3xl -z-10 rounded-3xl opacity-40",
            feature.gradient.replace('from-', 'bg-gradient-to-br from-').replace('to-', '/30 to-') + '/20'
          )} />
        </Card3D>
      </motion.div>
    </motion.div>
  );
};

// Main Features Showcase - Simple scroll sections
const ScrollDrivenShowcase = () => {
  return (
    <section className="hidden lg:block bg-[#fbfbfd] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: appleEase }}
          className="text-center mb-16"
        >
          <h2 className="text-[2rem] sm:text-[2.5rem] font-semibold text-slate-900 tracking-tight mb-4">
            Todo lo que necesitas
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            Gestiona tu automotora de principio a fin con herramientas diseñadas para vender más
          </p>
        </motion.div>

        {/* Feature Sections */}
        {showcaseFeatures.map((feature, i) => (
          <ShowcaseFeatureBlock
            key={feature.id}
            feature={feature}
            index={i}
            isReversed={i % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
};

// Mobile Carousel Component
const MobileCarousel = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-play
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 5);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const states = [InventarioState, VentasState, CreditoState, LeadsState, IntegracionesState];
  const ActiveState = states[activeIndex];

  return (
    <section className="lg:hidden py-16 px-4 bg-[#fbfbfd]">
      {/* Feature Info */}
      <motion.div
        key={activeIndex}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br mx-auto mb-4 flex items-center justify-center shadow-lg", showcaseFeatures[activeIndex].gradient)}>
          {React.createElement(showcaseFeatures[activeIndex].icon, { className: "h-7 w-7 text-white" })}
        </div>
        <h2 className="text-2xl font-semibold text-slate-900 mb-2">
          {showcaseFeatures[activeIndex].title}
        </h2>
        <p className="text-slate-500 max-w-sm mx-auto">
          {showcaseFeatures[activeIndex].description}
        </p>
      </motion.div>

      {/* Dashboard */}
      <div className="max-w-sm mx-auto">
        <div className="bg-white rounded-[20px] shadow-xl border border-slate-200/60 overflow-hidden">
          {/* macOS Header */}
          <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-2.5 flex items-center border-b border-slate-200/80">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="flex-1 text-center text-[12px] text-slate-500">GoAuto</span>
          </div>

          {/* Content */}
          <div className="p-4 bg-[#f5f5f7] min-h-[350px]">
            <AnimatePresence mode="wait">
              <ActiveState key={activeIndex} />
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Navigation Dots */}
      <div className="flex justify-center gap-2 mt-6">
        {showcaseFeatures.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === activeIndex ? "w-8 bg-slate-900" : "w-2 bg-slate-300"
            )}
          />
        ))}
      </div>
    </section>
  );
};

// ============================================
// END SCROLL-DRIVEN SHOWCASE COMPONENTS
// ============================================

// Data
const mainFeatures = [
  {
    id: 'inventario',
    icon: Car,
    title: 'Gestión de Inventario',
    subtitle: 'Control total de tu stock',
    description: 'Administra todos tus vehículos en un solo lugar con vistas personalizables, filtros avanzados y estados arrastrables tipo Kanban.',
    gradient: 'from-blue-500 to-blue-600',
    lightGradient: 'from-blue-50 to-blue-100',
    features: [
      { icon: LayoutGrid, title: 'Vista Kanban', desc: 'Arrastra vehículos entre estados personalizados' },
      { icon: List, title: 'Vista de Tabla', desc: 'Columnas personalizables y paginación' },
      { icon: Filter, title: 'Filtros Avanzados', desc: 'Por marca, modelo, año, precio y más' },
      { icon: Search, title: 'Autocompletado por Patente', desc: 'Completa datos automáticamente' },
      { icon: Image, title: 'Galería Ilimitada', desc: 'Fotos con compresión automática' },
      { icon: FileSpreadsheet, title: 'Exportación Excel', desc: 'Descarga tu inventario completo' },
    ],
    details: ['Estados con colores', 'Historial de cambios', 'Extras y gastos', 'Info técnica', 'Fechas de vencimiento', 'Tipos de adquisición'],
  },
  {
    id: 'ventas',
    icon: ShoppingCart,
    title: 'Gestión de Ventas',
    subtitle: 'Proceso completo y automatizado',
    description: 'Desde la selección del vehículo hasta la generación del documento, todo en un flujo guiado.',
    gradient: 'from-emerald-500 to-emerald-600',
    lightGradient: 'from-emerald-50 to-emerald-100',
    features: [
      { icon: ChevronRight, title: 'Flujo Paso a Paso', desc: 'Vehículo → Cliente → Precio → Pagos' },
      { icon: Repeat, title: 'Trade-In', desc: 'Vehículo en parte de pago' },
      { icon: Receipt, title: 'Desglose de Pagos', desc: 'Múltiples métodos y cuotas' },
      { icon: Percent, title: 'Comisiones Automáticas', desc: 'Cálculo por vendedor' },
      { icon: FileText, title: 'Documentos Automáticos', desc: 'Contratos pre-llenados' },
      { icon: Clock, title: 'Sistema de Reservas', desc: 'Con pagos y seguimiento' },
    ],
    details: ['Historial de ventas', 'Estados de venta', 'Cierre de consignaciones', 'Servicios adicionales'],
  },
  {
    id: 'credito',
    icon: CreditCard,
    title: 'Crédito Directo',
    subtitle: 'Ofrece financiamiento propio',
    description: 'Crea planes de financiamiento personalizados y lleva control completo de los pagos.',
    gradient: 'from-violet-500 to-violet-600',
    lightGradient: 'from-violet-50 to-violet-100',
    features: [
      { icon: PenTool, title: 'Planes Personalizados', desc: 'Cuota inicial, mensual, número de cuotas' },
      { icon: Calendar, title: 'Cronograma Visual', desc: 'Todas las cuotas con fechas' },
      { icon: CheckCircle2, title: 'Estados de Pago', desc: 'Pendiente, pagado, atrasado' },
      { icon: TrendingUp, title: 'Barra de Progreso', desc: 'Porcentaje pagado vs pendiente' },
      { icon: Bell, title: 'Alertas', desc: 'Pagos vencidos o próximos' },
      { icon: CircleDollarSign, title: 'Intereses', desc: 'Cálculo automático de mora' },
    ],
    details: ['Registro de pagos', 'Info cliente-vehículo', 'Historial', 'Resumen de cobranza'],
  },
  {
    id: 'clientes',
    icon: Users,
    title: 'Gestión de Clientes',
    subtitle: 'Base de datos completa',
    description: 'Toda la información de tus clientes organizada con historial de transacciones.',
    gradient: 'from-orange-500 to-orange-600',
    lightGradient: 'from-orange-50 to-orange-100',
    features: [
      { icon: UserPlus, title: 'Registro Completo', desc: 'Nombre, RUT, teléfono, email' },
      { icon: Building2, title: 'Datos Bancarios', desc: 'Para consignadores' },
      { icon: Clock, title: 'Historial', desc: 'Todas las transacciones' },
      { icon: Upload, title: 'Importación Masiva', desc: 'Desde Excel' },
      { icon: CheckCircle2, title: 'Validación', desc: 'RUT y email automático' },
      { icon: Filter, title: 'Búsqueda', desc: 'Por cualquier campo' },
    ],
    details: ['Tipos de cliente', 'Emails por área', 'Notas', 'Última actividad'],
  },
  {
    id: 'leads',
    icon: Target,
    title: 'Leads y Oportunidades',
    subtitle: 'No pierdas ninguna venta',
    description: 'Captura y gestiona todas las oportunidades con pipeline visual.',
    gradient: 'from-rose-500 to-rose-600',
    lightGradient: 'from-rose-50 to-rose-100',
    features: [
      { icon: Zap, title: 'Captura Automática', desc: 'Desde sitio web y formularios' },
      { icon: LayoutGrid, title: 'Pipeline Visual', desc: 'Estados arrastrables' },
      { icon: UserCog, title: 'Asignación', desc: 'A vendedores específicos' },
      { icon: MessageSquare, title: 'Seguimiento', desc: 'Historial de interacciones' },
      { icon: Filter, title: 'Filtros', desc: 'Por tipo y estado' },
      { icon: Search, title: 'Preferencias', desc: 'Lo que busca el cliente' },
    ],
    details: ['Múltiples tipos', 'Info de contacto', 'Vehículo de interés', 'Notas'],
  },
  {
    id: 'integraciones',
    icon: Share2,
    title: 'Integraciones Sociales',
    subtitle: 'Publica en todos lados',
    description: 'Conecta con Instagram, Facebook Marketplace y Mercado Libre.',
    gradient: 'from-pink-500 to-pink-600',
    lightGradient: 'from-pink-50 to-pink-100',
    features: [
      { icon: Share2, title: 'Instagram', desc: 'Publica y ve estadísticas' },
      { icon: Share2, title: 'Facebook Marketplace', desc: 'Sincronización automática' },
      { icon: ExternalLink, title: 'Mercado Libre', desc: 'Publicación automática' },
      { icon: RefreshCw, title: 'Sincronización', desc: 'Estado en todas partes' },
      { icon: Smartphone, title: 'CTA Personalizable', desc: 'WhatsApp, Messenger, web' },
      { icon: BarChart3, title: 'Estadísticas', desc: 'Rendimiento por plataforma' },
    ],
    details: ['Conexión OAuth', 'Tokens automáticos', 'Historial', 'Republicación'],
  },
  {
    id: 'marketing',
    icon: Mail,
    title: 'Marketing Inteligente',
    subtitle: 'Campañas con IA',
    description: 'Inteligencia artificial para encontrar clientes y crear campañas efectivas.',
    gradient: 'from-cyan-500 to-cyan-600',
    lightGradient: 'from-cyan-50 to-cyan-100',
    features: [
      { icon: Brain, title: 'Búsqueda con IA', desc: 'Clientes similares automático' },
      { icon: Filter, title: 'Filtros Avanzados', desc: 'Similitud, precio, año' },
      { icon: Users, title: 'Selección Múltiple', desc: 'Campañas masivas' },
      { icon: Clock, title: 'Historial', desc: 'Todas las campañas' },
      { icon: DollarSign, title: 'Tasador IA', desc: 'Valuaciones en tiempo real' },
      { icon: TrendingUp, title: 'Análisis', desc: 'Precio min, max, promedio' },
    ],
    details: ['Templates editables', 'Datos del vehículo', 'Tracking', 'Confianza de tasación'],
  },
  {
    id: 'website',
    icon: Globe,
    title: 'Constructor de Sitio Web',
    subtitle: 'Tu web sin programar',
    description: 'Crea un sitio web profesional con editor visual drag & drop.',
    gradient: 'from-indigo-500 to-indigo-600',
    lightGradient: 'from-indigo-50 to-indigo-100',
    features: [
      { icon: MousePointer, title: 'Drag & Drop', desc: 'Sin tocar código' },
      { icon: Layers, title: 'Secciones', desc: 'Hero, catálogo, FAQ, mapa' },
      { icon: Palette, title: 'Personalización', desc: 'Colores y estilos' },
      { icon: Car, title: 'Catálogo Auto', desc: 'Inventario sincronizado' },
      { icon: Smartphone, title: 'Responsive', desc: 'PC, tablet, móvil' },
      { icon: Target, title: 'Formulario Leads', desc: 'Captura automática' },
    ],
    details: ['Vista previa', 'Logo propio', 'Redes sociales', 'Mapa', 'SEO'],
  },
  {
    id: 'documentos',
    icon: FileText,
    title: 'Documentos y Contratos',
    subtitle: 'Documentación profesional',
    description: 'Genera contratos automáticamente con los datos de cada operación.',
    gradient: 'from-amber-500 to-amber-600',
    lightGradient: 'from-amber-50 to-amber-100',
    features: [
      { icon: FileText, title: 'Tipos', desc: 'Compraventa, consignación, reserva' },
      { icon: PenTool, title: 'Plantillas', desc: 'Términos editables' },
      { icon: Zap, title: 'Autocompletado', desc: 'Datos pre-llenados' },
      { icon: Printer, title: 'PDF', desc: 'Imprime o descarga' },
      { icon: Clock, title: 'Historial', desc: 'Por vehículo' },
      { icon: CheckCircle2, title: 'Estados', desc: 'Pendiente o completado' },
    ],
    details: ['Info legal', 'Representante', 'Firmas', 'Numeración'],
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Dashboard y Reportes',
    subtitle: 'Métricas en tiempo real',
    description: 'Visualiza el estado de tu negocio con gráficos interactivos.',
    gradient: 'from-teal-500 to-teal-600',
    lightGradient: 'from-teal-50 to-teal-100',
    features: [
      { icon: BarChart3, title: 'KPIs', desc: 'Stock, ventas, clientes, leads' },
      { icon: TrendingUp, title: 'Tendencias', desc: 'Ventas por período' },
      { icon: LayoutGrid, title: 'Distribución', desc: 'Por estado y categoría' },
      { icon: UserCog, title: 'Vendedores', desc: 'Rendimiento individual' },
      { icon: DollarSign, title: 'Gastos', desc: 'Operacionales y fijos' },
      { icon: Calendar, title: 'Filtros', desc: 'Por período' },
    ],
    details: ['Comparativas', 'Exportación', 'Gráficos interactivos'],
  },
  {
    id: 'gaia',
    icon: Sparkles,
    title: 'GAIA — Asistente de IA',
    subtitle: 'Tu copiloto inteligente',
    description: 'Asistente de inteligencia artificial con acceso completo a los datos de tu automotora en tiempo real.',
    gradient: 'from-purple-500 to-fuchsia-600',
    lightGradient: 'from-purple-50 to-fuchsia-100',
    link: '/gaia',
    features: [
      { icon: Bot, title: 'Chat en Lenguaje Natural', desc: 'Pregunta lo que quieras sobre tu negocio' },
      { icon: Search, title: '6+ Herramientas de Datos', desc: 'Consulta vehículos, ventas, leads y más' },
      { icon: TrendingUp, title: 'Análisis en Tiempo Real', desc: 'Métricas y tendencias al instante' },
      { icon: Brain, title: 'Tasaciones con IA', desc: 'Valuaciones con búsquedas GPT paralelas' },
      { icon: Zap, title: 'Respuestas Inmediatas', desc: 'Sin esperar reportes manuales' },
      { icon: Shield, title: 'Datos Seguros', desc: 'Solo accede a tu automotora' },
    ],
    details: ['Consultas multimodales', 'Historial de chats', 'Datos estructurados', 'Contexto de negocio'],
  },
  {
    id: 'notificaciones',
    icon: BellRing,
    title: 'Centro de Notificaciones',
    subtitle: 'Comunicación en tiempo real',
    description: 'Sistema completo de notificaciones in-app y push nativas que mantienen a todo el equipo sincronizado.',
    gradient: 'from-red-500 to-orange-500',
    lightGradient: 'from-red-50 to-orange-100',
    features: [
      { icon: Bell, title: 'Notificaciones In-App', desc: 'Bell con dropdown y página completa' },
      { icon: Smartphone, title: 'Push Nativas (PWA)', desc: 'Notificaciones del sistema operativo' },
      { icon: SendHorizonal, title: 'Envío Manual', desc: 'Notifica a todos, un rol o un usuario' },
      { icon: Zap, title: 'Triggers Automáticos', desc: 'Nuevo lead, venta, solicitud y más' },
      { icon: Filter, title: 'Filtros por Tipo', desc: 'Leads, solicitudes, ventas, general' },
      { icon: Eye, title: 'Estado de Lectura', desc: 'Leídas/no leídas por usuario' },
    ],
    details: ['Tiempo real con Realtime', 'Targeting por rol', 'Encriptación Web Push', 'i18n completo'],
  },
  {
    id: 'solicitudes',
    icon: ClipboardList,
    title: 'Solicitudes de Vehículos',
    subtitle: 'Gestiona la demanda',
    description: 'Sistema Kanban para registrar y dar seguimiento a los vehículos que buscan tus clientes.',
    gradient: 'from-sky-500 to-blue-600',
    lightGradient: 'from-sky-50 to-blue-100',
    features: [
      { icon: LayoutGrid, title: 'Kanban Drag & Drop', desc: '4 columnas: Abiertas, En Progreso, Cumplidas, Canceladas' },
      { icon: Search, title: 'Preferencias del Cliente', desc: 'Marca, modelo, año, presupuesto' },
      { icon: BellRing, title: 'Notificaciones Automáticas', desc: 'Se notifica al equipo en cada cambio' },
      { icon: Clock, title: 'Expiración Automática', desc: 'Solicitudes que vencen si no se cumplen' },
      { icon: GripVertical, title: 'Historial de Estados', desc: 'Auditoría completa con notas' },
      { icon: Users, title: 'Asignación', desc: 'Asigna solicitudes a vendedores' },
    ],
    details: ['Vista mobile con tabs', 'Panel de detalle lateral', 'Realtime multi-usuario', 'Permisos granulares'],
  },
  {
    id: 'buscador',
    icon: Command,
    title: 'Buscador Global',
    subtitle: 'Encuentra todo al instante',
    description: 'Command palette tipo Spotlight (Cmd+K) que busca vehículos, clientes y secciones en toda la plataforma.',
    gradient: 'from-slate-600 to-slate-800',
    lightGradient: 'from-slate-50 to-slate-100',
    features: [
      { icon: Car, title: 'Buscar Vehículos', desc: 'Por patente, marca o modelo' },
      { icon: Users, title: 'Buscar Clientes', desc: 'Por nombre, RUT, email o teléfono' },
      { icon: Layers, title: '25+ Secciones', desc: 'Navega a cualquier página al instante' },
      { icon: Lock, title: 'Respeta Permisos', desc: 'Solo muestra lo que puedes ver' },
      { icon: Zap, title: 'Debounce Inteligente', desc: 'Búsqueda en tiempo real sin lag' },
      { icon: Settings, title: 'Deep-linking', desc: 'Navega directo a tabs de configuración' },
    ],
    details: ['Cmd+K / Ctrl+K', 'Normalización de tildes', 'Multi-tenant', 'Resultados agrupados'],
  },
  {
    id: 'permisos',
    icon: ShieldCheck,
    title: 'Permisos Granulares',
    subtitle: 'Control de acceso avanzado',
    description: '34 permisos organizados en 7 categorías con control widget por widget en el dashboard.',
    gradient: 'from-green-500 to-emerald-600',
    lightGradient: 'from-green-50 to-emerald-100',
    features: [
      { icon: KeyRound, title: '34 Permisos', desc: 'Dashboard, inventario, ventas, marketing y más' },
      { icon: UserCog, title: 'Roles Personalizados', desc: 'Crea roles a medida para tu equipo' },
      { icon: BarChart3, title: 'Dashboard por Widget', desc: 'Controla qué KPIs ve cada rol' },
      { icon: RefreshCw, title: 'Dependencias Automáticas', desc: 'Permisos padre/hijo se sincronizan' },
      { icon: Shield, title: 'Roles de Sistema', desc: 'Admin y vendedor con defaults seguros' },
      { icon: CheckCircle2, title: 'UI Intuitiva', desc: 'Checkboxes por categoría con selección masiva' },
    ],
    details: ['13 permisos de dashboard', 'Cascada automática', 'Gating por ruta', 'Bypass superadmin'],
  },
  {
    id: 'pwa',
    icon: Wifi,
    title: 'App Instalable (PWA)',
    subtitle: 'Experiencia nativa',
    description: 'Instala GoAuto como app en tu teléfono o computador con actualizaciones automáticas.',
    gradient: 'from-yellow-500 to-amber-600',
    lightGradient: 'from-yellow-50 to-amber-100',
    features: [
      { icon: Download, title: 'Instalable', desc: 'Agregar a pantalla de inicio en cualquier dispositivo' },
      { icon: BellRing, title: 'Push Nativas', desc: 'Notificaciones del sistema operativo' },
      { icon: RefreshCw, title: 'Auto-Update', desc: 'Se actualiza sola sin intervención' },
      { icon: Smartphone, title: 'Pantalla Completa', desc: 'Sin barra de navegador' },
      { icon: Zap, title: 'Carga Rápida', desc: 'Assets cacheados para rendimiento' },
      { icon: Monitor, title: 'Multiplataforma', desc: 'PC, Mac, Android, iOS' },
    ],
    details: ['Service Worker', 'Precaching Workbox', 'skipWaiting', 'Cache inteligente'],
  },
  {
    id: 'calendario',
    icon: Calendar,
    title: 'Calendario Unificado',
    subtitle: 'Todo en un solo lugar',
    description: 'Visualiza tareas, solicitudes, agendamientos y eventos propios en un calendario mensual integrado.',
    gradient: 'from-emerald-500 to-teal-600',
    lightGradient: 'from-emerald-50 to-teal-100',
    features: [
      { icon: Calendar, title: 'Vista Mensual', desc: 'Calendario con todos los eventos del mes' },
      { icon: Filter, title: 'Filtros por Fuente', desc: 'Tareas, solicitudes, agendamientos, eventos' },
      { icon: Zap, title: 'Creación Rápida', desc: 'Crea eventos directamente desde el calendario' },
      { icon: Eye, title: 'Panel Lateral', desc: 'Detalle del día seleccionado con eventos' },
      { icon: Smartphone, title: 'Responsive', desc: 'Optimizado para móvil con dots por día' },
      { icon: RefreshCw, title: 'Tiempo Real', desc: 'Se actualiza automáticamente' },
    ],
    details: ['Eventos unificados', 'Drawer de detalle', 'Navegación por mes', 'Resumen de estadísticas'],
  },
  {
    id: 'tareas',
    icon: CheckCircle2,
    title: 'Gestión de Tareas',
    subtitle: 'Organiza tu equipo',
    description: 'Sistema completo de tareas con prioridades, asignación a usuarios, fechas límite y seguimiento.',
    gradient: 'from-blue-500 to-indigo-600',
    lightGradient: 'from-blue-50 to-indigo-100',
    features: [
      { icon: CheckCircle2, title: 'Crear y Asignar', desc: 'Tareas con responsable y fecha límite' },
      { icon: Filter, title: 'Prioridades', desc: 'Baja, media, alta y urgente' },
      { icon: LayoutGrid, title: 'Estados', desc: 'Pendiente, en progreso, completada' },
      { icon: Users, title: 'Asignación', desc: 'Asigna a cualquier miembro del equipo' },
      { icon: Calendar, title: 'Integración', desc: 'Las tareas aparecen en el calendario' },
      { icon: BellRing, title: 'Notificaciones', desc: 'Avisa al asignado automáticamente' },
    ],
    details: ['Categorías personalizables', 'Descripción detallada', 'Vista de detalle lateral', 'Historial'],
  },
  {
    id: 'checklist',
    icon: ClipboardList,
    title: 'Checklist por Vehículo',
    subtitle: 'Control de preparación',
    description: 'Lista de verificación por categoría para cada vehículo: mecánica, estética, documentos y más.',
    gradient: 'from-orange-500 to-red-500',
    lightGradient: 'from-orange-50 to-red-100',
    features: [
      { icon: ClipboardList, title: 'Categorías', desc: 'Mecánica, estética, documentos, extras' },
      { icon: CheckCircle2, title: 'Items Configurables', desc: 'Personaliza qué revisar en cada categoría' },
      { icon: TrendingUp, title: 'Progreso Visual', desc: 'Barra de progreso por vehículo' },
      { icon: UserCog, title: 'Por Vehículo', desc: 'Cada auto tiene su propio checklist' },
      { icon: Clock, title: 'Historial', desc: 'Quién marcó qué y cuándo' },
      { icon: Settings, title: 'Administrable', desc: 'Agrega o elimina categorías e items' },
    ],
    details: ['Progreso global', 'Visible en detalle del vehículo', 'Multi-categoría', 'Auditable'],
  },
  {
    id: 'agendamientos',
    icon: Clock,
    title: 'Agendamientos Públicos',
    subtitle: 'Citas desde tu sitio web',
    description: 'Tus clientes pueden agendar visitas desde tu sitio web. Gestiona confirmaciones y reagendamientos.',
    gradient: 'from-violet-500 to-purple-600',
    lightGradient: 'from-violet-50 to-purple-100',
    features: [
      { icon: Globe, title: 'Formulario Público', desc: 'Clientes agendan desde tu web' },
      { icon: CheckCircle2, title: 'Confirmación', desc: 'Confirma o rechaza cada cita' },
      { icon: RefreshCw, title: 'Reagendamiento', desc: 'Reagenda con un click' },
      { icon: Calendar, title: 'Integración', desc: 'Aparecen en el calendario unificado' },
      { icon: BellRing, title: 'Notificaciones', desc: 'Avisa al equipo de nuevas citas' },
      { icon: Car, title: 'Vehículo Asociado', desc: 'Sabe qué vehículo quiere ver el cliente' },
    ],
    details: ['Vista lista y calendario', 'Estados: pendiente, confirmada, cancelada', 'Datos del cliente', 'Horarios'],
  },
];

const testimonials = [
  {
    name: 'Carlos Mendoza',
    role: 'Dueño, Automotora del Sur',
    image: '👨‍💼',
    quote: 'Antes perdía horas actualizando Excel y publicando en redes. Ahora todo está automatizado y puedo enfocarme en vender.',
    rating: 5,
  },
  {
    name: 'María González',
    role: 'Gerente, AutoMax Chile',
    image: '👩‍💼',
    quote: 'El módulo de crédito directo nos permitió aumentar las ventas un 40%. Los clientes aprecian el financiamiento propio.',
    rating: 5,
  },
  {
    name: 'Roberto Silva',
    role: 'Administrador, Autos Premium',
    image: '👨‍💼',
    quote: 'La integración con Mercado Libre y Facebook Marketplace nos ahorra 3 horas diarias. Increíble plataforma.',
    rating: 5,
  },
];

const comparisonData = [
  { feature: 'Gestión de inventario', goautos: true, excel: true, otros: true },
  { feature: 'Autocompletado por patente', goautos: true, excel: false, otros: false },
  { feature: 'Sitio web incluido', goautos: true, excel: false, otros: false },
  { feature: 'Publicación en redes sociales', goautos: true, excel: false, otros: false },
  { feature: 'Crédito directo / Financiamiento', goautos: true, excel: false, otros: false },
  { feature: 'Generación de documentos', goautos: true, excel: false, otros: true },
  { feature: 'Marketing con IA', goautos: true, excel: false, otros: false },
  { feature: 'Asistente IA (GAIA)', goautos: true, excel: false, otros: false },
  { feature: 'Notificaciones push nativas', goautos: true, excel: false, otros: false },
  { feature: 'Solicitudes de vehículos', goautos: true, excel: false, otros: false },
  { feature: 'Buscador global (Cmd+K)', goautos: true, excel: false, otros: false },
  { feature: 'Permisos granulares por widget', goautos: true, excel: false, otros: false },
  { feature: 'App instalable (PWA)', goautos: true, excel: false, otros: false },
  { feature: 'Calendario unificado', goautos: true, excel: false, otros: false },
  { feature: 'Gestión de tareas', goautos: true, excel: false, otros: false },
  { feature: 'Checklist por vehículo', goautos: true, excel: false, otros: false },
  { feature: 'Agendamientos públicos', goautos: true, excel: false, otros: false },
  { feature: 'Dashboard en tiempo real', goautos: true, excel: false, otros: true },
  { feature: 'Múltiples usuarios', goautos: true, excel: false, otros: true },
  { feature: 'Soporte en español', goautos: true, excel: false, otros: false },
];

const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Regístrate en menos de 2 minutos con tu email',
    icon: UserPlus,
  },
  {
    number: '02',
    title: 'Configura tu automotora',
    description: 'Agrega tu logo, datos y personaliza tu sitio web',
    icon: Settings,
  },
  {
    number: '03',
    title: 'Sube tu inventario',
    description: 'Agrega vehículos con autocompletado por patente',
    icon: Car,
  },
  {
    number: '04',
    title: 'Empieza a vender',
    description: 'Publica en redes, gestiona leads y cierra ventas',
    icon: Rocket,
  },
];

const faqs = [
  { q: '¿Necesito conocimientos técnicos?', a: 'No, GoAuto está diseñado para ser intuitivo. No necesitas saber programar.' },
  { q: '¿Puedo importar mis datos actuales?', a: 'Sí, puedes importar clientes desde Excel y vehículos con autocompletado por patente.' },
  { q: '¿El sitio web está incluido?', a: 'Sí, el constructor de sitio web está incluido sin costo adicional.' },
  { q: '¿Cómo funciona la integración con redes?', a: 'Conectas tu cuenta con OAuth y publicas vehículos con un clic.' },
  { q: '¿Mis datos están seguros?', a: 'Sí, usamos encriptación de nivel bancario con respaldos automáticos.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, no hay contratos de permanencia. Cancela cuando lo necesites.' },
  { q: '¿Ofrecen soporte?', a: 'Sí, soporte por WhatsApp y email con respuesta rápida.' },
  { q: '¿Cuántos usuarios puedo tener?', a: 'Usuarios ilimitados con roles de administrador o vendedor.' },
];

const stats = [
  { value: 500, suffix: '+', label: 'Vehículos gestionados' },
  { value: 50, suffix: '+', label: 'Automotoras activas' },
  { value: 1000, suffix: '+', label: 'Ventas procesadas' },
  { value: 99.9, suffix: '%', label: 'Uptime garantizado' },
];

// Feature Section - Simple Expandable Cards
const FeatureSection = ({ feature, index, isExpanded, onToggle }: { feature: (typeof mainFeatures)[0]; index: number; isExpanded: boolean; onToggle: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.03, ease: appleEase }}
      viewport={{ once: true }}
      className="group"
    >
      <div
        className={cn(
          'bg-white rounded-2xl border overflow-hidden transition-all duration-200',
          isExpanded
            ? 'border-slate-300 shadow-lg'
            : 'border-slate-200/60 hover:border-slate-300 hover:shadow-md'
        )}
      >
        <div className="p-6 flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
            feature.gradient
          )}>
            <feature.icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[17px] font-semibold text-slate-900">{feature.title}</h3>
            <p className="text-[14px] text-slate-500 mt-0.5">{feature.description}</p>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="px-6 pb-6 pt-0">
                <div className="border-t border-slate-100 pt-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    {feature.features.map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-start gap-3"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <f.icon className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-medium text-slate-900">{f.title}</h4>
                          <p className="text-[13px] text-slate-500">{f.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
                    {feature.details.map((d, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[12px] text-slate-600 font-medium"
                      >
                        <Check className="h-3 w-3 text-slate-400" />
                        {d}
                      </span>
                    ))}
                  </div>
                  {'link' in feature && feature.link && (
                    <div className="mt-4">
                      <a
                        href={feature.link}
                        className={cn(
                          "inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white rounded-xl bg-gradient-to-r transition-opacity hover:opacity-90",
                          feature.gradient
                        )}
                      >
                        Conocer más
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Main Component
const Funcionalidades: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  // Track scroll for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#fbfbfd] overflow-x-hidden">
      {/* Progress Bar - Only visible when scrolled */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-slate-900 z-[100] origin-left"
        style={{ scaleX: scrollYProgress, opacity: isScrolled ? 1 : 0 }}
      />

      {/* Header - Apple Style with transparent to solid transition */}
      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled
            ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm"
            : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <img
            src="/lovable-uploads/GOAUTO.LOGO.29.09.25.NEGRO.png"
            alt="GoAuto"
            className="h-7"
          />
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.open('https://portal.goauto.cl/login', '_blank')}
              className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Iniciar sesión
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/onboarding'}
              className="h-9 px-4 text-[14px] font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors"
            >
              Comenzar
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-[#fbfbfd]">
        {/* Apple-style Clean Gradient Background */}
        <div className="absolute inset-0">
          {/* Subtle top-right gradient */}
          <div className="absolute top-0 right-0 w-[70%] h-[70%] bg-gradient-to-bl from-blue-50/80 via-transparent to-transparent" />
          {/* Subtle bottom-left accent */}
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-violet-50/50 via-transparent to-transparent" />
        </div>

        {/* Animated Subtle Orbs - More refined */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] right-[15%] w-[400px] h-[400px] bg-gradient-to-br from-blue-200/40 to-cyan-100/30 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] left-[10%] w-[350px] h-[350px] bg-gradient-to-tr from-violet-200/30 to-purple-100/20 rounded-full blur-[100px]"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col items-center pb-20">
            {/* Content - Centered */}
            <motion.div style={{ opacity, scale }} className="text-center space-y-8 max-w-3xl">
              {/* Minimal Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <span className="inline-flex items-center text-sm font-medium text-slate-500 tracking-wide">
                  <span className="w-8 h-[1px] bg-slate-300 mr-3" />
                  Presentamos GoAuto
                </span>
              </motion.div>

              {/* Main Headline - Apple Typography */}
              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] xl:text-[4.5rem] font-semibold text-slate-900 tracking-[-0.035em] leading-[1.05]"
                >
                  Tu automotora en
                </motion.h1>
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] xl:text-[4.5rem] font-semibold tracking-[-0.035em] leading-[1.05]"
                >
                  <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                    piloto automático.
                  </span>
                </motion.h1>
              </div>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-xl sm:text-2xl text-slate-500 font-normal leading-relaxed max-w-lg mx-auto"
              >
                Inventario - Ventas - Financiamiento - Marketing.
                <span className="text-slate-900"> Todo en una sola plataforma.</span>
              </motion.p>

              {/* Feature List - Minimalist */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-wrap justify-center gap-x-8 gap-y-3"
              >
                {[
                  'Más ventas',
                  'Menos trabajo manual',
                  'Datos en tiempo real',
                  'Control total',
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-center gap-2 text-slate-600"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[15px]">{feature}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA Section - Apple Style */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex items-center justify-center pt-4"
              >
                {/* Primary CTA */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = '/onboarding'}
                  className="group relative inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors duration-300 shadow-lg shadow-slate-900/20"
                >
                  <span>Comenzar ahora</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </motion.button>
              </motion.div>

              {/* Trust Line - Ultra Minimal */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="flex items-center justify-center gap-6 pt-2 text-[13px] text-slate-400"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  7 días gratis
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Sin tarjeta
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Cancela cuando quieras
                </span>
              </motion.div>
            </motion.div>

          </div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-slate-400"
            >
              <span className="text-xs font-medium">Descubre más</span>
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronDown className="h-5 w-5" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Scroll-Driven Dashboard Showcase - Desktop */}
      <ScrollDrivenShowcase />

      {/* Mobile Carousel - Mobile Only */}
      <MobileCarousel />

      {/* Stats Section - Apple Style */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: appleEase }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-[2.5rem] sm:text-[3.5rem] font-semibold text-slate-900 tracking-tight leading-none">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-slate-500 text-[15px] mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem/Solution Section - Ultra Pro */}
      <section className="py-24 lg:py-32 bg-[#fbfbfd] overflow-hidden relative">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-[10%] w-72 h-72 bg-gradient-to-br from-red-500/5 to-orange-500/5 rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 right-[10%] w-96 h-96 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 rounded-full blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Zap className="h-4 w-4 text-amber-400" />
              Transformación total
            </motion.div>
            <h2 className="text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] font-semibold text-slate-900 tracking-tight mb-4">
              El antes y el después
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Descubre cómo GoAuto revoluciona la gestión de tu automotora
            </p>
          </motion.div>

          {/* Comparison Cards */}
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 relative">
            {/* Connecting Arrow - Desktop */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8, type: "spring" }}
              className="hidden lg:flex absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 flex items-center justify-center shadow-xl">
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="h-6 w-6 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Before Card */}
            <motion.div
              initial={{ opacity: 0, x: -50, rotateY: 10 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: appleEase }}
              className="relative group"
            >
              {/* Card glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

              <div className="relative bg-white rounded-2xl p-8 lg:p-10 shadow-lg border border-slate-200/60 overflow-hidden">
                {/* Decorative scratches */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50 to-transparent opacity-60" />

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ rotate: 180, scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center"
                    >
                      <X className="h-6 w-6 text-red-500" />
                    </motion.div>
                    <div>
                      <span className="text-[13px] font-medium text-red-500 uppercase tracking-wide">Antes</span>
                      <div className="text-[11px] text-slate-400">El método tradicional</div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <ul className="space-y-4">
                  {[
                    { icon: FileSpreadsheet, text: 'Inventario en hojas de Excel', pain: 'Errores constantes' },
                    { icon: Clock, text: 'Publicación manual en cada red', pain: '3+ horas diarias' },
                    { icon: BarChart3, text: 'Sin métricas de vendedores', pain: 'Cero visibilidad' },
                    { icon: MessageSquare, text: 'Leads perdidos en WhatsApp', pain: 'Ventas perdidas' },
                    { icon: Globe, text: 'Sin sitio web profesional', pain: 'Menos clientes' },
                    { icon: CircleDollarSign, text: 'Cálculo manual de comisiones', pain: 'Conflictos' },
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08, type: "spring", stiffness: 200 }}
                      viewport={{ once: true }}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-slate-50/50 border border-slate-100 group/item cursor-default"
                    >
                      <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-5 w-5 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] text-slate-600 line-through decoration-red-300">{item.text}</div>
                        <div className="text-[11px] text-red-400 font-medium">{item.pain}</div>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                      >
                        <X className="h-4 w-4 text-red-400" />
                      </motion.div>
                    </motion.li>
                  ))}
                </ul>

                {/* Bottom stat */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                  className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between"
                >
                  <div className="text-[13px] text-slate-400">Tiempo perdido al mes:</div>
                  <div className="text-lg font-semibold text-red-500">+40 horas</div>
                </motion.div>
              </div>
            </motion.div>

            {/* After Card */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: -10 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: appleEase }}
              className="relative group"
            >
              {/* Card glow effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

              <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl p-8 lg:p-10 shadow-xl overflow-hidden">
                {/* Subtle background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-sky-500/5" />

                {/* Header */}
                <div className="flex items-center justify-between mb-8 relative">
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.1 }}
                      transition={{ duration: 0.5 }}
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 flex items-center justify-center shadow-lg shadow-cyan-500/30"
                    >
                      <Check className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <span className="text-[13px] font-medium text-cyan-400 uppercase tracking-wide">Con GoAuto</span>
                      <div className="text-[11px] text-slate-400">La nueva forma de trabajar</div>
                    </div>
                  </div>
                  <div className="text-3xl">
                    🚀
                  </div>
                </div>

                {/* Items */}
                <ul className="space-y-4 relative">
                  {[
                    { icon: Layers, text: 'Inventario actualizado en tiempo real', benefit: 'Sin errores' },
                    { icon: Share2, text: 'Publicación con un solo clic', benefit: 'Ahorra 3 horas' },
                    { icon: BarChart3, text: 'Dashboard con métricas completas', benefit: 'Control total' },
                    { icon: Target, text: 'Leads capturados automáticamente', benefit: 'Más ventas' },
                    { icon: Globe, text: 'Sitio web profesional incluido', benefit: 'Más clientes' },
                    { icon: Zap, text: 'Comisiones calculadas al instante', benefit: 'Cero conflictos' },
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 + 0.1, type: "spring", stiffness: 200 }}
                      viewport={{ once: true }}
                      whileHover={{ x: -4, scale: 1.01 }}
                      className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm group/item cursor-default"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                        className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/10 flex items-center justify-center flex-shrink-0"
                      >
                        <item.icon className="h-5 w-5 text-cyan-400" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] text-white">{item.text}</div>
                        <div className="text-[11px] text-cyan-400 font-medium">{item.benefit}</div>
                      </div>
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                      >
                        <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                      </motion.div>
                    </motion.li>
                  ))}
                </ul>

                {/* Bottom stat */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.7 }}
                  className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between"
                >
                  <div className="text-[13px] text-slate-400">Tiempo ahorrado al mes:</div>
                  <div className="text-lg font-semibold text-cyan-400">
                    +40 horas
                  </div>
                </motion.div>

                {/* Shimmer effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                />
              </div>
            </motion.div>
          </div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="text-center mt-12"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.open('https://wa.me/56989904038?text=Hola,%20quiero%20transformar%20mi%20automotora%20con%20GoAuto', '_blank')}
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full text-[15px] font-medium shadow-lg hover:bg-slate-800 transition-colors"
            >
              <span>Quiero esta transformación</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* How It Works - Apple Style */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight mb-4">
              Comienza en minutos
            </h2>
            <p className="text-xl text-slate-500">
              Cuatro pasos simples para transformar tu automotora
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 lg:gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: appleEase }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-900 text-white text-xl font-semibold mb-6">
                  {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-[15px] text-slate-500 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 lg:py-32 bg-[#fbfbfd]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight mb-4">
              Todo lo que necesitas
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8">
              10 módulos diseñados para simplificar cada aspecto de tu negocio
            </p>

            {/* Feature count indicator */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl shadow-lg border border-slate-200/60"
            >
              <div className="flex -space-x-1.5">
                {[Car, ShoppingCart, CreditCard, Target, Share2].map((Icon, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm",
                      ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-cyan-500'][i]
                    )}
                    initial={{ scale: 0, x: -10 }}
                    whileInView={{ scale: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05, type: "spring", stiffness: 300 }}
                    viewport={{ once: true }}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </motion.div>
                ))}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900">+90 funcionalidades</div>
                <div className="text-xs text-slate-500">en 16 módulos integrados</div>
              </div>
            </motion.div>
          </motion.div>

          <div className="grid grid-cols-1 gap-3">
            {mainFeatures.map((feature, index) => (
              <FeatureSection
                key={feature.id}
                feature={feature}
                index={index}
                isExpanded={true}
                onToggle={() => {}}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table - Apple Style */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight mb-4">
              ¿Por qué GoAuto?
            </h2>
            <p className="text-lg text-slate-500">
              Compara las opciones
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: appleEase }}
            viewport={{ once: true }}
            className="bg-[#fbfbfd] rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left p-5 text-[13px] font-medium text-slate-400 uppercase tracking-wide">Funcionalidad</th>
                    <th className="p-5 text-[13px] font-semibold text-slate-900 bg-slate-100">GoAuto</th>
                    <th className="p-5 text-[13px] font-medium text-slate-400">Excel</th>
                    <th className="p-5 text-[13px] font-medium text-slate-400">Otros</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((row, i) => (
                    <tr key={i} className="border-t border-slate-200/60">
                      <td className="p-5 text-[15px] text-slate-600">{row.feature}</td>
                      <td className="p-5 text-center bg-slate-50">
                        {row.goautos ? (
                          <Check className="h-5 w-5 text-slate-900 mx-auto" />
                        ) : (
                          <Minus className="h-5 w-5 text-slate-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-5 text-center">
                        {row.excel ? (
                          <Check className="h-5 w-5 text-slate-400 mx-auto" />
                        ) : (
                          <Minus className="h-5 w-5 text-slate-200 mx-auto" />
                        )}
                      </td>
                      <td className="p-5 text-center">
                        {row.otros ? (
                          <Check className="h-5 w-5 text-slate-400 mx-auto" />
                        ) : (
                          <Minus className="h-5 w-5 text-slate-200 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials - Apple Style */}
      <section className="py-24 lg:py-32 bg-[#fbfbfd]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight">
              Lo que dicen nuestros clientes
            </h2>
          </motion.div>

          <div className="relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTestimonial}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="mb-8">
                  <p className="text-2xl sm:text-3xl text-slate-700 font-normal leading-relaxed">
                    "{testimonials[currentTestimonial].quote}"
                  </p>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <div className="text-5xl">{testimonials[currentTestimonial].image}</div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonials[currentTestimonial].name}</div>
                    <div className="text-slate-500 text-[15px]">{testimonials[currentTestimonial].role}</div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Navigation Dots */}
            <div className="flex justify-center gap-2 mt-10">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentTestimonial(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    i === currentTestimonial ? 'w-6 bg-slate-900' : 'bg-slate-300'
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Devices - Apple Style */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight mb-4">
              Funciona en todos tus dispositivos
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Accede desde tu computador, tablet o celular. Sin descargas.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { icon: Monitor, title: 'Escritorio', desc: 'Experiencia completa en pantalla grande' },
              { icon: Tablet, title: 'Tablet', desc: 'Ideal para mostrar vehículos' },
              { icon: Smartphone, title: 'Móvil', desc: 'Gestiona desde cualquier lugar' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: appleEase }}
                viewport={{ once: true }}
                className="text-center p-8 rounded-2xl bg-[#fbfbfd] border border-slate-200/60"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-6">
                  <item.icon className="h-6 w-6 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-[15px] text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security - Premium Design (Matching Page Aesthetic) */}
      <section className="relative py-32 lg:py-40 overflow-hidden bg-[#fbfbfd]">
        {/* Matching gradient background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-[60%] h-[60%] bg-gradient-to-br from-blue-50/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 right-0 w-[50%] h-[50%] bg-gradient-to-tl from-violet-50/60 via-transparent to-transparent" />
        </div>

        {/* Animated orbs matching hero style */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[20%] right-[10%] w-[350px] h-[350px] bg-gradient-to-br from-blue-200/40 to-cyan-100/30 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] left-[5%] w-[300px] h-[300px] bg-gradient-to-tr from-violet-200/30 to-purple-100/20 rounded-full blur-[100px]"
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header with animated shield */}
          <div className="text-center mb-20">
            {/* Animated Shield Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true }}
              className="relative inline-flex items-center justify-center mb-8"
            >
              {/* Outer ring animation */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
                className="absolute w-32 h-32 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, transparent, rgba(99, 102, 241, 0.4), transparent)',
                }}
              />
              {/* Inner glow */}
              <div className="absolute w-28 h-28 rounded-full bg-gradient-to-br from-blue-100 to-violet-100 blur-xl" />
              {/* Shield container */}
              <div className="relative w-24 h-24 rounded-full bg-white border border-slate-200/80 flex items-center justify-center shadow-xl shadow-slate-200/50">
                <motion.div
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Shield className="w-10 h-10 text-blue-600" />
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: appleEase }}
              viewport={{ once: true }}
            >
              <h2 className="text-[2.5rem] sm:text-[3.5rem] font-semibold text-slate-900 tracking-tight mb-6">
                Seguridad de
                <span className="block bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                  nivel empresarial
                </span>
              </h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Tu información protegida con infraestructura de clase mundial y los más altos estándares de la industria
              </p>
            </motion.div>
          </div>

          {/* Security Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {[
              {
                icon: Lock,
                title: 'Encriptación AES-256',
                desc: 'Datos encriptados en tránsito y reposo con estándares de nivel bancario',
                color: 'blue'
              },
              {
                icon: Shield,
                title: 'Control de acceso',
                desc: 'Roles y permisos granulares con autenticación segura',
                color: 'violet'
              },
              {
                icon: RefreshCw,
                title: 'Backups automáticos',
                desc: 'Respaldos frecuentes con retención extendida y recuperación rápida',
                color: 'emerald'
              },
              {
                icon: Zap,
                title: '99.99% Uptime',
                desc: 'Infraestructura redundante con alta disponibilidad garantizada',
                color: 'amber'
              },
            ].map((item, i) => {
              const colorClasses = {
                blue: { bg: 'bg-blue-50', border: 'border-blue-100', icon: 'bg-blue-600', iconHover: 'group-hover:bg-blue-700' },
                violet: { bg: 'bg-violet-50', border: 'border-violet-100', icon: 'bg-violet-600', iconHover: 'group-hover:bg-violet-700' },
                emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: 'bg-emerald-600', iconHover: 'group-hover:bg-emerald-700' },
                amber: { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'bg-amber-500', iconHover: 'group-hover:bg-amber-600' },
              }[item.color];

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6, ease: appleEase }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  className="group"
                >
                  <div className={`relative h-full p-8 rounded-2xl bg-white border ${colorClasses.border} shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300`}>
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${colorClasses.icon} ${colorClasses.iconHover} mb-6 shadow-lg transition-colors duration-300`}>
                      <item.icon className="w-7 h-7 text-white" />
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900 mb-3">{item.title}</h3>
                    <p className="text-slate-500 text-[15px] leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="relative rounded-3xl bg-white border border-slate-200 shadow-lg shadow-slate-200/50 p-8 lg:p-12 overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent rounded-r-3xl" />
            <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-gradient-to-t from-violet-50/30 to-transparent rounded-bl-3xl" />

            <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
              {[
                { value: '256', suffix: '-bit', label: 'Encriptación SSL' },
                { value: '99.99', suffix: '%', label: 'Disponibilidad garantizada' },
                { value: '24', suffix: '/7', label: 'Monitoreo activo' },
                { value: '<1', suffix: 's', label: 'Tiempo de respuesta' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="text-center lg:text-left"
                >
                  <div className="flex items-baseline justify-center lg:justify-start gap-1 mb-2">
                    <span className="text-4xl lg:text-5xl font-bold text-slate-900">
                      {stat.value}
                    </span>
                    <span className="text-xl lg:text-2xl font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">{stat.suffix}</span>
                  </div>
                  <p className="text-slate-500 text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            viewport={{ once: true }}
            className="flex flex-wrap items-center justify-center gap-8 mt-16"
          >
            {[
              'Supabase Cloud',
              'SSL Certificado',
              'GDPR Ready',
              'Backups Diarios',
            ].map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                viewport={{ once: true }}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium text-slate-600">{badge}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ - Apple Style */}
      <section className="py-24 lg:py-32 bg-[#fbfbfd]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight">
              Preguntas frecuentes
            </h2>
          </motion.div>

          <div className="space-y-0 divide-y divide-slate-200">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: i * 0.03, duration: 0.4, ease: appleEase }}
                viewport={{ once: true }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full py-5 text-left flex items-center justify-between group"
                >
                  <span className="text-[17px] font-medium text-slate-900 pr-4 group-hover:text-blue-600 transition-colors">{faq.q}</span>
                  <motion.div animate={{ rotate: openFaq === i ? 45 : 0 }} transition={{ duration: 0.2 }}>
                    <span className="text-2xl text-slate-400">+</span>
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="pb-5 text-[15px] text-slate-500 leading-relaxed">{faq.a}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Apple Style with Hero Colors */}
      <section className="relative py-24 lg:py-32 overflow-hidden bg-[#fbfbfd]">
        {/* Matching Hero Gradient Background */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[70%] h-[70%] bg-gradient-to-bl from-blue-50/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-violet-50/50 via-transparent to-transparent" />
        </div>

        {/* Animated Orbs matching Hero */}
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] right-[15%] w-[300px] h-[300px] bg-gradient-to-br from-blue-200/40 to-cyan-100/30 rounded-full blur-[80px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] left-[10%] w-[250px] h-[250px] bg-gradient-to-tr from-violet-200/30 to-purple-100/20 rounded-full blur-[80px]"
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
          >
            <h2 className="text-[2.5rem] sm:text-[3.5rem] font-semibold text-slate-900 tracking-tight leading-[1.1] mb-6">
              Transforma tu automotora.
              <span className="block bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Comienza hoy.</span>
            </h2>

            <p className="text-xl text-slate-600 mb-10 max-w-xl mx-auto">
              7 días gratis. Sin tarjeta de crédito. Cancela cuando quieras.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/onboarding'}
                className="inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-white bg-gradient-to-r from-blue-600 to-violet-600 rounded-full hover:from-blue-700 hover:to-violet-700 transition-all shadow-lg shadow-blue-500/25"
              >
                Comenzar gratis
                <ArrowRight className="ml-2 h-5 w-5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.open('https://wa.me/56989904038?text=Tengo%20una%20pregunta%20sobre%20GoAuto', '_blank')}
                className="inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors border border-blue-100"
              >
                Hablar con ventas
              </motion.button>
            </div>

            {/* Download Report Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={generatePDFReport}
              className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Descargar informe completo
              <Download className="w-4 h-4" />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer - Apple Style */}
      <footer className="bg-[#fbfbfd] border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2">
              <img src="/lovable-uploads/GOAUTO.LOGO.29.09.25.NEGRO.png" alt="GoAuto" className="h-7 mb-4" />
              <p className="text-[14px] text-slate-500 max-w-sm leading-relaxed">
                La plataforma integral para gestionar tu automotora de forma inteligente.
              </p>
            </div>
            <div>
              <h4 className="text-[13px] font-medium text-slate-400 uppercase tracking-wide mb-4">Contacto</h4>
              <div className="space-y-3">
                <a href="mailto:contacto@goauto.cl" className="block text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
                  contacto@goauto.cl
                </a>
                <a href="https://wa.me/56989904038" target="_blank" rel="noopener noreferrer" className="block text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
                  +56 9 8990 4038
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-[13px] font-medium text-slate-400 uppercase tracking-wide mb-4">Enlaces</h4>
              <div className="space-y-3">
                <a href="https://goauto.cl" target="_blank" rel="noopener noreferrer" className="block text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
                  Ver demo
                </a>
                <a href="https://portal.goauto.cl/login" target="_blank" rel="noopener noreferrer" className="block text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
                  Iniciar sesión
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[13px] text-slate-400">
              © {new Date().getFullYear()} GoAuto. Todos los derechos reservados.
            </p>
            <p className="text-[13px] text-slate-400">
              Hecho en Chile
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Funcionalidades;
