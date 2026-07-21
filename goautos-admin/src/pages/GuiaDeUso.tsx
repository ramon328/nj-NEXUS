import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring, useMotionValue, useTransform } from 'framer-motion';
import {
  Settings,
  Users,
  Car,
  Globe,
  Share2,
  Target,
  ShoppingCart,
  Mail,
  Zap,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Check,
  Lightbulb,
  Smartphone,
  BookOpen,
  Rocket,
  MessageSquare,
  LayoutGrid,
  List,
  Filter,
  Search,
  Image,
  FileSpreadsheet,
  CreditCard,
  Calendar,
  Bell,
  BarChart3,
  FileText,
  Upload,
  UserPlus,
  Building2,
  Palette,
  MousePointer,
  MousePointerClick,
  Layers,
  Brain,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Lock,
  Clock,
  Instagram,
  Facebook,
  Handshake,
  ExternalLink,
  Monitor,
  PenTool,
  Printer,
  MapPin,
  Megaphone,
  Briefcase,
  Store,
  Wrench,
  Scale,
  MailPlus,
  Receipt,
  CarFront,
  ChevronUp,
  ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const appleEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

// ============================================
// 3D CARD COMPONENT (from Funcionalidades)
// ============================================
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
    x.set(e.clientX / rect.width - 0.5 - rect.left / rect.width);
    y.set(e.clientY / rect.height - 0.5 - rect.top / rect.height);
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
          style={{ boxShadow: isHovered ? '0 30px 60px -15px rgba(0,0,0,0.25)' : '0 20px 40px -15px rgba(0,0,0,0.12)' }}
        />
        {children}
      </motion.div>
    </div>
  );
};

// ============================================
// MINI PREVIEW COMPONENTS FOR EACH STEP
// ============================================

// Onboarding preview
const OnboardingPreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Configuración inicial</span>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
        className="text-[11px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Paso 2 de 4</motion.span>
    </div>
    {/* Progress steps */}
    <div className="flex items-center justify-between px-1">
      {['Cuenta', 'Datos', 'Logo', 'Plan'].map((s, i) => (
        <React.Fragment key={i}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.12, type: 'spring' }} className="flex flex-col items-center">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium",
              i < 2 ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500')}>
              {i < 2 ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-[10px] text-slate-500 mt-1">{s}</span>
          </motion.div>
          {i < 3 && <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15 + i * 0.1 }}
            className={cn("flex-1 h-1 mx-1 rounded-full origin-left", i < 1 ? 'bg-blue-500' : 'bg-slate-200')} />}
        </React.Fragment>
      ))}
    </div>
    {/* Form preview */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="bg-white rounded-xl p-4 border border-slate-200/60 shadow-sm space-y-3">
      <div>
        <div className="text-[11px] text-slate-400 mb-1">Nombre de la automotora</div>
        <div className="h-8 bg-slate-50 rounded-lg border border-slate-200 flex items-center px-3">
          <span className="text-[12px] text-slate-600">AutoMax Chile</span>
        </div>
      </div>
      <div>
        <div className="text-[11px] text-slate-400 mb-1">Teléfono</div>
        <div className="h-8 bg-slate-50 rounded-lg border border-slate-200 flex items-center px-3">
          <span className="text-[12px] text-slate-600">+56 9 1234 5678</span>
        </div>
      </div>
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="w-full h-9 bg-blue-500 rounded-lg text-white text-[12px] font-medium">Continuar</motion.button>
    </motion.div>
  </motion.div>
);

// Settings preview
const SettingsPreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Configuración</span>
      <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">General</span>
    </div>
    {/* Tabs */}
    <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
      {['General', 'Sucursales', 'Legal', 'Estados'].map((tab, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
          className={cn("flex-1 text-center py-1.5 rounded-md text-[11px] font-medium",
            i === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
          {tab}
        </motion.div>
      ))}
    </div>
    {/* Vehicle states */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
      <div className="text-[12px] font-medium text-slate-700 mb-2">Estados de vehículos</div>
      <div className="space-y-1.5">
        {[
          { name: 'En preparación', color: 'bg-amber-400' },
          { name: 'Publicado', color: 'bg-emerald-400' },
          { name: 'En vitrina', color: 'bg-blue-400' },
          { name: 'Vendido', color: 'bg-slate-400' },
        ].map((state, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.08 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-50">
            <div className={cn("w-3 h-3 rounded-full", state.color)} />
            <span className="text-[11px] text-slate-600">{state.name}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// Team preview
const TeamPreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Equipo</span>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
        className="text-[11px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full font-medium">3 miembros</motion.span>
    </div>
    <div className="space-y-2">
      {[
        { name: 'Carlos Mendoza', role: 'Admin', initials: 'CM', color: 'bg-blue-500' },
        { name: 'María González', role: 'Vendedor', initials: 'MG', color: 'bg-violet-500' },
        { name: 'Pedro López', role: 'Vendedor', initials: 'PL', color: 'bg-emerald-500' },
      ].map((member, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 200 }}
          className="bg-white rounded-xl px-3 py-2.5 flex items-center justify-between border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white", member.color)}>
              {member.initials}
            </div>
            <div>
              <div className="text-[12px] font-medium text-slate-900">{member.name}</div>
              <div className="text-[10px] text-slate-400">{member.role}</div>
            </div>
          </div>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full",
            member.role === 'Admin' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600')}>{member.role}</span>
        </motion.div>
      ))}
    </div>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="bg-violet-50 rounded-xl p-3 border border-violet-200/60 flex items-center gap-3">
      <UserPlus className="h-4 w-4 text-violet-500" />
      <span className="text-[12px] text-violet-700 font-medium">Invitar nuevo miembro</span>
    </motion.div>
  </motion.div>
);

// Vehicle creation preview
const VehiclePreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Nuevo vehículo</span>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
        className="text-[11px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">Autocompletado</motion.span>
    </div>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-slate-400" />
        <div className="flex-1 h-8 bg-slate-50 rounded-lg border border-slate-200 flex items-center px-3">
          <span className="text-[12px] text-slate-600">BBXX-12</span>
        </div>
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: 'spring' }}
          className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Check className="h-4 w-4 text-white" />
        </motion.div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Marca', value: 'Toyota' },
          { label: 'Modelo', value: 'Hilux' },
          { label: 'Año', value: '2024' },
          { label: 'Color', value: 'Blanco' },
        ].map((field, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.08 }}>
            <div className="text-[10px] text-slate-400 mb-0.5">{field.label}</div>
            <div className="h-7 bg-emerald-50 rounded-md border border-emerald-200 flex items-center px-2">
              <span className="text-[11px] text-emerald-700 font-medium">{field.value}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
    {/* Gallery */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
      <div className="text-[11px] font-medium text-slate-600 mb-2">Galería de fotos</div>
      <div className="grid grid-cols-4 gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.08 }}
            className={cn("aspect-square rounded-lg flex items-center justify-center",
              i < 3 ? 'bg-slate-200' : 'bg-slate-50 border-2 border-dashed border-slate-300')}>
            {i < 3 ? <Image className="h-4 w-4 text-slate-400" /> : <span className="text-slate-400 text-lg">+</span>}
          </motion.div>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// Website builder preview
const WebsitePreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Constructor de sitio</span>
      <span className="text-[11px] bg-cyan-100 text-cyan-600 px-2 py-0.5 rounded-full font-medium">Drag & Drop</span>
    </div>
    {/* Device selector */}
    <div className="flex items-center justify-center gap-2 bg-slate-100 rounded-lg p-1">
      {[{ icon: Monitor, label: 'Desktop' }, { icon: Smartphone, label: 'Mobile' }].map((d, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium",
            i === 0 ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500')}>
          <d.icon className="h-3.5 w-3.5" /> {d.label}
        </motion.div>
      ))}
    </div>
    {/* Site preview */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-violet-600 p-4 text-center">
        <div className="text-[13px] font-bold text-white">AutoMax Chile</div>
        <div className="text-[10px] text-blue-200 mt-0.5">Tu concesionario de confianza</div>
      </div>
      <div className="p-3 space-y-2">
        {['Hero', 'Catálogo', 'Testimonios'].map((section, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.08 }} whileHover={{ x: 3, backgroundColor: '#f0f9ff' }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200/60 cursor-pointer">
            <Layers className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-[11px] text-slate-600 font-medium">{section}</span>
            <ChevronRight className="h-3 w-3 text-slate-300 ml-auto" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// Channels preview
const ChannelsPreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Integraciones</span>
      <div className="flex items-center gap-1">
        {[0, 1, 2].map(i => (
          <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 + i * 0.08, type: 'spring' }}
            className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        ))}
        <span className="text-[11px] text-emerald-600 font-medium ml-1">Conectadas</span>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {[
        { name: 'Instagram', color: 'from-purple-500 via-pink-500 to-orange-400', icon: <Instagram className="w-5 h-5 text-white" />, posts: 24 },
        { name: 'Facebook', color: 'from-blue-600 to-blue-400', icon: <Facebook className="w-5 h-5 text-white" />, posts: 18 },
        { name: 'Mercado Libre', color: 'from-yellow-400 to-yellow-500', icon: <Handshake className="w-5 h-5 text-white" />, posts: 32 },
        { name: 'ChileAutos', color: 'from-red-500 to-red-600', icon: <Car className="w-5 h-5 text-white" />, posts: 15 },
      ].map((p, i) => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.1, type: 'spring' }} whileHover={{ scale: 1.03, y: -2 }}
          className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm text-center relative cursor-pointer">
          <motion.div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />
          <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br mx-auto mb-1.5 flex items-center justify-center shadow-md", p.color)}>
            {p.icon}
          </div>
          <div className="text-[11px] font-medium text-slate-600">{p.name}</div>
          <div className="text-[14px] font-bold text-slate-900">{p.posts}</div>
          <div className="text-[9px] text-slate-400">publicaciones</div>
        </motion.div>
      ))}
    </div>
  </motion.div>
);

