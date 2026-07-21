import React, { useState, useRef } from 'react';
import { motion, useScroll, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Store,
  Facebook,
  ShoppingBag,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Check,
  Package,
  RefreshCw,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  Clock,
  Shield,
  Megaphone,
  Image,
  Car,
  Tag,
  Link2,
  Key,
  AlertCircle,
  Download,
  MessageSquare,
  HelpCircle,
  Layers,
  Eye,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const appleEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// ─── Card3D ──────────────────────────────────────────────────────────────────

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

// ─── Data ────────────────────────────────────────────────────────────────────

const howItWorks = [
  {
    icon: Package,
    title: 'Tu inventario en GoAuto',
    description: 'Tus vehiculos cargados con fotos, precios y detalles completos.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: Store,
    title: 'Catalogo de Productos',
    description: 'Se crea un catalogo de vehiculos en tu Meta Business Manager.',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: Facebook,
    title: 'Facebook distribuye',
    description: 'Facebook toma tus productos y los muestra en Marketplace, Instagram Shopping y anuncios.',
    color: 'from-blue-600 to-blue-700',
  },
];

const characteristics = [
  { icon: Shield, label: 'Listado comercial', desc: 'Publicacion de negocio, no de persona natural' },
  { icon: Check, label: 'Badge verificado', desc: 'Aparece con el sello de negocio' },
  { icon: Layers, label: 'Hasta 100 vehiculos', desc: 'Por cada carga al catalogo' },
  { icon: Settings, label: 'Control total', desc: 'Pausar, reactivar o eliminar desde GoAuto' },
  { icon: Megaphone, label: 'Anuncios dinamicos', desc: 'Facebook muestra tus autos como publicidad' },
  { icon: RefreshCw, label: 'Sincronizacion', desc: 'Estados actualizados en tiempo real' },
];

const steps = [
  {
    number: 1,
    title: 'Conectar tu cuenta',
    icon: Key,
    gradient: 'from-blue-500 to-blue-600',
    instructions: [
      'Ve a Facebook Marketplace en el menu lateral',
      'Haz click en Conectar Facebook Business',
      'Autoriza la app en la ventana de Facebook',
      'Selecciona tu cuenta de Business Manager',
      'Listo — veras tu negocio conectado',
    ],
    note: 'Si ya tenias un catalogo "GoAuto" en tu Business Manager, se reutiliza automaticamente.',
  },
  {
    number: 2,
    title: 'Publicar vehiculos',
    icon: Car,
    gradient: 'from-emerald-500 to-emerald-600',
    instructions: [
      'En la pestana Agregar, veras todos tus vehiculos disponibles',
      'Los que ya estan publicados aparecen deshabilitados',
      'Selecciona los vehiculos (puedes usar "Seleccionar todos")',
      'Haz click en Agregar X vehiculos',
      'Espera a que termine el proceso',
    ],
    note: 'Cada vehiculo se sube con titulo, precio, fotos, kilometraje, transmision, combustible y link a tu sitio.',
  },
  {
    number: 3,
    title: 'Gestionar publicaciones',
    icon: Eye,
    gradient: 'from-violet-500 to-violet-600',
    instructions: [
      'Pausar — marca el vehiculo como "sin stock" sin eliminarlo',
      'Reactivar — vuelve a mostrar un vehiculo pausado',
      'Eliminar — borra el vehiculo del catalogo permanentemente',
      'Ver en Facebook — abre el listado en Marketplace',
      'Sincronizar — actualiza estados desde Facebook',
    ],
    note: null,
  },
  {
    number: 4,
    title: 'Renovar el token',
    icon: Clock,
    gradient: 'from-amber-500 to-amber-600',
    instructions: [
      'La conexion dura 60 dias',
      'El sistema te avisa 7 dias antes de que expire',
      'Haz click en Renovar token para extender otros 60 dias',
      'Si expira, solo reconectate con un click',
      'Tus publicaciones existentes no se pierden',
    ],
    note: null,
  },
];

const vehicleFields = [
  { icon: Tag, label: 'Titulo', value: 'Ano + Marca + Modelo' },
  { icon: Tag, label: 'Precio', value: 'En CLP' },
  { icon: Image, label: 'Fotos', value: 'Hasta 10 imagenes' },
  { icon: Car, label: 'Detalles', value: 'Km, transmision, combustible, color' },
  { icon: Link2, label: 'Link', value: 'A tu sitio web' },
];

const faqs = [
  {
    q: 'Los vehiculos aparecen inmediatamente en Marketplace?',
    a: 'Facebook procesa los productos de forma asincrona. Generalmente aparecen en minutos, pero puede tardar hasta unas horas.',
  },
  {
    q: 'Puedo publicar el mismo vehiculo varias veces?',
    a: 'No. El sistema detecta duplicados y no permite publicar el mismo vehiculo dos veces.',
  },
  {
    q: 'Si vendo un vehiculo, se baja automaticamente?',
    a: 'No de forma automatica. Debes pausarlo o eliminarlo desde la pestana "En catalogo". Recomendamos pausarlo al momento de la venta.',
  },
  {
    q: 'Necesito una Pagina de Facebook?',
    a: 'Si. La integracion funciona a traves de una Pagina de Facebook vinculada a tu Business Manager.',
  },
  {
    q: 'Cuantos vehiculos puedo subir?',
    a: 'Hasta 100 por cada carga. No hay limite total en el catalogo.',
  },
];

// ─── Requirements ────────────────────────────────────────────────────────────

const requirements = [
  'Una cuenta de Facebook Business Manager (Meta Business Suite)',
  'Una Pagina de Facebook asociada a tu negocio',
  'Autorizar los permisos cuando se conecte la cuenta',
];

// ─── Page Component ──────────────────────────────────────────────────────────

const GuiaMarketplace: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDownload = () => {
    window.open('/docs/facebook-marketplace-guia.md', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] overflow-x-hidden">
      {/* Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] bg-slate-900 z-[100] origin-left"
        style={{ scaleX: scrollYProgress, opacity: isScrolled ? 1 : 0 }}
      />

      {/* Header */}
      <motion.header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm" : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <a href="/funcionalidades">
            <img src="/lovable-uploads/GOAUTO.LOGO.29.09.25.NEGRO.png" alt="GoAuto" className="h-7" />
          </a>
          <div className="flex items-center gap-3">
            <a href="/guia" className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
              Guia de uso
            </a>
            <button onClick={() => window.open('https://portal.goauto.cl/login', '_blank')}
              className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Iniciar sesion
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/onboarding'}
              className="h-9 px-4 text-[14px] font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors">
              Comenzar
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ===== HERO ===== */}
      <section className="relative min-h-[75vh] flex items-center pt-16 overflow-hidden bg-[#fbfbfd]">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[70%] h-[70%] bg-gradient-to-bl from-blue-50/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-indigo-50/50 via-transparent to-transparent" />
        </div>
        <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] right-[15%] w-[400px] h-[400px] bg-gradient-to-br from-blue-200/40 to-indigo-100/30 rounded-full blur-[100px]" />
        <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] left-[10%] w-[350px] h-[350px] bg-gradient-to-tr from-indigo-200/30 to-blue-100/20 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 pb-12">
            {/* Left */}
            <motion.div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
                <span className="inline-flex items-center text-sm font-medium text-slate-500 tracking-wide">
                  <span className="w-8 h-[1px] bg-slate-300 mr-3" />
                  Integracion Facebook Marketplace
                </span>
              </motion.div>
              <div className="space-y-2">
                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: appleEase }}
                  className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] font-semibold text-slate-900 tracking-[-0.035em] leading-[1.05]">
                  Publica en
                </motion.h1>
                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: appleEase }}
                  className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] font-semibold tracking-[-0.035em] leading-[1.05]">
                  <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 bg-clip-text text-transparent">
                    Marketplace.
                  </span>
                </motion.h1>
              </div>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.35, ease: appleEase }}
                className="text-xl sm:text-2xl text-slate-500 font-normal leading-relaxed max-w-lg mx-auto lg:mx-0">
                Conecta tu inventario con Facebook
                <span className="text-slate-900"> y llega a miles de compradores.</span>
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.45, ease: appleEase }}
                className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
                {['Catalogo comercial', 'Badge verificado', 'Anuncios dinamicos', 'Control total'].map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 + i * 0.08 }}
                    className="flex items-center gap-2 text-slate-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="text-[15px]">{f}</span>
                  </motion.div>
                ))}
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.55, ease: appleEase }}
                className="flex items-center justify-center lg:justify-start gap-6 pt-2 text-[13px] text-slate-400">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />4 pasos</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Sin programar</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />100 vehiculos por carga</span>
              </motion.div>
            </motion.div>

            {/* Right: Flow Preview */}
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: appleEase }}
              className="hidden lg:block flex-shrink-0">
              <Card3D className="w-[380px]">
                <div className="bg-white rounded-[20px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border border-slate-200/60 overflow-hidden">
                  <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-4 py-2.5 flex items-center border-b border-slate-200/80">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                    </div>
                    <span className="flex-1 text-center text-[12px] font-medium text-slate-500">Facebook Marketplace</span>
                    <div className="w-10" />
                  </div>
                  <div className="p-4 bg-[#f5f5f7] space-y-3">
                    {/* Flow diagram */}
                    {howItWorks.map((item, i) => (
                      <React.Fragment key={i}>
                        <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.6 + i * 0.15, type: 'spring', stiffness: 200 }}
                          className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 border border-slate-200/60 shadow-sm">
                          <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", item.color)}>
                            <item.icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[12px] font-medium text-slate-900 truncate">{item.title}</div>
                            <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                          </div>
                        </motion.div>
                        {i < howItWorks.length - 1 && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 + i * 0.15 }}
                            className="flex justify-center">
                            <ChevronDown className="h-4 w-4 text-slate-300" />
                          </motion.div>
                        )}
                      </React.Fragment>
                    ))}
                    {/* Result badges */}
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                      className="flex flex-wrap gap-1.5 pt-1">
                      {['Marketplace', 'Instagram Shop', 'Anuncios'].map((p, i) => (
                        <span key={i} className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                          {p}
                        </span>
                      ))}
                    </motion.div>
                  </div>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/50 to-indigo-100/30 blur-3xl -z-10 rounded-3xl opacity-60" />
              </Card3D>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-slate-400">
              <span className="text-xs font-medium">Desplaza para conocer mas</span>
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div className="absolute top-40 right-[5%] w-72 h-72 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 rounded-full blur-3xl"
            animate={{ y: [-20, 20, -20] }} transition={{ duration: 12, repeat: Infinity }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: appleEase }}
            className="text-center mb-16">
            <span className="inline-flex items-center text-sm font-medium text-blue-600 tracking-wide mb-4">
              <span className="w-6 h-[1px] bg-blue-400 mr-2" />
              Como funciona
              <span className="w-6 h-[1px] bg-blue-400 ml-2" />
            </span>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-semibold text-slate-900 tracking-[-0.02em]">
              No es una publicacion manual
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">
              La API de Facebook <strong>no permite publicar directamente en Marketplace</strong> como una persona desde su celular.
              En su lugar, usa un sistema de <strong>Catalogos de Productos</strong> a traves de Meta Business.
            </p>
          </motion.div>

          {/* Flow cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {howItWorks.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.15, ease: appleEase }}>
                <Card3D>
                  <div className="bg-white rounded-[20px] border border-slate-200/60 p-6 h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", item.color)}>
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-[13px] font-medium text-slate-400">Paso {i + 1}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-500">{item.description}</p>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </div>

          {/* Arrow connectors on desktop */}
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="hidden md:flex justify-center items-center gap-3 mb-16 -mt-10">
            {[Package, ArrowRight, Store, ArrowRight, Facebook].map((Icon, i) => (
              <Icon key={i} className={cn("h-5 w-5", i % 2 === 0 ? 'text-blue-500' : 'text-slate-300')} />
            ))}
          </motion.div>

          {/* Characteristics grid */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: appleEase }}
            className="mb-8">
            <h3 className="text-xl font-semibold text-slate-900 text-center mb-8">Que significa en la practica</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {characteristics.map((c, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5, ease: appleEase }}
                  className="bg-white rounded-xl border border-slate-200/60 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <c.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== REQUIREMENTS ===== */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, ease: appleEase }}
            className="text-center mb-8">
            <h3 className="text-xl font-semibold text-slate-900">Requisitos</h3>
            <p className="mt-2 text-sm text-slate-500">Para usar la integracion necesitas:</p>
          </motion.div>
          <div className="space-y-3">
            {requirements.map((req, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.5, ease: appleEase }}
                className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm text-slate-700">{req}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STEP BY STEP ===== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div className="absolute bottom-40 left-[5%] w-72 h-72 bg-gradient-to-tr from-indigo-500/5 to-blue-500/5 rounded-full blur-3xl"
            animate={{ y: [20, -20, 20] }} transition={{ duration: 14, repeat: Infinity }} />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: appleEase }}
            className="text-center mb-16">
            <span className="inline-flex items-center text-sm font-medium text-emerald-600 tracking-wide mb-4">
              <span className="w-6 h-[1px] bg-emerald-400 mr-2" />
              Paso a paso
              <span className="w-6 h-[1px] bg-emerald-400 ml-2" />
            </span>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-semibold text-slate-900 tracking-[-0.02em]">
              Como usarlo
            </h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">
              Desde conectar tu cuenta hasta gestionar tus publicaciones.
            </p>
          </motion.div>

          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.1, ease: appleEase }}>
                <Card3D>
                  <div className="bg-white rounded-[20px] border border-slate-200/60 overflow-hidden">
                    <div className={cn("bg-gradient-to-r p-4 flex items-center gap-4", step.gradient)}>
                      <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                        <step.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <span className="text-white/70 text-xs font-medium">Paso {step.number}</span>
                        <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <ol className="space-y-2.5">
                        {step.instructions.map((instruction, j) => (
                          <motion.li key={j} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }} transition={{ delay: 0.2 + j * 0.06 }}
                            className="flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-medium text-slate-500">{j + 1}</span>
                            </span>
                            <span className="text-sm text-slate-600">{instruction}</span>
                          </motion.li>
                        ))}
                      </ol>
                      {step.note && (
                        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                          viewport={{ once: true }} transition={{ delay: 0.5 }}
                          className="mt-4 p-3 bg-amber-50 border border-amber-200/60 rounded-xl flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-amber-700">{step.note}</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== VEHICLE FIELDS ===== */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, ease: appleEase }}
            className="text-center mb-8">
            <h3 className="text-xl font-semibold text-slate-900">Que se publica de cada vehiculo</h3>
            <p className="mt-2 text-sm text-slate-500">Cada vehiculo se sube con la siguiente informacion:</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 gap-3">
            {vehicleFields.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}
                className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <f.icon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div>
                  <span className="text-sm font-medium text-slate-900">{f.label}</span>
                  <span className="text-xs text-slate-400 ml-2">{f.value}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: appleEase }}
            className="text-center mb-12">
            <span className="inline-flex items-center text-sm font-medium text-violet-600 tracking-wide mb-4">
              <HelpCircle className="h-4 w-4 mr-2" />
              Preguntas frecuentes
            </span>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-semibold text-slate-900 tracking-[-0.02em]">
              Dudas comunes
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full bg-white rounded-xl border border-slate-200/60 overflow-hidden text-left transition-colors hover:border-slate-300"
                >
                  <div className="px-5 py-4 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-900 pr-4">{faq.q}</span>
                    <motion.div animate={{ rotate: openFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    </motion.div>
                  </div>
                  {openFaq === i && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="px-5 pb-4">
                      <p className="text-sm text-slate-500">{faq.a}</p>
                    </motion.div>
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DOWNLOAD CTA ===== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-indigo-500/5" />
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-gradient-to-br from-blue-500/20 to-indigo-500/10 rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: appleEase }}
            className="space-y-8">
            <h2 className="text-[2rem] sm:text-[2.5rem] lg:text-[3rem] font-semibold text-white tracking-[-0.02em]">
              Descarga la guia completa
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 max-w-lg mx-auto">
              Toda la informacion de esta pagina en un documento que puedes consultar cuando quieras.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleDownload}
                className="group inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-slate-900 bg-white rounded-full hover:bg-slate-50 transition-colors duration-300 shadow-lg">
                <Download className="mr-2 h-5 w-5" />
                <span>Descargar guia (.md)</span>
              </motion.button>
              <motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                href="https://wa.me/56989904038?text=Hola%2C%20necesito%20ayuda%20con%20Facebook%20Marketplace"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-colors duration-300">
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>Necesito ayuda</span>
              </motion.a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <motion.a whileHover={{ scale: 1.02 }} href="/guia"
                className="inline-flex items-center gap-2 text-[14px] text-slate-400 hover:text-white transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> Ver guia general de uso
              </motion.a>
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex items-center justify-center gap-6 pt-2 text-[13px] text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />100 vehiculos por carga</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Token de 60 dias</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Badge de negocio</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
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
                  Guia de uso
                </a>
                <a href="https://portal.goauto.cl/login" target="_blank" rel="noopener noreferrer" className="block text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
                  Iniciar sesion
                </a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[13px] text-slate-400">&copy; {new Date().getFullYear()} GoAuto. Todos los derechos reservados.</p>
            <p className="text-[13px] text-slate-400">Hecho en Chile</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GuiaMarketplace;
