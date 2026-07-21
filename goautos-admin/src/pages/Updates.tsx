import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdatesNotification } from '@/hooks/useUpdatesNotification';
import { cn } from '@/lib/utils';
import {
  LuArrowRight,
  LuBookOpen,
  LuSparkles,
  LuClock,
  LuPlay,
  LuFlame,
  LuLayoutGrid,
  LuNewspaper,
  LuGraduationCap,
  LuLifeBuoy,
  LuExternalLink,
  LuPlus,
  LuSettings,
  LuHistory,
  LuBug,
  LuTrendingUp,
  LuGitBranch,
  LuSearch,
  LuChevronDown,
  LuChevronUp
} from 'react-icons/lu';
import {
  getUpdates,
  getFeaturedUpdate,
  getChangelogEntries,
  UpdateWithAuthor
} from '@/services/updatesService';

// --- 1. TYPES & DATA ---

type ChangeType = 'feat' | 'fix' | 'perf' | 'chore';
type Category = 'feature' | 'guide' | 'announcement';
type FilterType = 'all' | 'news' | 'guides';

interface ChangelogItem {
  type: ChangeType;
  text: string;
}

interface Author {
  name: string;
  role: string;
  initials: string;
}

interface Post {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  category: Category;
  author: Author;
  gradient: string;
  featured?: boolean;
  image_url?: string;
}

interface StaticChangelogEntry {
  version: string;
  date: string;
  items: ChangelogItem[];
}

const STATIC_CHANGELOG: StaticChangelogEntry[] = [
  {
    version: 'v3.2',
    date: '2026-03-29',
    items: [
      { type: 'feat', text: 'Builder multi-página con traducciones IA' },
      { type: 'feat', text: 'Monitoreo centralizado de errores con alertas' },
      { type: 'feat', text: 'Soporte múltiples vehículos en parte de pago' },
      { type: 'fix', text: 'Detalle financiero en nota de venta mejorado' },
      { type: 'fix', text: 'Crash en registro de trade-in resuelto' },
    ],
  },
  {
    version: 'v3.1',
    date: '2026-03-15',
    items: [
      { type: 'feat', text: 'Galería flotante en vista previa de vehículo' },
      { type: 'feat', text: 'Mensajes de error amigables en español' },
      { type: 'fix', text: 'Rediseño completo de creación de leads' },
      { type: 'fix', text: 'PDF editor con panel lateral renovado' },
      { type: 'perf', text: 'Carga optimizada con loading screen animado' },
    ],
  },
  {
    version: 'v3.0',
    date: '2026-02-28',
    items: [
      { type: 'feat', text: 'Dashboard con gráfico donut y análisis de marcas' },
      { type: 'feat', text: 'Rediseño tabla de ventas y detalle de venta' },
      { type: 'feat', text: 'Sidebar reorganizado con perfil de usuario' },
      { type: 'fix', text: 'Documentos con tabs pill y columnas ordenables' },
      { type: 'fix', text: 'Wizard de creación de vehículos simplificado' },
    ],
  },
  {
    version: 'v2.8',
    date: '2026-01-30',
    items: [
      { type: 'feat', text: 'Integración Facebook Marketplace completa' },
      { type: 'feat', text: 'Tasador IA con historial de tasaciones' },
      { type: 'feat', text: 'Búsqueda inteligente con IA (Edge Function)' },
      { type: 'fix', text: 'Instagram API reconectada y estable' },
    ],
  },
  {
    version: 'v2.6',
    date: '2025-12-15',
    items: [
      { type: 'feat', text: 'Sección Novedades y tutoriales integrada' },
      { type: 'feat', text: 'Panel superadmin v2 con métricas mejoradas' },
      { type: 'fix', text: 'Venta de vehículos: keys duplicadas resueltas' },
      { type: 'feat', text: 'Suscripciones con datos en configuración' },
    ],
  },
];

// --- HELPER FUNCTIONS ---