// Leads preview
const LeadsPreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Pipeline de Leads</span>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
        className="text-[11px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium">+3 nuevos</motion.span>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {[
        { title: 'Nuevos', count: 5, color: '#f43f5e', leads: ['María G.', 'Pedro L.'] },
        { title: 'Contactado', count: 3, color: '#f59e0b', leads: ['Ana M.'] },
        { title: 'Cerrado', count: 8, color: '#10b981', leads: ['Juan P.'] },
      ].map((col, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, type: 'spring' }}
          className="bg-white rounded-xl p-2.5 border border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
            <span className="text-[10px] font-medium text-slate-600">{col.title}</span>
            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full ml-auto font-semibold">{col.count}</span>
          </div>
          <div className="space-y-1">
            {col.leads.map((lead, j) => (
              <motion.div key={j} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 + j * 0.08 }}
                className="rounded-md px-2 py-1.5 text-[10px] text-slate-600 bg-slate-50">
                {lead}
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-xl p-3 flex items-center gap-3 text-white relative overflow-hidden">
      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }} />
      <Target className="h-4 w-4 relative" />
      <div className="relative">
        <div className="text-[12px] font-semibold">Nuevo lead capturado</div>
        <div className="text-[10px] text-rose-200">Desde tu sitio web</div>
      </div>
    </motion.div>
  </motion.div>
);

// Sales preview
const SalesPreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Proceso de Venta</span>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
        className="text-[11px] bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">Paso 3 de 4</motion.span>
    </div>
    {/* Timeline */}
    <div className="flex items-center justify-between px-1">
      {['Vehículo', 'Cliente', 'Precio', 'Pago'].map((step, i) => (
        <React.Fragment key={i}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.1, type: 'spring' }}
            className="flex flex-col items-center">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium",
              i < 3 ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500')}>
              {i < 3 ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className="text-[9px] text-slate-500 mt-1">{step}</span>
          </motion.div>
          {i < 3 && <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.15 + i * 0.1 }}
            className={cn("flex-1 h-1 mx-1 rounded-full origin-left", i < 2 ? 'bg-amber-500' : 'bg-slate-200')} />}
        </React.Fragment>
      ))}
    </div>
    {/* Sale detail */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-[13px] font-semibold text-slate-900">Toyota Hilux 2024</div>
          <div className="text-[11px] text-slate-400">0 km</div>
        </div>
        <div className="text-right">
          <div className="text-[16px] font-bold text-emerald-600">$18.9M</div>
          <div className="text-[10px] text-slate-400">Precio venta</div>
        </div>
      </div>
      <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px]">
        <span className="text-slate-500">Cliente: Juan Pérez</span>
        <span className="font-medium text-emerald-600">Comisión: $285.000</span>
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
      className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-2.5 flex items-center gap-2 text-white relative overflow-hidden">
      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }} />
      <span className="text-lg relative">🎉</span>
      <span className="text-[12px] font-medium relative">¡Venta casi completa!</span>
    </motion.div>
  </motion.div>
);

// Marketing preview
const MarketingPreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Marketing IA</span>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}
        className="text-[11px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">IA activa</motion.span>
    </div>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-indigo-500" />
        <span className="text-[12px] font-medium text-slate-700">Clientes compatibles encontrados</span>
      </div>
      <div className="space-y-1.5">
        {[
          { name: 'María G.', match: '95%', interest: 'SUV familiar' },
          { name: 'Carlos R.', match: '87%', interest: 'Pickup 4x4' },
          { name: 'Ana S.', match: '82%', interest: 'SUV premium' },
        ].map((client, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.08 }}
            className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-50">
            <div>
              <div className="text-[11px] font-medium text-slate-700">{client.name}</div>
              <div className="text-[9px] text-slate-400">{client.interest}</div>
            </div>
            <span className="text-[11px] font-bold text-indigo-600">{client.match}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
      className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-3 text-white relative overflow-hidden">
      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
        animate={{ x: ['-100%', '100%'] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }} />
      <div className="flex items-center gap-2 relative">
        <Mail className="h-4 w-4" />
        <div>
          <div className="text-[12px] font-semibold">Campaña lista para enviar</div>
          <div className="text-[10px] text-indigo-200">3 clientes seleccionados</div>
        </div>
      </div>
    </motion.div>
  </motion.div>
);

// Extra tools preview
const ExtraToolsPreview = () => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-[13px] font-semibold text-slate-900">Panel general</span>
    </div>
    {/* Mini dashboard */}
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: 'Vehículos', value: '24', icon: Car },
        { label: 'Ventas', value: '$48M', icon: TrendingUp },
        { label: 'Leads', value: '15', icon: Target },
      ].map((stat, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="bg-white rounded-xl p-2.5 border border-slate-200/60 shadow-sm text-center">
          <stat.icon className="h-4 w-4 text-slate-400 mx-auto mb-1" />
          <div className="text-[14px] font-bold text-slate-900">{stat.value}</div>
          <div className="text-[9px] text-slate-400">{stat.label}</div>
        </motion.div>
      ))}
    </div>
    {/* Credit preview */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
      className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[12px] font-medium text-slate-700">Crédito activo</span>
        <span className="text-[14px] font-bold text-violet-600">60%</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: '60%' }}
          transition={{ delay: 0.4, duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full relative overflow-hidden">
          <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ['-100%', '100%'] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1.3 }} />
        </motion.div>
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
        <span>$5.4M pagado</span><span>$3.6M pendiente</span>
      </div>
    </motion.div>
    {/* Mini chart */}
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-sm">
      <div className="text-[12px] font-medium text-slate-700 mb-2">Ventas mensuales</div>
      <div className="flex items-end gap-1.5 h-12">
        {[35, 55, 40, 70, 50, 85, 65].map((h, i) => (
          <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }}
            transition={{ delay: 0.5 + i * 0.05, duration: 0.4, ease: appleEase }}
            className={cn("flex-1 rounded-sm", i === 5 ? 'bg-blue-500' : 'bg-slate-200')} />
        ))}
      </div>
    </motion.div>
  </motion.div>
);

