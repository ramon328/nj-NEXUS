import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring } from 'framer-motion';
import {
  Car,
  Search,
  BarChart3,
  TrendingUp,
  Users,
  CreditCard,
  FileText,
  MessageSquare,
  Zap,
  Clock,
  Shield,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Brain,
  Layers,
  Megaphone,
  Check,
  CheckCircle2,
  Table2,
  ThumbsUp,
  Languages,
  Eye,
  CalendarDays,
  BadgeDollarSign,
  Gauge,
  CircleDot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from '@/assets/ai-animation.json';

// ─── Constants ──────────────────────────────────────────────────────────────

const appleEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// ─── Reusable Components ────────────────────────────────────────────────────

const AnimatedCounter = ({ value, suffix = '', prefix = '' }: { value: number; suffix?: string; prefix?: string }) => {
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

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
};

const Card3D = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [isHovered, setIsHovered] = useState(false);

  const mouseXSpring = useSpring(x, { stiffness: 400, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 400, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['5deg', '-5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-5deg', '5deg']);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <div style={{ perspective: '1000px' }} className={cn('relative', className)}>
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => { x.set(0); y.set(0); setIsHovered(false); }}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d', transformOrigin: 'center center' }}
        animate={{ scale: isHovered ? 1.01 : 1 }}
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

// ─── GAIA Orb ───────────────────────────────────────────────────────────────

const GAIAOrb = ({ size = 'md' }: { size?: 'sm' | 'md' | 'hero' }) => {
  const config = {
    sm: { container: 'w-12 h-12', ring: 'inset-[-3px]', thickness: '1.5px', lottie: 'w-9 h-9' },
    md: { container: 'w-20 h-20', ring: 'inset-[-5px]', thickness: '1.5px', lottie: 'w-14 h-14' },
    hero: { container: 'w-28 h-28 sm:w-32 sm:h-32', ring: 'inset-[-7px]', thickness: '2px', lottie: 'w-20 h-20 sm:w-24 sm:h-24' },
  }[size];

  return (
    <div className={cn('relative flex items-center justify-center', config.container)}>
      {/* Glow */}
      <div
        className="absolute inset-[-12px] rounded-full animate-pulse"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)' }}
      />
      {/* Ring 1 */}
      <div className={cn('absolute animate-spin', config.ring)} style={{ animationDuration: '10s' }}>
        <div
          className="w-full h-full rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(6,182,212,0.4) 78%, transparent 100%)',
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${config.thickness}), #fff calc(100% - ${config.thickness}))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${config.thickness}), #fff calc(100% - ${config.thickness}))`,
          }}
        />
      </div>
      {/* Ring 2 */}
      <div className={cn('absolute animate-spin', config.ring)} style={{ animationDuration: '14s', animationDirection: 'reverse' }}>
        <div
          className="w-full h-full rounded-full"
          style={{
            background: 'conic-gradient(from 180deg, transparent 0%, transparent 60%, rgba(59,130,246,0.3) 80%, transparent 100%)',
            WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${config.thickness}), #fff calc(100% - ${config.thickness}))`,
            mask: `radial-gradient(farthest-side, transparent calc(100% - ${config.thickness}), #fff calc(100% - ${config.thickness}))`,
          }}
        />
      </div>
      {/* Core */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400/25 via-cyan-500/20 to-blue-600/25 shadow-[0_0_20px_0px_rgba(6,182,212,0.15)]" />
      <Lottie animationData={aiAnimation} loop className={cn('relative', config.lottie)} />
    </div>
  );
};

// ─── Data ───────────────────────────────────────────────────────────────────

interface Tool {
  name: string;
  description: string;
  example: string;
  icon: React.ElementType;
}

interface Category {
  name: string;
  description: string;
  color: string;
  gradient: string;
  icon: React.ElementType;
  tools: Tool[];
}