const parseGradient = (gradient?: string) => {
  if (!gradient) return { type: 'class', value: 'from-sky-500 to-sky-400' };

  // Check if gradient uses custom hex colors
  const hexPattern = /from-\[(#[0-9a-fA-F]{6})\]\s+to-\[(#[0-9a-fA-F]{6})\]/;
  const match = gradient.match(hexPattern);

  if (match) {
    // Return inline style for custom hex gradients
    return {
      type: 'inline',
      value: `linear-gradient(to right, ${match[1]}, ${match[2]})`
    };
  }

  // Return className for Tailwind gradients
  return { type: 'class', value: gradient };
};

// --- COMPONENTS ---

const TypeBadge = ({ type }: { type: ChangeType }) => {
  const config = {
    feat: { label: 'NEW' },
    fix: { label: 'FIX' },
    perf: { label: 'PERF' },
    chore: { label: 'MISC' },
  };
  const { label } = config[type];
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider h-fit bg-slate-100 text-slate-500 border border-slate-200">
      {label}
    </span>
  );
};

const FadeIn = ({ children, delay = 0, className }: { children: React.ReactNode, delay?: number, className?: string }) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={cn(
      "transition-all duration-700 ease-out transform",
      isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      className
    )}>
      {children}
    </div>
  );
};