// Map preview components to step numbers
const previewComponents: Record<number, React.FC> = {
  1: OnboardingPreview,
  2: SettingsPreview,
  3: TeamPreview,
  4: VehiclePreview,
  5: WebsitePreview,
  6: ChannelsPreview,
  7: LeadsPreview,
  8: SalesPreview,
  9: MarketingPreview,
  10: ExtraToolsPreview,
};

// ============================================
// GUIDE STEPS DATA
// ============================================

interface SubFeature {
  icon: React.ElementType;
  title: string;
  desc: string;
}

interface GuideStep {
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
  gradient: string;
  menuPath: string;
  appLink: string;
  bullets: string[];
  subFeatures: SubFeature[];
  tags: string[];
}

const guideSteps: GuideStep[] = [
  {
    number: 1,
    icon: Rocket,
    title: 'Completar el Onboarding',
    description: 'Tu punto de partida. Registra tu automotora y configura lo esencial en minutos.',
    gradient: 'from-blue-500 to-blue-600',
    menuPath: 'Se abre al crear cuenta',
    appLink: '/onboarding',
    bullets: [
      'Crea tu cuenta con email y contraseña',
      'Ingresa el nombre de tu automotora y datos básicos',
      'Sube tu logo para personalizar toda la plataforma',
      'Selecciona tu plan o comienza con 7 días gratis sin tarjeta',
    ],
    subFeatures: [
      { icon: Lock, title: 'Cuenta segura', desc: 'Autenticación encriptada con Supabase' },
      { icon: Image, title: 'Logo personalizado', desc: 'Se usa en documentos, sitio web y más' },
      { icon: CreditCard, title: 'Trial gratis', desc: '7 días completos sin restricciones' },
      { icon: Clock, title: '2 minutos', desc: 'Proceso rápido y guiado' },
    ],
    tags: ['Registro', 'Logo', 'Plan', 'Trial 7 días'],
  },
  {
    number: 2,
    icon: Settings,
    title: 'Configurar tu automotora',
    description: 'Personaliza la plataforma para que se adapte perfectamente a tu negocio.',
    gradient: 'from-slate-600 to-slate-700',
    menuPath: 'Menú lateral → Configuración',
    appLink: '/configuracion',
    bullets: [
      'Agrega sucursales con dirección, teléfono y horarios de atención',
      'Crea estados personalizados para tus vehículos (ej: En preparación, Publicado, En vitrina)',
      'Completa tu información legal: razón social, RUT, representante legal',
      'Personaliza colores, tema claro/oscuro y branding general',
    ],
    subFeatures: [
      { icon: Building2, title: 'Sucursales', desc: 'Múltiples ubicaciones con horarios' },
      { icon: Palette, title: 'Personalización', desc: 'Colores y tema de la plataforma' },
      { icon: LayoutGrid, title: 'Estados', desc: 'Kanban con estados personalizados' },
      { icon: FileText, title: 'Datos legales', desc: 'Para documentos y contratos' },
    ],
    tags: ['Sucursales', 'Estados', 'Legal', 'Tema'],
  },
  {
    number: 3,
    icon: Users,
    title: 'Agregar tu equipo',
    description: 'Invita a tu equipo y asigna roles según sus responsabilidades.',
    gradient: 'from-violet-500 to-violet-600',
    menuPath: 'Menú lateral → Equipo',
    appLink: '/equipo',
    bullets: [
      'Invita vendedores con su email — recibirán acceso inmediato a la plataforma',
      'Rol Admin: acceso completo a inventario, ventas, configuración, reportes y sitio web',
      'Rol Vendedor: gestiona sus leads asignados, vehículos y ventas propias',
      'Configura porcentaje de comisión por vendedor para cálculo automático en ventas',
    ],
    subFeatures: [
      { icon: UserPlus, title: 'Invitación rápida', desc: 'Por email con acceso inmediato' },
      { icon: Lock, title: 'Roles definidos', desc: 'Admin o Vendedor con permisos claros' },
      { icon: DollarSign, title: 'Comisiones', desc: 'Porcentaje configurable por vendedor' },
      { icon: BarChart3, title: 'Rendimiento', desc: 'Métricas individuales en dashboard' },
    ],
    tags: ['Invitaciones', 'Roles', 'Comisiones', 'Permisos'],
  },
  {
    number: 4,
    icon: Car,
    title: 'Crear tu primer vehículo',
    description: 'Agrega vehículos a tu inventario de forma rápida e inteligente.',
    gradient: 'from-emerald-500 to-emerald-600',
    menuPath: 'Menú lateral → Vehículos → Agregar',
    appLink: '/vehiculos/agregar',
    bullets: [
      'Ingresa la patente y el sistema autocompleta marca, modelo, año, color y más datos',
      'Sube fotos: imagen principal + galería ilimitada (se comprimen automáticamente)',
      'Define precio, kilometraje, combustible, transmisión, tracción y equipamiento',
      'Elige tipo de adquisición: compra directa, consignación o consignación con pago adelantado',
    ],
    subFeatures: [
      { icon: Search, title: 'Autocompletado', desc: 'Datos automáticos por patente' },
      { icon: Image, title: 'Galería ilimitada', desc: 'Compresión automática de fotos' },
      { icon: Filter, title: 'Datos completos', desc: 'Todos los campos del vehículo' },
      { icon: FileSpreadsheet, title: 'Exportar', desc: 'Inventario completo a Excel' },
    ],
    tags: ['Patente', 'Galería', 'Compra', 'Consignación', 'Trade-in'],
  },
  {
    number: 5,
    icon: Globe,
    title: 'Armar tu sitio web',
    description: 'Crea tu página web profesional sin necesidad de programar.',
    gradient: 'from-cyan-500 to-cyan-600',
    menuPath: 'Menú lateral → Sitio Web',
    appLink: '/builder',
    bullets: [
      'Usa el constructor visual Drag & Drop para diseñar tu sitio — sin tocar código',
      'Secciones prediseñadas: Hero, Catálogo, Testimonios, FAQ, Mapa de ubicación, Contacto',
      'Tu catálogo se actualiza automáticamente cada vez que agregas o vendes un vehículo',
      'Chat con IA integrado que responde consultas de visitantes las 24 horas, los 7 días',
    ],
    subFeatures: [
      { icon: MousePointer, title: 'Drag & Drop', desc: 'Editor visual intuitivo' },
      { icon: Layers, title: 'Secciones', desc: 'Hero, catálogo, FAQ, mapa y más' },
      { icon: RefreshCw, title: 'Auto-sync', desc: 'Inventario siempre actualizado' },
      { icon: Brain, title: 'Chat IA', desc: 'Responde consultas 24/7' },
    ],
    tags: ['Editor visual', 'Catálogo', 'Chat IA', 'Responsive', 'SEO'],
  },
  {
    number: 6,
    icon: Share2,
    title: 'Conectar canales de venta',
    description: 'Publica tus vehículos en múltiples plataformas con un clic.',
    gradient: 'from-pink-500 to-pink-600',
    menuPath: 'Menú lateral → Instagram / Facebook / Mercado Libre / ChileAutos',
    appLink: '/instagram',
    bullets: [
      'Instagram: conecta tu cuenta Business vía OAuth y publica vehículos directamente desde el inventario',
      'Facebook Marketplace: sincronización automática de estado — cuando vendes, se actualiza solo',
      'Mercado Libre: publicación automática con renovación de avisos expirados',
      'ChileAutos: exporta tu inventario al marketplace automotriz líder de Chile',
    ],
    subFeatures: [
      { icon: Instagram, title: 'Instagram', desc: 'Publicación directa y estadísticas' },
      { icon: Facebook, title: 'Facebook', desc: 'Marketplace con sync automático' },
      { icon: Handshake, title: 'Mercado Libre', desc: 'Avisos automáticos y renovación' },
      { icon: ExternalLink, title: 'ChileAutos', desc: 'Exportación al marketplace líder' },
    ],
    tags: ['Instagram', 'Facebook', 'ML', 'ChileAutos', 'OAuth'],
  },
  {
    number: 7,
    icon: Target,
    title: 'Gestionar leads y clientes',
    description: 'Captura oportunidades automáticamente y nunca pierdas un potencial comprador.',
    gradient: 'from-rose-500 to-rose-600',
    menuPath: 'Menú lateral → Leads / Clientes',
    appLink: '/leads',
    bullets: [
      'Los leads llegan automáticamente desde tu sitio web, chat IA y redes sociales',
      'Tipos de lead: compra directa, consignación, búsqueda, venta de vehículo, financiamiento',
      'Asigna leads a vendedores específicos con notas, historial y seguimiento',
      'Base de clientes: registro completo con RUT, datos bancarios e importación masiva desde Excel',
    ],
    subFeatures: [
      { icon: Zap, title: 'Captura automática', desc: 'Desde web, chat y redes' },
      { icon: LayoutGrid, title: 'Pipeline visual', desc: 'Estados arrastrables tipo Kanban' },
      { icon: Users, title: 'Base de clientes', desc: 'Registro completo con historial' },
      { icon: Upload, title: 'Importación', desc: 'Carga masiva desde Excel' },
    ],
    tags: ['Captura automática', 'Pipeline', 'Asignación', 'Importar Excel'],
  },
  {
    number: 8,
    icon: ShoppingCart,
    title: 'Proceso de venta',
    description: 'Flujo guiado paso a paso, desde la selección hasta el documento final.',
    gradient: 'from-amber-500 to-amber-600',
    menuPath: 'Detalle del vehículo → Vender / Menú lateral → Ventas',
    appLink: '/ventas',
    bullets: [
      'Flujo visual paso a paso: selecciona vehículo → cliente → define precio → método de pago',
      'Registra vehículo en parte de pago (trade-in) con valorización incluida',
      'Define múltiples métodos de pago con desglose detallado',
      'Comisión del vendedor se calcula automáticamente según configuración',
    ],
    subFeatures: [
      { icon: ChevronRight, title: 'Flujo guiado', desc: '4 pasos claros y visuales' },
      { icon: RefreshCw, title: 'Trade-In', desc: 'Vehículo en parte de pago' },
      { icon: DollarSign, title: 'Comisiones', desc: 'Cálculo automático por vendedor' },
      { icon: FileText, title: 'Documentos', desc: 'Contratos generados automáticamente' },
    ],
    tags: ['Flujo visual', 'Trade-in', 'Comisiones', 'Documentos', 'Reservas'],
  },
  {
    number: 9,
    icon: Mail,
    title: 'Marketing con IA',
    description: 'Encuentra compradores ideales y envía campañas inteligentes automáticamente.',
    gradient: 'from-indigo-500 to-indigo-600',
    menuPath: 'Menú lateral → Marketing',
    appLink: '/marketing',
    bullets: [
      'Selecciona un vehículo y la IA busca clientes compatibles por historial y preferencias',
      'Filtros inteligentes: tipo de cliente, rango de precio, umbral de similitud configurable',
      'Envía campañas de email personalizadas a los clientes seleccionados con un clic',
      'Tasador con IA: analiza precios de mercado en tiempo real para valuaciones precisas',
    ],
    subFeatures: [
      { icon: Brain, title: 'IA de búsqueda', desc: 'Clientes similares automáticamente' },
      { icon: Mail, title: 'Campañas email', desc: 'Templates personalizables' },
      { icon: DollarSign, title: 'Tasador IA', desc: 'Valuación en tiempo real' },
      { icon: TrendingUp, title: 'Análisis', desc: 'Precio min, max y promedio' },
    ],
    tags: ['IA', 'Campañas', 'Tasador', 'Email masivo'],
  },
  {
    number: 10,
    icon: Zap,
    title: 'Herramientas extra',
    description: 'Funcionalidades adicionales para potenciar tu operación diaria.',
    gradient: 'from-orange-500 to-orange-600',
    menuPath: 'Menú lateral → Financiamiento / Dashboard / Agendamientos / Documentos',
    appLink: '/',
    bullets: [
      'Crédito directo: ofrece financiamiento propio con cronograma visual de cuotas y alertas de pago',
      'Dashboard: KPIs en tiempo real con gráficos de ventas, distribución y rendimiento por vendedor',
      'Agendamientos: calendario de visitas por sucursal con intervalos de 15, 30 o 60 minutos',
      'Documentos: plantillas de compraventa, consignación y reserva con campos autocompletados',
    ],
    subFeatures: [
      { icon: CreditCard, title: 'Crédito directo', desc: 'Financiamiento con cronograma' },
      { icon: BarChart3, title: 'Dashboard', desc: 'KPIs y gráficos en tiempo real' },
      { icon: Calendar, title: 'Agendamientos', desc: 'Calendario por sucursal' },
      { icon: Printer, title: 'Documentos', desc: 'Contratos autocompletados' },
    ],
    tags: ['Crédito', 'Dashboard', 'Agenda', 'Documentos', 'Gastos'],
  },
];