const categories: Category[] = [
  {
    name: 'Inventario y Vehículos',
    description: 'Consulta y analiza tu inventario en tiempo real',
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-blue-600',
    icon: Car,
    tools: [
      { name: 'Búsqueda de vehículos', description: 'Busca por marca, modelo, año, precio y más', example: '¿Qué SUVs tenemos bajo 15 millones?', icon: Search },
      { name: 'Distribución por marca', description: 'Composición del inventario', example: '¿Cuántos vehículos por marca?', icon: BarChart3 },
      { name: 'Días en stock', description: 'Vehículos con mayor tiempo sin venderse', example: '¿Cuáles llevan más de 60 días?', icon: Clock },
      { name: 'Más visitados', description: 'Rankings de visitas en el sitio web', example: '¿Cuáles son los más visitados?', icon: Eye },
    ],
  },
  {
    name: 'Ventas y Revenue',
    description: 'Métricas de negocio y rentabilidad',
    color: 'text-emerald-500',
    gradient: 'from-emerald-500 to-emerald-600',
    icon: TrendingUp,
    tools: [
      { name: 'Transacciones', description: 'Ventas por período y vendedor', example: '¿Cuántas ventas hicimos en febrero?', icon: BadgeDollarSign },
      { name: 'Revenue', description: 'Ingresos totales y tendencia', example: '¿Cuál fue el revenue del trimestre?', icon: TrendingUp },
      { name: 'Márgenes', description: 'Rentabilidad por vehículo y período', example: '¿Cuál es el margen promedio?', icon: Gauge },
      { name: 'Valoración', description: 'Estimaciones de valor de mercado', example: '¿Cuánto vale un Tucson 2022?', icon: CircleDot },
    ],
  },
  {
    name: 'Clientes y CRM',
    description: 'Gestión de clientes e historial',
    color: 'text-violet-500',
    gradient: 'from-violet-500 to-violet-600',
    icon: Users,
    tools: [
      { name: 'Búsqueda de clientes', description: 'Encuentra por nombre, RUT o contacto', example: 'Busca al cliente Juan Pérez', icon: Search },
      { name: 'Historial', description: 'Interacciones y compras del cliente', example: '¿Qué compró el cliente 12345678-9?', icon: FileText },
      { name: 'Tasas de cierre', description: 'Conversión de leads a ventas', example: '¿Cuál es nuestra tasa de cierre?', icon: TrendingUp },
    ],
  },
  {
    name: 'Leads y Financiamiento',
    description: 'Pipeline y seguimiento de créditos',
    color: 'text-rose-500',
    gradient: 'from-rose-500 to-rose-600',
    icon: CreditCard,
    tools: [
      { name: 'Pipeline de leads', description: 'Estado de leads activos', example: '¿Cuántos leads nuevos esta semana?', icon: Layers },
      { name: 'Créditos', description: 'Solicitudes de financiamiento', example: '¿Cuántos créditos en proceso?', icon: CreditCard },
      { name: 'Pagos pendientes', description: 'Cobros y cuotas atrasadas', example: '¿Quiénes tienen pagos atrasados?', icon: Clock },
    ],
  },
  {
    name: 'Equipo y Documentos',
    description: 'Performance del equipo y gestión documental',
    color: 'text-amber-500',
    gradient: 'from-amber-500 to-amber-600',
    icon: FileText,
    tools: [
      { name: 'Ranking vendedores', description: 'Performance y comisiones', example: '¿Quién es el mejor vendedor del mes?', icon: TrendingUp },
      { name: 'Documentos', description: 'Contratos, fichas y archivos', example: '¿Cuántos documentos se generaron?', icon: FileText },
      { name: 'Agendamientos', description: 'Citas y pruebas de manejo', example: '¿Qué agendamientos hay mañana?', icon: CalendarDays },
    ],
  },
  {
    name: 'Marketing y Config',
    description: 'Integraciones y configuración',
    color: 'text-pink-500',
    gradient: 'from-pink-500 to-pink-600',
    icon: Megaphone,
    tools: [
      { name: 'Integraciones', description: 'Estado de portales y redes', example: '¿Cuántos avisos en MercadoLibre?', icon: Layers },
      { name: 'Gastos marketing', description: 'Inversión y ROI', example: '¿Cuánto gastamos en marketing?', icon: BadgeDollarSign },
      { name: 'Configuración', description: 'Ajustes de plataforma', example: '¿Qué integraciones tenemos activas?', icon: Sparkles },
    ],
  },
];