const CustomHeader = ({
  activeTab,
  onTabChange,
  searchTerm,
  onSearchChange
}: {
  activeTab: FilterType;
  onTabChange: (t: FilterType) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}) => {
  const { t } = useI18n();

  const tabs = [
    { id: 'all', label: t('updates.tabs.exploreAll', { defaultValue: 'Explorar todo' }), icon: LuLayoutGrid },
    { id: 'news', label: t('updates.tabs.news', { defaultValue: 'Novedades' }), icon: LuNewspaper },
    { id: 'guides', label: t('updates.tabs.guides', { defaultValue: 'Tutoriales' }), icon: LuGraduationCap },
  ];

  return (
    <div className="mb-6">
      <div className="w-full flex items-center gap-2">
<div className="flex flex-nowrap gap-1.5 shrink-0">
          {tabs.map((tab) => {
             const isActive = activeTab === tab.id;
             return (
               <button
                 key={tab.id}
                 onClick={() => onTabChange(tab.id as FilterType)}
                 className={cn(
                   "flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all",
                   isActive
                     ? "bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]"
                     : "hover:bg-slate-200/60 text-slate-600"
                 )}
               >
                 <tab.icon className={cn("w-4 h-4", isActive ? "text-white/70" : "text-slate-400")} />
                 {tab.label}
               </button>
             );
          })}
        </div>

        <div className="relative flex-1 min-w-0 ml-auto">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('updates.search.placeholder', { defaultValue: 'Buscar novedades, tutoriales...' })}
            className="w-full h-9 pl-9 pr-8 rounded-xl bg-white border border-slate-200/60 text-[13px] text-slate-500 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors text-slate-500 hover:text-slate-700"
            >
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const HeroSection = ({ post, onNavigate, t }: { post: Post; onNavigate: (slug: string) => void; t: (key: string, options?: any) => string }) => (
  <div className="group relative w-full overflow-hidden rounded-3xl bg-slate-900 transition-all duration-500 hover:scale-[1.002] cursor-pointer" onClick={() => onNavigate(post.id)}>
    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-90 mix-blend-overlay", post.gradient)} />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />

    <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
      <div className="flex-1 space-y-3">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-medium">
          <LuFlame className="w-3 h-3 text-orange-400" />
          <span>{t('updates.featured', { defaultValue: 'Destacado del mes' })}</span>
        </div>

        <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-[1.1]">
          {post.title}
        </h2>

        <p className="text-sm text-sky-100/90 max-w-xl leading-relaxed">
          {post.excerpt}
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <button className="flex items-center gap-2 bg-white text-sky-900 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-sky-50 transition-colors" onClick={(e) => { e.stopPropagation(); onNavigate(post.id); }}>
            {t('updates.readArticle', { defaultValue: 'Leer artículo' })}
            <LuArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="hidden lg:block w-1/4 h-40 relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-2xl border border-white/10 backdrop-blur-sm transform rotate-6 translate-y-4 translate-x-4 transition-transform group-hover:rotate-3 group-hover:translate-y-2" />
        <div className="absolute inset-0 bg-slate-950/80 rounded-2xl border border-white/10 backdrop-blur-md p-4 flex flex-col gap-2 transform transition-transform group-hover:-translate-y-2">
           <div className="w-9 h-9 rounded-lg bg-sky-500/20 flex items-center justify-center mb-1">
             <LuSparkles className="w-4 h-4 text-sky-400" />
           </div>
           <div className="h-2 w-2/3 bg-white/20 rounded-full" />
           <div className="h-2 w-1/2 bg-white/20 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

const BlogCard = ({ post, onNavigate, t }: { post: Post; onNavigate: (slug: string) => void; t: (key: string, options?: any) => string }) => {
  const gradientConfig = parseGradient(post.gradient);

  return (
    <div className="group flex items-center gap-4 py-3 px-4 bg-white rounded-xl border border-slate-200 hover:border-sky-200 transition-all duration-200 cursor-pointer" onClick={() => onNavigate(post.id)}>
      {/* Left gradient accent */}
      {gradientConfig.type === 'inline' ? (
        <div className="w-1 h-10 rounded-full shrink-0" style={{ background: gradientConfig.value }} />
      ) : (
        <div className={cn("w-1 h-10 rounded-full shrink-0 bg-gradient-to-b", gradientConfig.value)} />
      )}

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
          {post.title}
        </h3>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {post.excerpt}
        </p>
      </div>

      <span className={cn(
        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0",
        "bg-sky-50 text-sky-600"
      )}>
        {post.category === 'guide' ? t('updates.tutorial', { defaultValue: 'Tutorial' }) : t('updates.news', { defaultValue: 'Novedad' })}
      </span>

      <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-1">
        <LuClock className="w-3 h-3" />
        {post.readTime}
      </span>

      <LuArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-500 shrink-0 transition-colors" />
    </div>
  );
};

// --- MAIN PAGE ---

const Updates = () => {
  const [, navigate] = useLocation();
  const { userRole } = useAuth();
  const { t } = useI18n();
  const { markAsViewed } = useUpdatesNotification();
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [posts, setPosts] = useState<UpdateWithAuthor[]>([]);
  const [featuredPost, setFeaturedPost] = useState<UpdateWithAuthor | null>(null);
  const [changelogData, setChangelogData] = useState<UpdateWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [changelogExpanded, setChangelogExpanded] = useState(false);

  // Mark updates as viewed when component mounts
  useEffect(() => {
    markAsViewed();
  }, [markAsViewed]);

  // Load updates from Supabase
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load all published updates (excluding changelog for the main list)
      const allUpdates = await getUpdates({
        status: 'published',
        client_id: null, // Only global updates
      });

      // Separate featured update
      const featured = await getFeaturedUpdate();
      setFeaturedPost(featured);

      // Separate regular updates (exclude featured)
      const regularUpdates = allUpdates.filter(
        (u) => !u.featured && u.type !== 'changelog'
      );
      setPosts(regularUpdates);

      // Load changelog entries
      const changelog = await getChangelogEntries(5);
      setChangelogData(changelog);
    } catch (error) {
      console.error('Error loading updates:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter posts based on selected filter and search term
  const filteredPosts = posts.filter((post) => {
    // Apply category filter
    let matchesFilter = true;
    if (filter === 'guides') matchesFilter = post.type === 'tutorial';
    if (filter === 'news') matchesFilter = post.type === 'feature';

    // Apply search filter
    let matchesSearch = true;
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      matchesSearch =
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt.toLowerCase().includes(searchLower);
    }

    return matchesFilter && matchesSearch;
  });

  // Show hero only if filter is 'all' AND (no search OR featured post matches search)
  const showHero = filter === 'all' && featuredPost && (() => {
    if (!searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      featuredPost.title.toLowerCase().includes(searchLower) ||
      featuredPost.excerpt.toLowerCase().includes(searchLower)
    );
  })();

  // Convert update to post format for BlogCard
  const updateToPost = (update: UpdateWithAuthor): Post => ({
    id: update.id,
    title: update.title,
    excerpt: update.excerpt,
    date: update.published_at
      ? new Date(update.published_at).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '',
    readTime: update.read_time || '5 min',
    category: (update.category as Category) || 'feature',
    author: {
      name: update.author_name || 'GoAuto Team',
      role: update.author_role || 'Team',
      initials: update.author_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'GA',
    },
    gradient: update.gradient || 'from-sky-500 to-sky-400',
    featured: update.featured || false,
    image_url: update.image_url,
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-4">
          <div className="h-9 w-72 bg-slate-200/60 rounded-xl animate-pulse" />
          <div className="h-48 w-full bg-slate-200/60 rounded-2xl animate-pulse" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 w-full bg-slate-200/60 rounded-xl animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#0ea5e9 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
      />

      <div className="relative z-10 p-4 lg:p-8 max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">

            {/* --- LEFT COLUMN: CONTENT --- */}
            <div className="xl:col-span-8 space-y-10 min-h-screen">

                <CustomHeader
                  activeTab={filter}
                  onTabChange={setFilter}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                />

                {showHero && featuredPost && (
                  <FadeIn delay={100}>
                      <HeroSection post={updateToPost(featuredPost)} onNavigate={() => navigate(`/novedades/${featuredPost.slug}`)} t={t} />
                  </FadeIn>
                )}

                <div className="space-y-6">
                    <FadeIn delay={200} className="flex items-center justify-between pb-2">
                        <h3 className="text-lg font-bold text-slate-800">
                            {filter === 'guides'
                                ? t('updates.sections.tutorials', { defaultValue: 'Tutoriales & Guías' })
                                : filter === 'news'
                                ? t('updates.sections.recentNews', { defaultValue: 'Novedades Recientes' })
                                : t('updates.sections.recentArticles', { defaultValue: 'Artículos Recientes' })}
                        </h3>
                    </FadeIn>

                    {filteredPosts.length > 0 ? (
                      <div className="flex flex-col gap-2">
                          {filteredPosts.map((update, idx) => (
                              <FadeIn key={update.id} delay={300 + (idx * 50)}>
                                  <BlogCard post={updateToPost(update)} onNavigate={() => navigate(`/novedades/${update.slug}`)} t={t} />
                              </FadeIn>
                          ))}
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-500">{t('updates.empty', { defaultValue: 'No hay artículos en esta categoría aún.' })}</p>
                      </div>
                    )}
                </div>

                <div className="h-20" />
            </div>

            {/* --- RIGHT COLUMN: STICKY SIDEBAR --- */}
            <div className="hidden xl:flex xl:col-span-4 flex-col gap-6 sticky top-6 h-[calc(100vh-3rem)]">

                {/* --- WIDGET: CENTRO DE AYUDA --- */}
                <FadeIn delay={400} className="shrink-0">
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-sky-50/50 border border-sky-100/50 p-6 transition-all duration-300 hover:border-sky-200">
                        {/* Decoración de fondo animada */}
                        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-100/40 blur-3xl transition-transform duration-500 group-hover:translate-x-4 group-hover:translate-y-4" />
                        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-sky-100/40 blur-3xl transition-transform duration-500 group-hover:-translate-x-4 group-hover:-translate-y-4" />

                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-sky-100/80 text-sky-600 rounded-xl transition-all duration-300 group-hover:rotate-12 group-hover:bg-sky-500 group-hover:text-white">
                                    <LuLifeBuoy className="h-6 w-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-base text-slate-800 leading-none mb-1">{t('updates.helpCenter.title', { defaultValue: 'Centro de Ayuda' })}</h4>
                                    <span className="text-[11px] text-slate-500 font-medium">{t('updates.helpCenter.subtitle', { defaultValue: 'Documentación y Soporte' })}</span>
                                </div>
                            </div>

                            <p className="text-slate-600 text-xs leading-relaxed font-medium">
                                {t('updates.helpCenter.description', { defaultValue: '¿Tienes dudas? Revisa nuestras guías detalladas o contacta a nuestro equipo de éxito.' })}
                            </p>

                            <button className="group/btn flex items-center justify-center gap-2 w-full rounded-lg bg-sky-500 py-2.5 text-xs font-bold text-white transition-all hover:bg-sky-600 active:scale-95 mt-2">
                                <span>{t('updates.helpCenter.button', { defaultValue: 'Explorar Documentación' })}</span>
                                <LuExternalLink className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-0.5" />
                            </button>
                        </div>
                    </div>
                </FadeIn>

                {/* --- WIDGET: CHANGELOG COLAPSABLE --- */}
                <FadeIn delay={500} className={cn(
                  "bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col",
                  changelogExpanded ? "flex-1 min-h-0" : "shrink-0"
                )}>
                    <button
                      onClick={() => setChangelogExpanded(!changelogExpanded)}
                      className="w-full px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center hover:bg-slate-100/50 transition-colors group shrink-0"
                    >
                        <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-1.5">
                            <LuHistory className="w-3.5 h-3.5" />
                            {t('updates.changelog.title', { defaultValue: 'Changelog' })}
                        </h3>
                        {changelogExpanded ? (
                          <LuChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        ) : (
                          <LuChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                        )}
                    </button>

                    {changelogExpanded && (
                      <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                          {(() => {
                            // Use DB entries if available, otherwise static fallback
                            const dbEntries = changelogData.map((entry) => {
                              let items: ChangelogItem[] = [];
                              if (entry.content && typeof entry.content === 'object' && Array.isArray(entry.content.items)) {
                                items = entry.content.items;
                              }
                              return {
                                key: entry.id,
                                version: entry.version || 'v1.0.0',
                                date: entry.published_at
                                  ? new Date(entry.published_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                                  : '',
                                items,
                                excerpt: entry.excerpt,
                              };
                            });

                            const staticEntries = STATIC_CHANGELOG.map((entry) => ({
                              key: entry.version,
                              version: entry.version,
                              date: new Date(entry.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
                              items: entry.items,
                              excerpt: '',
                            }));

                            // Dinámicas (auto-generadas por push a production) arriba del
                            // histórico estático, para no perder la historia previa.
                            const entries = [...dbEntries, ...staticEntries];

                            return entries.map((entry, idx) => (
                              <div key={entry.key} className="relative pl-5">
                                <div className="absolute left-0 top-1.5 w-1.5 h-1.5 rounded-full bg-slate-300 ring-3 ring-white" />
                                {idx !== entries.length - 1 && (
                                  <div className="absolute left-[2.5px] top-3.5 bottom-[-24px] w-[1px] bg-slate-100" />
                                )}
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-mono text-[11px] font-semibold text-slate-500">
                                    {entry.version}
                                  </span>
                                  <span className="text-[10px] text-slate-400">{entry.date}</span>
                                </div>
                                {entry.items.length > 0 ? (
                                  <div className="space-y-1">
                                    {entry.items.map((item, itemIdx) => (
                                      <div key={itemIdx} className="flex items-start gap-1.5">
                                        <TypeBadge type={item.type} />
                                        <span className="text-xs text-slate-600 leading-snug flex-1">
                                          {item.text}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : entry.excerpt ? (
                                  <p className="text-xs text-slate-600 leading-snug">{entry.excerpt}</p>
                                ) : null}
                              </div>
                            ));
                          })()}
                      </div>
                    )}
                </FadeIn>

            </div>
        </div>
      </div>

      {/* Botón flotante para superadmin - Gestionar Novedades */}
      {userRole === 'superadmin' && (
        <button
          onClick={() => navigate('/configuracion/novedades')}
          className="fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 bg-sky-500 hover:bg-sky-600 text-white rounded-full transition-all duration-300 hover:scale-105 group"
          title={t('updates.manage', { defaultValue: 'Gestionar Novedades' })}
        >
          <LuSettings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
          <span className="font-semibold">{t('updates.manage', { defaultValue: 'Gestionar Novedades' })}</span>
        </button>
      )}
    </DashboardLayout>
  );
};

export default Updates;