// ============================================
// SIDEBAR MAP DATA
// ============================================
// Sidebar structure matching the real GoAuto dashboard admin menu
interface SidebarItem {
  icon: React.ElementType;
  label: string;
  description: string;
  detailedDescription: string;
  highlights: string[];
  stepLink: number;
  badge?: string;
}

interface SidebarGroup {
  groupLabel: string;
  groupIcon: React.ElementType;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    groupLabel: 'Principal',
    groupIcon: BarChart3,
    items: [
      {
        icon: BarChart3, label: 'Inicio', description: 'Dashboard con KPIs y resumen', stepLink: 10,
        detailedDescription: 'Tu centro de control. Aquí ves de un vistazo las métricas clave de tu automotora: vehículos en stock, ventas del mes, leads pendientes, valor del inventario y alertas inteligentes que te avisan qué necesita tu atención.',
        highlights: ['KPIs en tiempo real', 'Alertas inteligentes', 'Resumen de ventas mensual', 'Valor del inventario'],
      },
      {
        icon: FileText, label: 'Documentos', description: 'Contratos y plantillas', stepLink: 10,
        detailedDescription: 'Genera documentos profesionales automáticamente: notas de venta, cotizaciones, contratos de consignación y compraventa. Usa plantillas personalizables con los datos de tus vehículos y clientes ya prellenados.',
        highlights: ['Generación automática', 'Plantillas personalizables', 'Datos prellenados', 'Historial completo'],
      },
    ],
  },
  {
    groupLabel: 'Inventario',
    groupIcon: CarFront,
    items: [
      {
        icon: Car, label: 'Vehículos', description: 'Inventario con vista tabla y Kanban', stepLink: 4,
        detailedDescription: 'Gestiona todo tu inventario con dos vistas: tabla con columnas personalizables y filtros avanzados, o vista Kanban tipo Trello donde arrastras vehículos entre estados. Cada vehículo tiene su ficha completa con fotos, historial y documentos.',
        highlights: ['Vista tabla y Kanban', 'Estados personalizables', 'Ficha completa por vehículo', 'Filtros y búsqueda avanzada'],
      },
      {
        icon: Scale, label: 'Tasador', description: 'Valuación de vehículos con IA', stepLink: 9,
        detailedDescription: 'Obtén una tasación instantánea con inteligencia artificial. Ingresa marca, modelo, año y kilometraje para recibir un rango de precio de mercado basado en datos reales. Perfecto para compras, consignaciones y negociaciones.',
        highlights: ['Tasación con IA', 'Precio de mercado real', 'Ideal para negociaciones', 'Resultado instantáneo'],
      },
    ],
  },
  {
    groupLabel: 'Comercial',
    groupIcon: Briefcase,
    items: [
      {
        icon: MailPlus, label: 'Leads', description: 'Oportunidades y pipeline', stepLink: 7, badge: '3',
        detailedDescription: 'Todos los leads que llegan desde tu sitio web, WhatsApp y canales de venta se centralizan aquí. Asígnalos a vendedores, haz seguimiento del estado de cada oportunidad y nunca pierdas una venta potencial.',
        highlights: ['Captura automática desde web', 'Asignación a vendedores', 'Seguimiento de estado', 'Historial de interacción'],
      },
      {
        icon: Users, label: 'Clientes', description: 'Base de datos de clientes', stepLink: 7,
        detailedDescription: 'Tu CRM de clientes. Guarda toda la información de contacto, historial de compras, vehículos adquiridos y documentos asociados. Importa clientes masivamente desde Excel o agrégalos uno a uno.',
        highlights: ['CRM completo', 'Historial de compras', 'Importación masiva Excel', 'Documentos por cliente'],
      },
      {
        icon: Receipt, label: 'Ventas', description: 'Historial y proceso de ventas', stepLink: 8, badge: '1',
        detailedDescription: 'Registra y gestiona cada venta de principio a fin. Incluye método de pago, plan de cuotas, vehículo en parte de pago, comisiones del vendedor y genera la documentación automáticamente. Ve el historial completo con métricas.',
        highlights: ['Proceso completo de venta', 'Parte de pago integrado', 'Comisiones automáticas', 'Documentación generada'],
      },
      {
        icon: CreditCard, label: 'Financiamiento', description: 'Créditos directos y cuotas', stepLink: 10,
        detailedDescription: 'Ofrece financiamiento directo a tus clientes. Crea planes de cuotas flexibles, registra pagos, genera estados de cuenta y haz seguimiento de la cartera de créditos. Todo integrado con el módulo de ventas.',
        highlights: ['Planes de cuotas flexibles', 'Registro de pagos', 'Estado de cuenta', 'Seguimiento de cartera'],
      },
      {
        icon: Calendar, label: 'Agendamientos', description: 'Calendario de visitas', stepLink: 10,
        detailedDescription: 'Agenda visitas de clientes interesados y pruebas de manejo. Ve el calendario del equipo, asigna horarios a vendedores y recibe recordatorios. Los clientes también pueden agendar directamente desde tu sitio web.',
        highlights: ['Calendario visual', 'Asignación por vendedor', 'Recordatorios automáticos', 'Reserva desde la web'],
      },
    ],
  },
  {
    groupLabel: 'Marketing',
    groupIcon: Megaphone,
    items: [
      {
        icon: Megaphone, label: 'Marketing IA', description: 'Campañas inteligentes con IA', stepLink: 9,
        detailedDescription: 'Crea campañas de email marketing potenciadas por IA. Selecciona vehículos de tu inventario y la IA genera textos atractivos, asuntos persuasivos y diseños profesionales. Envía a tu base de clientes segmentada automáticamente.',
        highlights: ['Textos generados por IA', 'Segmentación automática', 'Diseños profesionales', 'Sincronizado con inventario'],
      },
      {
        icon: Instagram, label: 'Instagram', description: 'Publicar y ver estadísticas', stepLink: 6,
        detailedDescription: 'Conecta tu cuenta de Instagram Business para publicar vehículos directamente desde GoAuto. Crea posts con las fotos del inventario, textos optimizados y ve las estadísticas de cada publicación sin salir de la plataforma.',
        highlights: ['Publicación directa', 'Fotos del inventario', 'Estadísticas integradas', 'Textos optimizados'],
      },
      {
        icon: Store, label: 'Mercado Libre', description: 'Publicación automática', stepLink: 6,
        detailedDescription: 'Publica tus vehículos en Mercado Libre con un clic. Los datos, fotos y precios se sincronizan automáticamente desde tu inventario. Cuando vendes un vehículo en GoAuto, la publicación se pausa automáticamente.',
        highlights: ['Publicación con un clic', 'Sincronización automática', 'Pausa al vender', 'Datos desde inventario'],
      },
      {
        icon: ShoppingBag, label: 'Facebook', description: 'Marketplace con sync', stepLink: 6,
        detailedDescription: 'Conecta Facebook Marketplace para publicar vehículos automáticamente. Sincroniza precios, fotos y disponibilidad. Gestiona las publicaciones activas y ve métricas de rendimiento desde el panel.',
        highlights: ['Sync automático', 'Gestión centralizada', 'Métricas de rendimiento', 'Actualización de precios'],
      },
      {
        icon: Globe, label: 'ChileAutos', description: 'Exportación al marketplace', stepLink: 6,
        detailedDescription: 'Exporta tu inventario a ChileAutos de forma masiva. Selecciona los vehículos que quieres publicar, mapea las categorías y genera el archivo de exportación compatible con la plataforma.',
        highlights: ['Exportación masiva', 'Mapeo de categorías', 'Selección de vehículos', 'Formato compatible'],
      },
    ],
  },
  {
    groupLabel: 'Configuración',
    groupIcon: Settings,
    items: [
      {
        icon: Settings, label: 'Configuraciones', description: 'Datos, sucursales y estados', stepLink: 2,
        detailedDescription: 'Personaliza GoAuto para tu automotora. Configura datos de la empresa, sucursales, estados personalizados de vehículos (ej: En preparación, En vitrina, Reservado), plantillas de documentos, permisos de vendedores y notificaciones.',
        highlights: ['Estados personalizables', 'Múltiples sucursales', 'Plantillas de documentos', 'Permisos granulares'],
      },
      {
        icon: Users, label: 'Equipo', description: 'Gestión de usuarios y roles', stepLink: 3,
        detailedDescription: 'Administra tu equipo de trabajo. Invita vendedores y administradores, asigna roles con permisos específicos, ve la actividad de cada usuario y gestiona accesos. Cada vendedor tiene su propio dashboard con sus leads y ventas.',
        highlights: ['Roles y permisos', 'Dashboard por vendedor', 'Invitación por email', 'Control de accesos'],
      },
      {
        icon: Wrench, label: 'Builder', description: 'Constructor de sitio web', stepLink: 5,
        detailedDescription: 'Crea el sitio web de tu automotora sin saber programar. Elige secciones, personaliza colores, sube tu logo, configura el dominio propio y publica. Tu inventario se muestra automáticamente con búsqueda inteligente por IA para tus clientes.',
        highlights: ['Sin código necesario', 'Dominio propio', 'Inventario automático', 'Búsqueda IA para clientes'],
      },
    ],
  },
];