const chatConversations = [
  {
    question: '¿Cuáles son los SUVs más visitados este mes?',
    answer: 'Los 5 SUVs más visitados este mes son:\n\n1. **Hyundai Tucson 2023** — 342 visitas\n2. **Toyota RAV4 2022** — 287 visitas\n3. **Kia Sportage 2023** — 251 visitas\n4. **Mazda CX-5 2022** — 198 visitas\n5. **Nissan Qashqai 2023** — 176 visitas\n\nEl Tucson lidera por amplio margen. Considera destacarlo en portada.',
  },
  {
    question: '¿Cuántas ventas hicimos en febrero y cuál fue el margen?',
    answer: 'En febrero se concretaron **23 ventas** con un revenue total de **$187.400.000**.\n\nEl margen promedio fue de **12.4%**, superior al 10.8% de enero. Los vehículos con mejor margen fueron los SUVs usados (15.2%).',
  },
  {
    question: '¿Quién es el mejor vendedor del último trimestre?',
    answer: '**Carlos Mendoza** lidera el ranking del trimestre:\n\n| Vendedor | Ventas | Revenue |\n|----------|--------|---------|\n| Carlos M. | 18 | $156M |\n| Ana Soto | 15 | $132M |\n| Luis Rojas | 12 | $98M |\n\nCarlos tiene además la mejor tasa de cierre: **34%**.',
  },
];

const additionalFeatures = [
  { icon: MessageSquare, title: 'Conversaciones persistentes', description: 'Retoma donde lo dejaste. Historial siempre disponible.' },
  { icon: Languages, title: 'Bilingüe', description: 'Español e inglés. GAIA responde en tu idioma.' },
  { icon: Table2, title: 'Tablas y markdown', description: 'Datos con formato profesional, listos para compartir.' },
  { icon: ThumbsUp, title: 'Recomendaciones', description: 'Sugiere acciones basadas en el análisis.' },
  { icon: Shield, title: 'Datos seguros', description: 'Procesamiento seguro dentro de tu cuenta.' },
  { icon: Zap, title: 'Respuestas instantáneas', description: 'Resultados en menos de 3 segundos.' },
];

// ─── Parse simple **bold** markdown ─────────────────────────────────────────

const renderBold = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

// ─── Category Card — always open, hover effect ─────────────────────────────