// Flatten for the left-side clickable cards
const allSidebarItems = sidebarGroups.flatMap((group, gi) =>
  group.items.map((item, ii) => ({ ...item, groupIndex: gi, itemIndex: ii, groupLabel: group.groupLabel }))
);

// ============================================
// TIPS DATA
// ============================================
const tips = [
  {
    icon: Lightbulb,
    title: 'Empieza con lo esencial',
    description: 'No necesitas configurar todo de una vez. Agrega tus vehículos, conecta un canal de venta y comienza. El resto lo puedes ir activando gradualmente.',
    gradient: 'from-amber-500 to-amber-600',
  },
  {
    icon: Smartphone,
    title: 'Funciona en cualquier dispositivo',
    description: 'GoAuto es 100% responsive. Gestiona inventario, responde leads y cierra ventas desde tu celular, tablet o computador.',
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    icon: BookOpen,
    title: 'Revisa las novedades',
    description: 'Constantemente agregamos mejoras. Dentro de la app ve a Novedades para conocer las últimas funcionalidades y actualizaciones.',
    gradient: 'from-violet-500 to-violet-600',
  },
  {
    icon: MessageSquare,
    title: 'Soporte por WhatsApp',
    description: 'Si tienes dudas, escríbenos directamente por WhatsApp. Respondemos rápido y te ayudamos paso a paso con lo que necesites.',
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Target,
    title: 'Activa la captura de leads',
    description: 'Tu sitio web captura leads automáticamente. Asegúrate de tener al menos un vendedor asignado para que no se pierda ninguna oportunidad.',
    gradient: 'from-rose-500 to-rose-600',
  },
  {
    icon: RefreshCw,
    title: 'Sincroniza tus canales',
    description: 'Conecta Instagram y Facebook Marketplace para que cuando vendas un vehículo, el estado se actualice automáticamente en todas partes.',
    gradient: 'from-pink-500 to-pink-600',
  },
];

// ============================================
// MAIN COMPONENT
// ============================================
const GuiaDeUso: React.FC = () => {
  const [expandedStep, setExpandedStep] = useState<number | null>(2);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedSidebarItem, setSelectedSidebarItem] = useState<number | null>(null);
  const [openSidebarGroup, setOpenSidebarGroup] = useState<number | null>(null);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleStep = (stepNumber: number) => {
    setExpandedStep(expandedStep === stepNumber ? null : stepNumber);
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
            <a href="/funcionalidades" className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors hidden sm:inline">
              Funcionalidades
            </a>
            <button onClick={() => window.open('https://portal.goauto.cl/login', '_blank')}
              className="text-[14px] font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Iniciar sesión
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/onboarding'}
              className="h-9 px-4 text-[14px] font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors">
              Comenzar
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ===== HERO SECTION ===== */}
      <section className="relative min-h-[75vh] flex items-center pt-16 overflow-hidden bg-[#fbfbfd]">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[70%] h-[70%] bg-gradient-to-bl from-blue-50/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-to-tr from-violet-50/50 via-transparent to-transparent" />
        </div>
        <motion.div animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] right-[15%] w-[400px] h-[400px] bg-gradient-to-br from-blue-200/40 to-cyan-100/30 rounded-full blur-[100px]" />
        <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-[20%] left-[10%] w-[350px] h-[350px] bg-gradient-to-tr from-violet-200/30 to-purple-100/20 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 pb-12">
            {/* Left: Text */}
            <motion.div className="flex-1 text-center lg:text-left space-y-8 max-w-2xl">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
                <span className="inline-flex items-center text-sm font-medium text-slate-500 tracking-wide">
                  <span className="w-8 h-[1px] bg-slate-300 mr-3" />
                  Guía paso a paso
                </span>
              </motion.div>
              <div className="space-y-2">
                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: appleEase }}
                  className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] font-semibold text-slate-900 tracking-[-0.035em] leading-[1.05]">
                  Aprende a usar
                </motion.h1>
                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: appleEase }}
                  className="text-[2.75rem] sm:text-[3.5rem] lg:text-[4rem] font-semibold tracking-[-0.035em] leading-[1.05]">
                  <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                    GoAuto.
                  </span>
                </motion.h1>
              </div>
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.35, ease: appleEase }}
                className="text-xl sm:text-2xl text-slate-500 font-normal leading-relaxed max-w-lg mx-auto lg:mx-0">
                10 pasos para dominar tu plataforma.
                <span className="text-slate-900"> De cero a experto.</span>
              </motion.p>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.45, ease: appleEase }}
                className="flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
                {['Inventario', 'Ventas', 'Marketing IA', 'Sitio Web'].map((f, i) => (
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
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />10 pasos</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Con ejemplos</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Links directos</span>
              </motion.div>
            </motion.div>

            {/* Right: Dashboard Preview */}
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
                    <span className="flex-1 text-center text-[12px] font-medium text-slate-500">Guía de GoAuto</span>
                    <div className="w-10" />
                  </div>
                  <div className="p-4 bg-[#f5f5f7] space-y-2.5">
                    {guideSteps.slice(0, 6).map((step, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + i * 0.08, type: 'spring', stiffness: 200 }}
                        className="bg-white rounded-xl px-3 py-2.5 flex items-center gap-3 border border-slate-200/60 shadow-sm">
                        <div className={cn("w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center", step.gradient)}>
                          <step.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-slate-900 truncate">{step.title}</div>
                          <div className="text-[10px] text-slate-400">Paso {step.number}</div>
                        </div>
                        <motion.div animate={{ scale: i < 2 ? [1, 1.2, 1] : 1 }}
                          transition={{ duration: 0.4, delay: 1 + i * 0.1 }}
                          className={cn("w-5 h-5 rounded-full flex items-center justify-center",
                            i < 2 ? 'bg-emerald-500' : 'bg-slate-100')}>
                          {i < 2 ? <Check className="h-3 w-3 text-white" /> :
                            <span className="text-[9px] text-slate-400">{i + 1}</span>}
                        </motion.div>
                      </motion.div>
                    ))}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}
                      className="text-center text-[11px] text-slate-400 pt-1">+ 4 pasos más...</motion.div>
                  </div>
                </div>
                <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/50 to-purple-100/30 blur-3xl -z-10 rounded-3xl opacity-60" />
              </Card3D>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-slate-400">
              <span className="text-xs font-medium">Desplaza para comenzar</span>
              <ChevronDown className="h-5 w-5" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ===== TIMELINE STEPS SECTION (Tu recorrido) ===== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div className="absolute top-40 right-[5%] w-72 h-72 bg-gradient-to-br from-blue-500/5 to-violet-500/5 rounded-full blur-3xl"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute bottom-40 left-[5%] w-96 h-96 bg-gradient-to-br from-violet-500/5 to-cyan-500/5 rounded-full blur-3xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }} />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: appleEase }}
            className="text-center mb-20">
            <h2 className="text-[2rem] sm:text-[2.75rem] font-semibold text-slate-900 tracking-tight mb-4">
              Tu recorrido en GoAuto
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Sigue estos 10 pasos y tendrás tu automotora funcionando al 100% en la plataforma
            </p>
            {/* Step counter pills */}
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="flex flex-wrap justify-center gap-2 mt-8">
              {guideSteps.map((step, i) => (
                <motion.button key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                  viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.04, duration: 0.3 }}
                  onClick={() => { setExpandedStep(step.number); document.getElementById(`step-${step.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
                  className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all duration-200",
                    expandedStep === step.number
                      ? 'bg-slate-900 text-white shadow-lg'
                      : step.number === 1
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:shadow-sm')}>
                  {step.number === 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <step.icon className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{step.number}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>

          {/* Steps */}
          <div className="space-y-8">
            {guideSteps.map((step, index) => {
              const Icon = step.icon;
              const isExpanded = expandedStep === step.number;
              const PreviewComponent = previewComponents[step.number];
              const isCompleted = step.number === 1;

              return (
                <motion.div key={step.number} id={`step-${step.number}`}
                  initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.6, delay: index * 0.03, ease: appleEase }}>
                  <div className={cn(
                    'bg-white rounded-2xl border overflow-hidden transition-all duration-300',
                    isCompleted && 'border-emerald-200 bg-emerald-50/30',
                    isExpanded ? 'border-slate-300 shadow-xl' : !isCompleted && 'border-slate-200/60 hover:border-slate-300 hover:shadow-lg'
                  )}>
                    {/* Card header */}
                    <button className="w-full p-6 lg:p-8 text-left flex items-start gap-5" onClick={() => toggleStep(step.number)}>
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                        isCompleted ? 'bg-emerald-500' : cn("bg-gradient-to-br", step.gradient)
                      )}>
                        {isCompleted ? <CheckCircle2 className="h-7 w-7 text-white" /> : <Icon className="h-7 w-7 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">Paso {step.number}</span>
                          {isCompleted && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Completado
                            </span>
                          )}
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            <MapPin className="h-3 w-3" /> {step.menuPath}
                          </span>
                        </div>
                        <h3 className={cn("text-[17px] lg:text-xl font-semibold", isCompleted ? 'text-emerald-800' : 'text-slate-900')}>{step.title}</h3>
                        <p className="text-[14px] text-slate-500 mt-1 leading-relaxed">{step.description}</p>
                      </div>
                      <motion.div animate={{ rotate: isExpanded ? 45 : 0 }} transition={{ duration: 0.2 }}
                        className="shrink-0 mt-2">
                        <span className="text-2xl text-slate-400 leading-none">+</span>
                      </motion.div>
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: appleEase }}
                          className="overflow-hidden">
                          <div className="px-6 lg:px-8 pb-8 pt-0">
                            <div className="border-t border-slate-100 pt-6">
                              {/* Menu path for mobile */}
                              <div className="sm:hidden mb-4">
                                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                  <MapPin className="h-3 w-3" /> {step.menuPath}
                                </span>
                              </div>

                              <div className="grid lg:grid-cols-2 gap-8">
                                {/* Left: Details */}
                                <div className="space-y-6">
                                  {/* Bullets */}
                                  <div className="space-y-3">
                                    {step.bullets.map((bullet, i) => (
                                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.06, duration: 0.3, ease: appleEase }}
                                        className="flex items-start gap-3">
                                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <Check className="h-3 w-3 text-emerald-600" />
                                        </div>
                                        <span className="text-[14px] text-slate-600 leading-relaxed">{bullet}</span>
                                      </motion.div>
                                    ))}
                                  </div>

                                  {/* Sub-features grid */}
                                  <div className="grid grid-cols-2 gap-3">
                                    {step.subFeatures.map((sf, i) => (
                                      <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.2 + i * 0.05 }}
                                        className="flex items-start gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                          <sf.icon className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <div>
                                          <h4 className="text-[13px] font-medium text-slate-900">{sf.title}</h4>
                                          <p className="text-[11px] text-slate-500">{sf.desc}</p>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </div>

                                  {/* Tags */}
                                  <div className="flex flex-wrap gap-2">
                                    {step.tags.map((tag, i) => (
                                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[11px] text-slate-600 font-medium">
                                        <Check className="h-3 w-3 text-slate-400" />
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {/* Right: Mini preview */}
                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.15, duration: 0.4, ease: appleEase }}>
                                  <Card3D className="w-full">
                                    <div className="bg-white rounded-[16px] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.12)] border border-slate-200/60 overflow-hidden">
                                      <div className="bg-gradient-to-b from-slate-100 to-slate-50 px-3 py-2 flex items-center border-b border-slate-200/80">
                                        <div className="flex gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                                          <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                                          <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                                        </div>
                                        <span className="flex-1 text-center text-[11px] font-medium text-slate-500">GoAuto</span>
                                        <div className="w-8" />
                                      </div>
                                      <div className="p-4 bg-[#f5f5f7] min-h-[300px]">
                                        <PreviewComponent />
                                      </div>
                                    </div>
                                    <div className={cn(
                                      "absolute -inset-3 blur-2xl -z-10 rounded-2xl opacity-30",
                                      `bg-gradient-to-br ${step.gradient}`
                                    )} />
                                  </Card3D>
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== QUICK OVERVIEW - Sidebar Map ===== */}
      <section className="py-20 lg:py-28 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, ease: appleEase }}
            className="text-center mb-16">
            <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-slate-900 to-slate-800 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <MapPin className="h-4 w-4 text-blue-400" />
              Mapa de la plataforma
            </motion.div>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-semibold text-slate-900 tracking-tight mb-4">
              ¿Dónde encuentro cada cosa?
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Haz clic en cualquier sección para ver dónde está en el menú
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-[minmax(0,1.2fr)_240px_minmax(0,1fr)] gap-6 lg:gap-8 items-stretch">
            {/* Left: Clickable section cards */}
            <div className="space-y-4 order-2 lg:order-1">
              {sidebarGroups.map((group, gi) => (
                <motion.div key={gi} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: gi * 0.06, ease: appleEase }}>
                  {/* Group header */}
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <group.groupIcon className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{group.groupLabel}</span>
                    <div className="flex-1 h-px bg-slate-200 ml-2" />
                  </div>
                  {/* Items - 3 columns */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.items.map((item, ii) => {
                      const isSelected = selectedSidebarItem !== null && selectedSidebarItem === allSidebarItems.findIndex(
                        si => si.groupIndex === gi && si.itemIndex === ii
                      );
                      const flatIndex = allSidebarItems.findIndex(si => si.groupIndex === gi && si.itemIndex === ii);
                      return (
                        <motion.div key={ii} whileHover={{ y: -2 }}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSidebarItem(null);
                              setOpenSidebarGroup(null);
                            } else {
                              setSelectedSidebarItem(flatIndex);
                              setOpenSidebarGroup(gi);
                            }
                          }}
                          className={cn(
                            "rounded-xl p-3 border transition-all duration-200 cursor-pointer",
                            isSelected
                              ? "bg-slate-900 border-slate-700 shadow-lg shadow-slate-900/20"
                              : "bg-[#fbfbfd] border-slate-200/60 hover:border-slate-300 hover:shadow-md"
                          )}>
                          <div className="flex items-start gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 shrink-0 mt-0.5",
                              isSelected ? "bg-white/15" : "bg-white border border-slate-200/80 shadow-sm"
                            )}>
                              <item.icon className={cn("h-4 w-4", isSelected ? "text-white" : "text-slate-500")} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <h4 className={cn("text-[12px] font-semibold leading-tight", isSelected ? "text-white" : "text-slate-900")}>{item.label}</h4>
                                {item.badge && (
                                  <span className="text-[7px] font-bold bg-red-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0">{item.badge}</span>
                                )}
                              </div>
                              <p className={cn("text-[10px] leading-[1.4] mt-0.5", isSelected ? "text-slate-400" : "text-slate-500")}>{item.description}</p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Center: Sidebar Preview - replica of real sidebar, stretches to match left */}
            <div className="order-1 lg:order-2 flex flex-col">
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.2, ease: appleEase }}
                className="h-full flex flex-col">
                <div className="relative flex-1">
                  <div className="bg-white rounded-[20px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] border border-slate-200/60 overflow-hidden flex flex-col h-full">
                    {/* Logo area */}
                    <div className="px-3.5 pt-4 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center shadow-sm">
                          <span className="text-[9px] font-bold text-white">GA</span>
                        </div>
                        <div>
                          <div className="text-[11px] font-semibold text-slate-900">AutoMax Chile</div>
                          <div className="text-[9px] text-slate-400">Mi automotora</div>
                        </div>
                      </div>
                    </div>

                    {/* Sidebar groups - accordion */}
                    <div className="p-2.5 space-y-0.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-0.5">
                        {sidebarGroups.map((group, gi) => {
                          const isOpen = openSidebarGroup === gi;
                          const hasActiveItem = selectedSidebarItem !== null &&
                            allSidebarItems[selectedSidebarItem]?.groupIndex === gi;

                          return (
                            <div key={gi}>
                              {gi > 0 && <div className="h-px bg-slate-100 my-1" />}

                              <motion.div
                                onClick={() => {
                                  if (isOpen) {
                                    setOpenSidebarGroup(null);
                                    if (hasActiveItem) setSelectedSidebarItem(null);
                                  } else {
                                    setOpenSidebarGroup(gi);
                                  }
                                }}
                                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                                className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5">
                                  <group.groupIcon className={cn("h-3 w-3 transition-colors duration-200", hasActiveItem ? "text-blue-500" : isOpen ? "text-slate-600" : "text-slate-400")} />
                                  <span className={cn("text-[10px] font-semibold transition-colors duration-200", hasActiveItem ? "text-blue-600" : isOpen ? "text-slate-700" : "text-slate-400")}>
                                    {group.groupLabel}
                                  </span>
                                </div>
                                <motion.div
                                  animate={{ rotate: isOpen ? 180 : 0 }}
                                  transition={{ duration: 0.25, ease: appleEase }}
                                >
                                  <ChevronDown className={cn("h-2.5 w-2.5 transition-colors duration-200", hasActiveItem ? "text-blue-400" : isOpen ? "text-slate-500" : "text-slate-300")} />
                                </motion.div>
                              </motion.div>

                              <AnimatePresence initial={false}>
                                {isOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: appleEase }}
                                    className="overflow-hidden"
                                  >
                                    <div className="space-y-0.5 pl-3.5 ml-1 border-l-2 border-slate-100 mt-0.5 mb-1">
                                      {group.items.map((item, ii) => {
                                        const flatIndex = allSidebarItems.findIndex(si => si.groupIndex === gi && si.itemIndex === ii);
                                        const isActive = selectedSidebarItem === flatIndex;

                                        return (
                                          <motion.div
                                            key={ii}
                                            initial={{ x: -8, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ duration: 0.2, delay: ii * 0.03, ease: appleEase }}
                                            whileHover={{ x: 2 }}
                                            onClick={() => {
                                              if (isActive) {
                                                setSelectedSidebarItem(null);
                                              } else {
                                                setSelectedSidebarItem(flatIndex);
                                                setOpenSidebarGroup(gi);
                                              }
                                            }}
                                            className={cn(
                                              "flex items-center gap-2 px-2 py-[5px] rounded-md cursor-pointer transition-all duration-150",
                                              isActive
                                                ? "bg-blue-50 shadow-sm border border-blue-200/60"
                                                : "hover:bg-slate-50 border border-transparent"
                                            )}
                                          >
                                            <item.icon className={cn("h-3 w-3 shrink-0 transition-colors duration-200",
                                              isActive ? 'text-blue-600' : 'text-slate-400')} />
                                            <span className={cn("text-[10px] font-medium transition-colors duration-200 flex-1",
                                              isActive ? 'text-blue-700' : 'text-slate-600')}>
                                              {item.label}
                                            </span>
                                            {item.badge && (
                                              <span className="text-[7px] font-bold bg-red-500 text-white w-3.5 h-3.5 rounded-full flex items-center justify-center">{item.badge}</span>
                                            )}
                                            {isActive && (
                                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 500 }}
                                                className="w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                                            )}
                                          </motion.div>
                                        );
                                      })}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>

                      {/* Novedades - always at bottom */}
                      <div>
                        <div className="h-px bg-slate-100 my-1" />
                        <div className="flex items-center gap-2 px-2 py-[5px] rounded-md bg-yellow-50 border border-yellow-200/60">
                          <Zap className="h-3 w-3 text-yellow-600" />
                          <span className="text-[10px] font-medium text-yellow-800">Novedades</span>
                          <span className="ml-auto text-[7px] font-bold bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">NUEVO</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Glow */}
                  <div className="absolute -inset-4 bg-gradient-to-b from-blue-100/40 to-purple-100/30 blur-3xl -z-10 rounded-3xl opacity-60" />
                </div>
              </motion.div>
            </div>

            {/* Right: Detailed description (sticky) */}
            <div className="lg:sticky lg:top-24 order-3">
              <AnimatePresence mode="wait">
                {selectedSidebarItem !== null ? (
                  <motion.div key={selectedSidebarItem}
                    initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.3, ease: appleEase }}>
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-lg shadow-slate-200/50 overflow-hidden">
                      {/* Header with gradient */}
                      <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                            {React.createElement(allSidebarItems[selectedSidebarItem].icon, { className: "h-4 w-4 text-blue-400" })}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-semibold text-white">{allSidebarItems[selectedSidebarItem].label}</h4>
                            <p className="text-[10px] text-slate-400">{allSidebarItems[selectedSidebarItem].groupLabel} → {allSidebarItems[selectedSidebarItem].label}</p>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="p-4">
                        <p className="text-[12px] leading-[1.6] text-slate-600 mb-4">
                          {allSidebarItems[selectedSidebarItem].detailedDescription}
                        </p>

                        {/* Highlights */}
                        <div className="space-y-1.5 mb-4">
                          {allSidebarItems[selectedSidebarItem].highlights.map((h, i) => (
                            <motion.div key={i}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2, delay: i * 0.05, ease: appleEase }}
                              className="flex items-start gap-2"
                            >
                              <div className="w-1 h-1 rounded-full bg-blue-500 mt-[6px] shrink-0" />
                              <span className="text-[11px] text-slate-700 font-medium">{h}</span>
                            </motion.div>
                          ))}
                        </div>

                        {/* Step link */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <BookOpen className="h-3 w-3" />
                            <span>Aprende más en</span>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            Paso {allSidebarItems[selectedSidebarItem].stepLink}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="placeholder"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 p-6 text-center">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <MousePointerClick className="h-5 w-5 text-slate-400" />
                      </div>
                      <p className="text-[13px] font-medium text-slate-400">Selecciona una sección</p>
                      <p className="text-[11px] text-slate-300 mt-1">Haz clic en cualquier item para ver qué hace</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TIPS SECTION ===== */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.6, ease: appleEase }}
            className="text-center mb-16">
            <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Lightbulb className="h-4 w-4" />
              Tips de experto
            </motion.div>
            <h2 className="text-[2rem] sm:text-[2.5rem] font-semibold text-slate-900 tracking-tight mb-4">
              Sácale el máximo provecho
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Consejos de otros usuarios para que tu experiencia sea aún mejor
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tips.map((tip, index) => {
              const Icon = tip.icon;
              return (
                <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ duration: 0.5, delay: index * 0.06, ease: appleEase }}
                  whileHover={{ y: -5 }}
                  className="bg-[#fbfbfd] rounded-2xl p-7 border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-300 group">
                  <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 shadow-lg group-hover:scale-105 transition-transform", tip.gradient)}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-[17px] font-semibold text-slate-900 mb-3">{tip.title}</h3>
                  <p className="text-[14px] text-slate-500 leading-relaxed">{tip.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-blue-500/5" />
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[10%] right-[10%] w-[400px] h-[400px] bg-gradient-to-br from-blue-500/20 to-violet-500/10 rounded-full blur-[100px]" />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.15, 0.05] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          className="absolute bottom-[10%] left-[10%] w-[300px] h-[300px] bg-gradient-to-tr from-violet-500/20 to-cyan-500/10 rounded-full blur-[100px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ duration: 0.8, ease: appleEase }}
            className="space-y-8">
            <h2 className="text-[2rem] sm:text-[2.5rem] lg:text-[3rem] font-semibold text-white tracking-[-0.02em]">
              ¿Listo para empezar?
            </h2>
            <p className="text-lg sm:text-xl text-slate-400 max-w-lg mx-auto">
              Crea tu cuenta gratis y comienza a gestionar tu automotora de forma inteligente.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/onboarding'}
                className="group inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-slate-900 bg-white rounded-full hover:bg-slate-50 transition-colors duration-300 shadow-lg">
                <span>Crear cuenta gratis</span>
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
              </motion.button>
              <motion.a whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                href="https://wa.me/56989904038?text=Hola%2C%20necesito%20ayuda%20con%20GoAuto"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-white border border-white/20 rounded-full hover:bg-white/10 transition-colors duration-300">
                <MessageSquare className="mr-2 h-4 w-4" />
                <span>Hablar por WhatsApp</span>
              </motion.a>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <motion.a whileHover={{ scale: 1.02 }} href="/funcionalidades"
                className="inline-flex items-center gap-2 text-[14px] text-slate-400 hover:text-white transition-colors">
                <ExternalLink className="h-3.5 w-3.5" /> Ver todas las funcionalidades
              </motion.a>
            </div>

            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="flex items-center justify-center gap-6 pt-2 text-[13px] text-slate-500">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />7 días gratis</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Sin tarjeta</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Cancela cuando quieras</span>
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
                  Guía de uso
                </a>
                <a href="https://portal.goauto.cl/login" target="_blank" rel="noopener noreferrer" className="block text-[14px] text-slate-600 hover:text-slate-900 transition-colors">
                  Iniciar sesión
                </a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[13px] text-slate-400">© {new Date().getFullYear()} GoAuto. Todos los derechos reservados.</p>
            <p className="text-[13px] text-slate-400">Hecho en Chile</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GuiaDeUso;