const CategoryCard = ({ category, index }: { category: Category; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay: index * 0.05, ease: appleEase }}
    whileHover={{ y: -3 }}
    className="group"
  >
    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden transition-all duration-200 hover:border-slate-300 hover:shadow-xl">
      {/* Header */}
      <div className="p-5 sm:p-6 flex items-start gap-4">
        <motion.div
          whileHover={{ rotate: 8, scale: 1.08 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-lg',
            category.gradient
          )}
        >
          <category.icon className="h-6 w-6 text-white" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[17px] font-semibold text-slate-900">{category.name}</h3>
            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-500">
              {category.tools.length} herramientas
            </span>
          </div>
          <p className="text-[14px] text-slate-500 mt-0.5">{category.description}</p>
        </div>
      </div>

      {/* Tools — always visible */}
      <div className="px-5 sm:px-6 pb-6 pt-0">
        <div className="border-t border-slate-100 pt-5">
          <div className="grid sm:grid-cols-2 gap-4">
            {category.tools.map((tool, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 + i * 0.04 }}
                whileHover={{ x: 3 }}
                className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-slate-50 flex items-center justify-center flex-shrink-0 transition-colors">
                  <tool.icon className="h-4 w-4 text-slate-500" />
                </div>
                <div>
                  <h4 className="text-[14px] font-medium text-slate-900">{tool.name}</h4>
                  <p className="text-[13px] text-slate-500">{tool.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
            {category.tools.map((tool, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[12px] text-slate-600 font-medium"
              >
                <Search className="h-3 w-3 text-slate-400" />
                {tool.example}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

const GAIA = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeChatIndex, setActiveChatIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.1], [1, 0.95]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Chat cycling
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveChatIndex((prev) => (prev + 1) % chatConversations.length);
      setTypedText('');
      setIsTyping(true);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  // Typewriter
  useEffect(() => {
    const question = chatConversations[activeChatIndex].question;
    if (!isTyping) return;
    let i = 0;
    const timer = setInterval(() => {
      if (i <= question.length) {
        setTypedText(question.slice(0, i));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [activeChatIndex, isTyping]);

  return (
    <div className="min-h-screen bg-[#fbfbfd] overflow-x-hidden">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-blue-600 z-[100] origin-left"
        style={{ scaleX: scrollYProgress, opacity: isScrolled ? 1 : 0 }}
      />

      {/* Header */}
      <motion.header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm'
            : 'bg-transparent'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/lovable-uploads/GOAUTO.LOGO.29.09.25.NEGRO.png" alt="GoAuto" className="h-7" />
            <span className={cn(
              'text-[13px] font-medium transition-opacity duration-300',
              isScrolled ? 'opacity-100 text-slate-400' : 'opacity-0'
            )}>/ GAIA</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open('https://portal.goauto.cl/login', '_blank')}
              className="hidden sm:block text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Iniciar sesión
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/asistente'}
              className="h-9 px-5 text-[14px] font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full hover:shadow-lg hover:shadow-cyan-500/25 transition-all"
            >
              Probar GAIA
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden bg-[#fbfbfd]">
        {/* Background — Apple-style subtle gradients */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[70%] h-[70%] bg-gradient-to-bl from-cyan-50/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-blue-50/50 via-transparent to-transparent" />
        </div>

        {/* Animated orbs */}
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] right-[15%] w-[400px] h-[400px] bg-gradient-to-br from-cyan-200/40 to-blue-100/30 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] left-[10%] w-[350px] h-[350px] bg-gradient-to-tr from-violet-200/30 to-purple-100/20 rounded-full blur-[100px]"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col items-center pb-20">
            <motion.div style={{ opacity: heroOpacity, scale: heroScale }} className="text-center space-y-7 max-w-3xl">
              {/* Badge + acronym */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center gap-1.5"
              >
                <span className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-500 tracking-wide">
                  <span className="w-8 h-[1px] bg-slate-300" />
                  Presentamos GAIA
                  <span className="w-8 h-[1px] bg-slate-300" />
                </span>
                <span className="text-[11px] sm:text-[12px] font-medium tracking-[0.2em] uppercase text-slate-400">
                  GoAuto Intelligent Assistant
                </span>
              </motion.div>

              {/* Orb */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.1, ease: appleEase }}
                className="flex justify-center"
              >
                <GAIAOrb size="hero" />
              </motion.div>

              {/* Headline */}
              <div className="space-y-2">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem] font-semibold text-slate-900 tracking-[-0.035em] leading-[1.05]"
                >
                  Tu asistente IA para
                </motion.h1>
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem] font-semibold tracking-[-0.035em] leading-[1.05]"
                >
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                    la automotora.
                  </span>
                </motion.h1>
              </div>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-lg sm:text-xl text-slate-500 font-normal leading-relaxed max-w-lg mx-auto"
              >
                Pregunta en lenguaje natural. <span className="text-slate-900">Obtén respuestas con datos reales de tu negocio.</span>
              </motion.p>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-wrap justify-center gap-x-7 gap-y-3"
              >
                {['11 herramientas', 'Español e inglés', 'Datos en tiempo real', 'Sin filtros manuales'].map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.08 }}
                    className="flex items-center gap-2 text-slate-600"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    <span className="text-[15px]">{f}</span>
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex items-center justify-center pt-2"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => window.location.href = '/asistente'}
                  className="group relative inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/20 transition-all hover:shadow-xl hover:shadow-cyan-500/30"
                >
                  <span>Probar GAIA</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </motion.button>
              </motion.div>

              {/* Trust */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.75 }}
                className="flex items-center justify-center gap-5 pt-1 text-[13px] text-slate-400"
              >
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Incluido en tu plan</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Sin setup</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Listo para usar</span>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
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
              <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <ChevronDown className="h-5 w-5" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ STATS BAR ═══════════════════════ */}
      <section className="py-16 sm:py-20 bg-white border-y border-slate-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: 11, suffix: '', label: 'herramientas IA' },
              { value: 6, suffix: '', label: 'categorías' },
              { value: 2, suffix: '', label: 'idiomas' },
              { value: 3, suffix: 's', prefix: '<', label: 'de respuesta' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: appleEase }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-[2.5rem] sm:text-[3.5rem] font-semibold text-slate-900 tracking-tight leading-none">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} prefix={stat.prefix || ''} />
                </div>
                <div className="text-slate-500 text-[15px] mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ═══════════════════════ */}
      <section className="py-24 lg:py-32 bg-[#fbfbfd]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight mb-4">
              Así de simple funciona
            </h2>
            <p className="text-lg text-slate-500">
              Tres pasos, cero fricción
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              { step: 1, icon: MessageSquare, title: 'Pregunta', description: 'Escribe tu consulta en lenguaje natural. Sin comandos ni filtros especiales.' },
              { step: 2, icon: Brain, title: 'GAIA analiza', description: 'Identifica tu intención, elige las herramientas correctas y consulta datos reales.' },
              { step: 3, icon: Sparkles, title: 'Respuesta inteligente', description: 'Datos precisos, tablas, recomendaciones y análisis listos para actuar.' },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: appleEase }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xl font-semibold mb-6 shadow-lg shadow-cyan-500/20">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-[15px] text-slate-500 leading-relaxed">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ CHAT DEMO ═══════════════════════ */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: appleEase }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Sparkles className="h-4 w-4 text-white" />
              Demo en vivo
            </motion.div>
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight mb-4">
              Así conversa GAIA
            </h2>
            <p className="text-lg text-slate-500 max-w-md mx-auto">
              Mira cómo GAIA responde a preguntas reales de negocio
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: appleEase }}
          >
            <Card3D>
              <div className="bg-white rounded-[20px] border border-slate-200/60 overflow-hidden shadow-xl">
                {/* macOS toolbar */}
                <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-3 flex items-center border-b border-slate-200/80">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-inner" />
                    <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-inner" />
                    <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-inner" />
                  </div>
                  <div className="flex-1 text-center">
                    <span className="text-[13px] font-medium text-slate-500">GAIA — Asistente IA</span>
                  </div>
                  <div className="w-14" />
                </div>

                {/* Chat */}
                <div className="p-5 sm:p-8 min-h-[380px] sm:min-h-[420px] bg-[#fbfbfd]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeChatIndex}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.4, ease: appleEase }}
                      className="space-y-5"
                    >
                      {/* User */}
                      <div className="flex justify-end">
                        <div className="max-w-[85%] sm:max-w-[70%] px-4 py-3 rounded-2xl rounded-br-md bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[14px] sm:text-[15px] leading-relaxed shadow-md">
                          {typedText}
                          {isTyping && <span className="inline-block w-0.5 h-4 bg-white/70 ml-0.5 animate-pulse" />}
                        </div>
                      </div>

                      {/* GAIA response */}
                      {!isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          className="flex gap-3"
                        >
                          <div className="shrink-0 mt-1">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100/60 flex items-center justify-center overflow-hidden">
                              <Lottie animationData={aiAnimation} loop className="w-10 h-10" />
                            </div>
                          </div>
                          <div className="max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl rounded-bl-md bg-white border border-slate-200/80 shadow-sm">
                            <div className="text-[13px] sm:text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">
                              {chatConversations[activeChatIndex].answer.split('\n').map((line, li) => (
                                <span key={li}>{renderBold(line)}{li < chatConversations[activeChatIndex].answer.split('\n').length - 1 && '\n'}</span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Dots */}
                  <div className="flex justify-center gap-2 mt-6">
                    {chatConversations.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => { setActiveChatIndex(i); setTypedText(''); setIsTyping(true); }}
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          i === activeChatIndex ? 'bg-cyan-500 w-6' : 'bg-slate-300 hover:bg-slate-400 w-2'
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </Card3D>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ FEATURES — BEFORE & AFTER STYLE ═══════════════════════ */}
      <section className="py-24 lg:py-32 bg-[#fbfbfd] overflow-hidden relative">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 left-[10%] w-72 h-72 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-20 right-[10%] w-96 h-96 bg-gradient-to-br from-violet-500/5 to-purple-500/5 rounded-full blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          />
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: appleEase }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight mb-4">
              Todo lo que GAIA puede hacer
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto mb-8">
              11 herramientas especializadas organizadas en 6 categorías
            </p>

            {/* Feature count pill */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white rounded-2xl shadow-lg border border-slate-200/60"
            >
              <div className="flex -space-x-1.5">
                {[Car, TrendingUp, Users, CreditCard, FileText, Megaphone].map((Icon, i) => (
                  <motion.div
                    key={i}
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-sm',
                      ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500', 'bg-pink-500'][i]
                    )}
                    initial={{ scale: 0, x: -10 }}
                    whileInView={{ scale: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05, type: 'spring', stiffness: 300 }}
                    viewport={{ once: true }}
                  >
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </motion.div>
                ))}
              </div>
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900">11 herramientas IA</div>
                <div className="text-xs text-slate-500">en 6 categorías integradas</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Category accordion — auto-expands on scroll */}
          <div className="grid grid-cols-1 gap-3">
            {categories.map((category, index) => (
              <CategoryCard key={category.name} category={category} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ BEFORE/AFTER ═══════════════════════ */}
      <section className="py-24 lg:py-32 bg-white overflow-hidden relative">
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
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <Zap className="h-4 w-4 text-white" />
              El cambio real
            </motion.div>
            <h2 className="text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] font-semibold text-slate-900 tracking-tight mb-4">
              El antes y el después
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Cómo GAIA transforma la forma de consultar datos
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 relative">
            {/* Connecting arrow */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8, type: 'spring' }}
              className="hidden lg:flex absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/25">
                <motion.div animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <ArrowRight className="h-6 w-6 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Before */}
            <motion.div
              initial={{ opacity: 0, x: -50, rotateY: 10 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ease: appleEase }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-amber-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              <div className="relative bg-white rounded-2xl p-7 lg:p-9 shadow-lg border border-slate-200/60 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-50 to-transparent opacity-60" />
                <div className="flex items-center gap-3 mb-7 relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <span className="text-[13px] font-medium text-red-500 uppercase tracking-wide">Antes</span>
                    <div className="text-[11px] text-slate-400">Sin GAIA</div>
                  </div>
                </div>

                <ul className="space-y-3.5">
                  {[
                    'Abrir módulo de inventario → filtrar → exportar',
                    'Pedir reporte de ventas al administrador',
                    'Buscar en 3 pantallas distintas para un dato',
                    'Esperar que alguien te comparta los números',
                    'Excel manual para cruzar información',
                  ].map((text, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06, type: 'spring', stiffness: 200 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/50 border border-slate-100"
                    >
                      <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-red-400 text-[10px] font-bold">&times;</span>
                      </div>
                      <span className="text-[13px] sm:text-[14px] text-slate-500 line-through decoration-red-300/50">{text}</span>
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[13px] text-slate-400">Tiempo promedio:</div>
                  <div className="text-base font-semibold text-red-500">15-30 min</div>
                </div>
              </div>
            </motion.div>

            {/* After */}
            <motion.div
              initial={{ opacity: 0, x: 50, rotateY: -10 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ease: appleEase }}
              className="relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 via-sky-500/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150" />
              <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl p-7 lg:p-9 shadow-xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-sky-500/5" />
                <div className="flex items-center gap-3 mb-7 relative">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30"
                  >
                    <Sparkles className="h-5 w-5 text-white" />
                  </motion.div>
                  <div>
                    <span className="text-[13px] font-medium text-cyan-400 uppercase tracking-wide">Con GAIA</span>
                    <div className="text-[11px] text-slate-400">Inteligencia artificial</div>
                  </div>
                </div>

                <ul className="space-y-3.5 relative">
                  {[
                    { text: '"¿Cuántos SUVs tenemos bajo 15M?"', benefit: 'Respuesta inmediata' },
                    { text: '"Dame el revenue de febrero"', benefit: 'Datos en tiempo real' },
                    { text: '"¿Quién vendió más este mes?"', benefit: 'Ranking automático' },
                    { text: '"Busca al cliente Juan Pérez"', benefit: 'Búsqueda inteligente' },
                    { text: '"¿Cuántos leads llegaron hoy?"', benefit: 'Sin filtros manuales' },
                  ].map((item, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 + 0.1, type: 'spring', stiffness: 200 }}
                      viewport={{ once: true }}
                      whileHover={{ x: -4, scale: 1.01 }}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm cursor-default"
                    >
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        whileInView={{ scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.08, type: 'spring' }}
                        className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/30 to-cyan-500/20 flex items-center justify-center flex-shrink-0"
                      >
                        <Check className="h-3 w-3 text-cyan-400" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] sm:text-[14px] text-white">{item.text}</div>
                        <div className="text-[11px] text-cyan-400 font-medium">{item.benefit}</div>
                      </div>
                    </motion.li>
                  ))}
                </ul>
                <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-between relative">
                  <div className="text-[13px] text-slate-400">Tiempo promedio:</div>
                  <div className="text-base font-semibold text-cyan-400">&lt;3 segundos</div>
                </div>

                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════ ADDITIONAL FEATURES ═══════════════════════ */}
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
              Y mucho más
            </h2>
            <p className="text-lg text-slate-500">
              Detalles que hacen la diferencia
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {additionalFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: appleEase }}
                whileHover={{ y: -2 }}
                className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200/60 hover:border-slate-300 hover:shadow-md transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100/50 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-0.5">{feature.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ FINAL CTA ═══════════════════════ */}
      <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
        {/* Subtle background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-cyan-50/60 to-blue-50/40 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: appleEase }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: appleEase }}
            >
              <GAIAOrb size="md" />
            </motion.div>

            <h2 className="mt-8 text-[2rem] sm:text-[2.75rem] lg:text-[3.25rem] font-semibold text-slate-900 tracking-tight leading-tight">
              Comienza a usar{' '}
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                GAIA
              </span>
              {' '}hoy.
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-md">
              Accede al asistente que transforma preguntas en respuestas accionables para tu automotora.
            </p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-4 mt-8"
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/asistente'}
                className="group inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/30 transition-all"
              >
                <span>Ir al Asistente</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/funcionalidades'}
                className="inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-cyan-600 bg-cyan-50 rounded-full hover:bg-cyan-100 transition-colors border border-cyan-100"
              >
                Ver funcionalidades
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
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
                <a href="/funcionalidades" className="block text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
                  Funcionalidades
                </a>
                <a href="/guia" className="block text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
                  Guía de uso
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

export default GAIA;
