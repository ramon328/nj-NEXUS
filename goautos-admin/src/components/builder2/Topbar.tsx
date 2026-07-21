import React, { useState, useEffect, useMemo } from 'react';
import { useEditor } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'wouter';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
// Switch removed — theme config now uses RadioGroup
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import lz from 'lzutf8';
import { useAuth } from '@/contexts/AuthContext';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import {
  Smartphone,
  Tablet,
  Monitor,
  Globe,
  Info,
  RefreshCw,
  Trash2,
  Link as LinkIcon,
  Copy,
  Check,
  ArrowLeft,
  Lightbulb,
  LayoutTemplate,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useBuilderTour } from '@/hooks/useBuilderTour';
import { TemplateSelectorModal } from './TemplateSelectorModal';
import { getTemplateById, builderTemplates, type ColorScheme } from './templates/builderTemplates';
import { toast } from 'sonner';
import { BUILDER_PAGES, SYSTEM_PAGES, RESERVED_SLUGS, type PageSlug, type CustomPage } from './constants/builderPages';
import { Home, CreditCard, Car, ShoppingCart, Search, Mail, Building2, Plus, X, FileText } from 'lucide-react';
import posthog from '@/utils/posthog';

// ── Auto-translate builder texts using AI ──
const TEXT_PROPS = new Set([
  'title', 'subtitle', 'text', 'description', 'buttonText', 'buttonTextSecondary',
  'ctaText', 'highlightText', 'highlightedText', 'searchPlaceholder',
  'sectionTitle', 'eyebrowText', 'copyrightText', 'detailsButtonText',
  'newBadgeText', 'filterLabel', 'allLabel', 'teamTitle', 'teamSubtitle',
]);

async function translateBuilderTexts(
  pages: Record<string, { light: string; dark: string }>,
  clientId: number
) {
  try {
    // Extract all translatable texts from all pages (use light variant as source)
    const allTexts: Record<string, string> = {};
    for (const [slug, { light }] of Object.entries(pages)) {
      if (!light) continue;
      let json: any = lz.decompress(lz.decodeBase64(light));
      for (let i = 0; i < 3 && typeof json === 'string'; i++) {
        try { json = JSON.parse(json); } catch { break; }
      }
      const nodes = json?.nodes || json;
      if (!nodes || typeof nodes !== 'object') continue;
      for (const [nodeId, node] of Object.entries(nodes) as [string, any][]) {
        if (!node?.props || nodeId === 'ROOT') continue;
        for (const [prop, value] of Object.entries(node.props)) {
          if (TEXT_PROPS.has(prop) && typeof value === 'string' && value.trim().length > 1) {
            allTexts[`${slug}::${nodeId}::${prop}`] = value;
          }
        }
        // Also translate link texts in navbar
        if (Array.isArray(node.props.links)) {
          node.props.links.forEach((link: any, i: number) => {
            if (link?.text) allTexts[`${slug}::${nodeId}::link_${i}`] = link.text;
          });
        }
        // Translate FAQ items, testimonials, feature items, etc.
        for (const arrProp of ['items', 'features', 'testimonials', 'faqs']) {
          if (Array.isArray(node.props[arrProp])) {
            node.props[arrProp].forEach((item: any, i: number) => {
              if (item?.title) allTexts[`${slug}::${nodeId}::${arrProp}_${i}_title`] = item.title;
              if (item?.description) allTexts[`${slug}::${nodeId}::${arrProp}_${i}_description`] = item.description;
              if (item?.text) allTexts[`${slug}::${nodeId}::${arrProp}_${i}_text`] = item.text;
              if (item?.question) allTexts[`${slug}::${nodeId}::${arrProp}_${i}_question`] = item.question;
              if (item?.answer) allTexts[`${slug}::${nodeId}::${arrProp}_${i}_answer`] = item.answer;
              if (item?.name) allTexts[`${slug}::${nodeId}::${arrProp}_${i}_name`] = item.name;
              if (item?.role) allTexts[`${slug}::${nodeId}::${arrProp}_${i}_role`] = item.role;
            });
          }
        }
        // About page: values and members arrays
        if (Array.isArray(node.props.values)) {
          node.props.values.forEach((val: any, i: number) => {
            if (val?.title) allTexts[`${slug}::${nodeId}::values_${i}_title`] = val.title;
            if (val?.description) allTexts[`${slug}::${nodeId}::values_${i}_description`] = val.description;
          });
        }
        if (Array.isArray(node.props.members)) {
          node.props.members.forEach((m: any, i: number) => {
            if (m?.name) allTexts[`${slug}::${nodeId}::members_${i}_name`] = m.name;
            if (m?.role) allTexts[`${slug}::${nodeId}::members_${i}_role`] = m.role;
          });
        }
        // Footer columns (title + nested links)
        if (Array.isArray(node.props.columns)) {
          node.props.columns.forEach((col: any, ci: number) => {
            if (col?.title) allTexts[`${slug}::${nodeId}::col_${ci}_title`] = col.title;
            if (Array.isArray(col?.links)) {
              col.links.forEach((link: any, li: number) => {
                if (link?.text) allTexts[`${slug}::${nodeId}::col_${ci}_link_${li}`] = link.text;
              });
            }
          });
        }
      }
    }

    if (Object.keys(allTexts).length === 0) return;

    // Deduplicate — only translate unique text values
    const valueToKeys = new Map<string, string[]>();
    for (const [key, value] of Object.entries(allTexts)) {
      const existing = valueToKeys.get(value);
      if (existing) existing.push(key);
      else valueToKeys.set(value, [key]);
    }
    const uniqueTexts: Record<string, string> = {};
    let idx = 0;
    const idxToValue = new Map<string, string>();
    for (const value of valueToKeys.keys()) {
      const k = `t${idx++}`;
      uniqueTexts[k] = value;
      idxToValue.set(k, value);
    }

    console.log(`[Builder] Translating ${Object.keys(uniqueTexts).length} unique texts (${Object.keys(allTexts).length} total)...`);

    // Call edge function
    const { data, error } = await supabase.functions.invoke('translate-builder-texts', {
      body: { texts: uniqueTexts },
    });

    if (error || !data?.translations) {
      console.error('[Builder] Translation failed:', error || data?.error);
      return;
    }

    // Re-map translations back to all original keys
    const fullTranslations: Record<string, string> = {};
    for (const [k, translatedValue] of Object.entries(data.translations) as [string, string][]) {
      const originalValue = idxToValue.get(k);
      if (!originalValue) continue;
      const keys = valueToKeys.get(originalValue);
      if (keys) {
        for (const fullKey of keys) {
          fullTranslations[fullKey] = translatedValue;
        }
      }
    }

    // Save translations to DB
    const { error: saveError } = await supabase
      .from('client_website_config')
      .update({ translations: JSON.stringify(fullTranslations) })
      .eq('client_id', clientId);

    if (saveError) {
      console.error('[Builder] Failed to save translations:', saveError);
    } else {
      console.log(`[Builder] Translations saved: ${Object.keys(data.translations).length} texts`);
    }
  } catch (err) {
    console.error('[Builder] Translation error:', err);
  }
}

// Device types for responsive preview
export type PreviewDevice = 'mobile' | 'tablet' | 'desktop';

// Props interface for Topbar to receive and set the current device
interface TopbarProps {
  currentDevice: PreviewDevice;
  setCurrentDevice: (device: PreviewDevice) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentDevice,
  setCurrentDevice,
  zoom,
  setZoom,
}) => {
  const { enabled } = useEditor((state) => ({
    enabled: state.options.enabled,
  }));

  // Use useEditor directly for actions and query without destructuring from state
  const { actions, query } = useEditor();
  const { client, refreshClient } = useAuth();
  const { startTour } = useBuilderTour();
  const [location, navigate] = useLocation();
  const [isSaving, setIsSaving] = useState(false);

  // Detectar si estamos en modo onboarding
  const isOnboardingMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('onboarding') === 'true';
  }, [location]);
  const [saveMessage, setSaveMessage] = useState('');
  const [showSaveMessage, setShowSaveMessage] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [stateToLoad, setStateToLoad] = useState('');
  const [isWebsiteEnabled, setIsWebsiteEnabled] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [colorScheme, setColorScheme] = useState<'LIGHT' | 'DARK'>('LIGHT');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);
  const [templateChangeConfirmOpen, setTemplateChangeConfirmOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  // Tracks whether loadState has finished hydrating from DB. handleSave refuses
  // to run before this, otherwise it can write stale defaults (notably
  // is_enabled=false from the initial useState) over real DB values.
  const hasLoadedRef = React.useRef(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [hasDarkMode, setHasDarkMode] = useState(false);
  const [hasLanguageSelector, setHasLanguageSelector] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState<'es' | 'en'>('es');

  // Derived: which themes are available based on hasDarkMode + colorScheme
  // has_dark_mode=false → single theme (whichever colorScheme is set)
  // has_dark_mode=true  → both themes, colorScheme is the default
  const themeMode = hasDarkMode
    ? 'both'
    : colorScheme === 'DARK'
      ? 'dark-only'
      : 'light-only';

  // ── Custom pages ─��
  const [customPages, setCustomPages] = useState<CustomPage[]>([]);
  const [showAddPage, setShowAddPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [pageToDelete, setPageToDelete] = useState<CustomPage | null>(null);
  // Páginas de SISTEMA que el cliente eligió ocultar/eliminar. Se persiste en el
  // envelope v3 (hiddenSystemPages) y se respeta en la web (notFound). El ref es la
  // fuente sincrónica para ensureAllSubPages/guardado; el state es para re-render de la UI.
  const [hiddenSystemPages, setHiddenSystemPages] = useState<string[]>([]);
  const hiddenSystemPagesRef = React.useRef<string[]>([]);
  const applyHiddenSystemPages = (next: string[]) => {
    hiddenSystemPagesRef.current = next;
    setHiddenSystemPages(next);
  };
  const [systemPageToHide, setSystemPageToHide] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Mirrors isDirty for the popstate handler (which is registered once and would
  // otherwise close over a stale value). leavingRef lets the confirmed-leave
  // navigation pass through the guard without re-prompting.
  const isDirtyRef = React.useRef(false);
  const leavingRef = React.useRef(false);
  const sentinelPushedRef = React.useRef(false);
  // Whether the builder had a previous history entry when it mounted. If not
  // (e.g. opened as the first page of a fresh tab / hard refresh), go(-2) would
  // underflow and strand the user, so we fall back to navigate('/').
  const hadPrevRef = React.useRef(true);

  // Fetch custom pages on mount
  useEffect(() => {
    if (!client?.id) return;
    supabase
      .from('client_custom_pages')
      .select('*')
      .eq('client_id', client.id)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setCustomPages(data as CustomPage[]);
      });
  }, [client?.id]);

  // All pages: system (sin las ocultas) + custom
  const allPages = [
    ...BUILDER_PAGES.filter(p => !hiddenSystemPages.includes(p.slug)).map(p => ({ slug: p.slug, label: p.label, icon: p.icon, isSystem: true })),
    ...customPages.map(p => ({ slug: p.slug, label: p.title, icon: p.icon || 'FileText', isSystem: false })),
  ];

  // Expose the page list so the settings panel can offer a page picker for
  // navigation links (instead of forcing users to type URLs by hand).
  React.useEffect(() => {
    (window as any).__builderAllPages = allPages.map(p => ({ slug: p.slug, label: p.label }));
    return () => { delete (window as any).__builderAllPages; };
  }, [customPages]);

  // Build a blank custom-page node tree (Navbar + empty Container + Footer).
  // Shared by page creation, page-switching, and save-time reconciliation so a
  // custom page always has content to persist into the envelope.
  const blankCustomPageState = (slug: string, scheme: ColorScheme) => {
    const d = getPersonalizedDefaults(client);
    const dark = scheme === 'DARK';
    return {
      ROOT: {
        type: { resolvedName: 'div' }, isCanvas: true,
        props: { style: { display: 'flex', flexDirection: 'column', margin: 0, padding: 0, width: '100%' } },
        displayName: 'App Canvas', custom: { displayName: 'App Canvas' },
        parent: null, hidden: false,
        nodes: [`nav-${slug}`, `content-${slug}`, `footer-${slug}`],
        linkedNodes: {},
      },
      [`nav-${slug}`]: {
        type: { resolvedName: 'BuilderNavbar' }, isCanvas: false,
        props: { links: [{ text: 'Inicio', url: '/' }], ctaText: 'Contacto', ctaUrl: '/contact', bgColor: dark ? '#141414' : '#ffffff', textColor: dark ? '#d4d4d4' : '#4b5563', ctaBgColor: '', ctaTextColor: '#ffffff', logoUrl: '', showLogo: true, sticky: true },
        displayName: 'BuilderNavbar', custom: {}, parent: 'ROOT', hidden: false, nodes: [], linkedNodes: {},
      },
      [`content-${slug}`]: {
        type: { resolvedName: 'Container' }, isCanvas: true,
        props: { style: { width: '100%', minHeight: '400px', padding: '40px 20px' }, bgColor: dark ? '#141414' : '#ffffff' },
        displayName: 'Contenido', custom: {}, parent: 'ROOT', hidden: false, nodes: [], linkedNodes: {},
      },
      [`footer-${slug}`]: {
        type: { resolvedName: 'Footer' }, isCanvas: false,
        props: { bgColor: dark ? '#141414' : '#f9fafb', textColor: dark ? '#737373' : '#6b7280', headingColor: dark ? '#e5e5e5' : '#111827', dividerColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', copyrightText: `© ${new Date().getFullYear()} ${d.companyName}. Todos los derechos reservados.` },
        displayName: 'Footer', custom: {}, parent: 'ROOT', hidden: false, nodes: [], linkedNodes: {},
      },
    };
  };

  const buildBlankCustomPage = (slug: string) => ({
    light: lz.encodeBase64(lz.compress(JSON.stringify(blankCustomPageState(slug, 'LIGHT')))),
    dark: lz.encodeBase64(lz.compress(JSON.stringify(blankCustomPageState(slug, 'DARK')))),
  });

  // Add custom page
  const handleAddCustomPage = async () => {
    if (!client?.id || !newPageTitle.trim()) return;
    const slug = newPageTitle.trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (RESERVED_SLUGS.has(slug) || customPages.some(p => p.slug === slug)) {
      toast.error(`La ruta "${slug}" ya existe o está reservada`);
      return;
    }
    const { data, error } = await supabase
      .from('client_custom_pages')
      .insert({ client_id: client.id, slug, title: newPageTitle.trim(), sort_order: customPages.length })
      .select()
      .single();
    if (error) { toast.error('Error al crear página'); return; }
    setCustomPages(prev => [...prev, data as CustomPage]);

    // Generate blank page state (Navbar + empty Container + Footer)
    pagesStateRef.current[slug] = buildBlankCustomPage(slug);

    setNewPageTitle('');
    setShowAddPage(false);
    toast.success(`Página "${newPageTitle.trim()}" creada`);
    switchPage(slug as PageSlug);
  };

  // Delete custom page — opens a confirmation dialog (replaces native confirm())
  const handleDeleteCustomPage = (slug: string) => {
    const page = customPages.find(p => p.slug === slug);
    if (page) setPageToDelete(page);
  };

  // Actually delete the page after the user confirms in the dialog
  const confirmDeleteCustomPage = async () => {
    const page = pageToDelete;
    if (!page || !client?.id) { setPageToDelete(null); return; }
    await supabase.from('client_custom_pages').delete().eq('id', page.id);
    setCustomPages(prev => prev.filter(p => p.slug !== page.slug));
    delete pagesStateRef.current[page.slug];
    if (currentPage === page.slug) switchPage('home');
    setPageToDelete(null);
    toast.success('Página eliminada');
  };

  // Ocultar (eliminar) una página de SISTEMA. No se borra de ningún lado: se marca
  // en hiddenSystemPages, se quita del envelope al guardar y la web hace notFound().
  const requestHideSystemPage = (slug: string) => {
    if (slug === 'home') return; // home nunca se puede eliminar
    setSystemPageToHide(slug);
  };
  const confirmHideSystemPage = () => {
    const slug = systemPageToHide;
    if (!slug) { setSystemPageToHide(null); return; }
    applyHiddenSystemPages([
      ...hiddenSystemPagesRef.current.filter((s) => s !== slug),
      slug,
    ]);
    delete pagesStateRef.current[slug];
    if (currentPage === slug) switchPage('home');
    setSystemPageToHide(null);
    setIsDirty(true);
    toast.success('Página eliminada. Recuerda Guardar para aplicarlo en el sitio.');
  };
  const restoreSystemPage = (slug: string) => {
    applyHiddenSystemPages(
      hiddenSystemPagesRef.current.filter((s) => s !== slug)
    );
    setIsDirty(true);
    toast.success('Página restaurada. Recuerda Guardar.');
  };

  // ── Multi-page + Dual-theme state slots ──
  // Each page has its own light/dark compressed state
  const pagesStateRef = React.useRef<Record<string, { light: string | null; dark: string | null }>>({});

  // Expose pagesStateRef for ThemePanel to update colors across all pages
  React.useEffect(() => {
    (window as any).__builderPagesStateRef = pagesStateRef;
    return () => { delete (window as any).__builderPagesStateRef; };
  }, []);

  // Current page being edited
  const [currentPage, setCurrentPage] = useState<PageSlug>('home');

  // Track selected template for page generation fallback
  const selectedTemplateRef = React.useRef<string>('tradicional');

  // Legacy single-page refs (kept for compatibility, delegate to pagesStateRef)
  const lightStateRef = {
    get current() { return pagesStateRef.current[currentPage]?.light ?? null; },
    set current(val: string | null) {
      if (!pagesStateRef.current[currentPage]) pagesStateRef.current[currentPage] = { light: null, dark: null };
      pagesStateRef.current[currentPage].light = val;
    }
  };
  const darkStateRef = {
    get current() { return pagesStateRef.current[currentPage]?.dark ?? null; },
    set current(val: string | null) {
      if (!pagesStateRef.current[currentPage]) pagesStateRef.current[currentPage] = { light: null, dark: null };
      pagesStateRef.current[currentPage].dark = val;
    }
  };

  // Load client flags on mount
  useEffect(() => {
    if (client) {
      const c = client as any;
      setHasDarkMode(!!c.has_dark_mode);
      setHasLanguageSelector(!!c.has_language_selector);
      setDefaultLanguage(c.default_language === 'en' ? 'en' : 'es');
    }
  }, [client]);

  // Undo/Redo history
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastSnapshotRef = React.useRef<string>('');

  // Take a snapshot of current state for undo
  const takeSnapshot = () => {
    try {
      const current = query.serialize();
      const serialized = typeof current === 'string' ? current : JSON.stringify(current);
      if (serialized !== lastSnapshotRef.current) {
        setUndoStack((prev) => [...prev.slice(-30), lastSnapshotRef.current].filter(Boolean));
        setRedoStack([]);
        lastSnapshotRef.current = serialized;
      }
    } catch {}
  };

  // Initialize snapshot on load
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const current = query.serialize();
        lastSnapshotRef.current = typeof current === 'string' ? current : JSON.stringify(current);
      } catch {}
    }, 1000);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-snapshot every 3 seconds if state changed
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const current = query.serialize();
        const serialized = typeof current === 'string' ? current : JSON.stringify(current);
        if (serialized !== lastSnapshotRef.current && lastSnapshotRef.current) {
          setUndoStack((prev) => [...prev.slice(-30), lastSnapshotRef.current]);
          setRedoStack([]);
          lastSnapshotRef.current = serialized;
          setIsDirty(true);
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [query]);

  // Warn before closing/refreshing the tab if there are unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Keep a ref copy of isDirty for the (once-registered) popstate handler.
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);

  // Intercept the browser Back button (and trackpad/gesture back) so it shows
  // the same "unsaved changes" dialog instead of leaving silently. We keep a
  // single sentinel history entry on top of the builder route: pressing Back
  // pops it (firing popstate); we immediately re-push it so our position is
  // always "sentinel". From there, an actual leave is go(-2) (sentinel -> builder
  // -> previous page). Internal page switches (home/about/...) are component
  // state and never touch history, so the sentinel stays accurate.
  // Skipped in onboarding (the back button is hidden there by design).
  useEffect(() => {
    if (isOnboardingMode) return;
    if (!sentinelPushedRef.current) {
      hadPrevRef.current = window.history.length > 1;
      window.history.pushState(null, '', window.location.href);
      sentinelPushedRef.current = true;
    }
    const onPop = () => {
      if (leavingRef.current) return; // confirmed leave: let it through
      // Re-absorb so our history position is deterministic before deciding.
      window.history.pushState(null, '', window.location.href);
      if (isDirtyRef.current) {
        setShowLeaveConfirm(true);
      } else {
        navigateAwayFromBuilder();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate out of the builder to the page we came from. Always invoked from
  // the "sentinel" history position, so go(-2) = sentinel -> builder -> prev.
  // If there was no previous entry (fresh tab), go(-2) underflows, so fall back
  // to the dashboard instead of leaving the user stranded on the builder.
  const navigateAwayFromBuilder = () => {
    leavingRef.current = true;
    if (hadPrevRef.current) {
      window.history.go(-2);
    } else {
      navigate('/');
    }
  };

  // Leave the builder, optionally saving first.
  const performLeave = async (save: boolean) => {
    if (save) await handleSave();
    setShowLeaveConfirm(false);
    setIsDirty(false);
    navigateAwayFromBuilder();
  };

  // Mark dirty immediately on any edit (don't wait for the 3s snapshot loop).
  // Guarded by hasLoadedRef so the initial load/deserialize doesn't flag it.
  useEffect(() => {
    const onChange = () => { if (hasLoadedRef.current) { isDirtyRef.current = true; setIsDirty(true); } };
    window.addEventListener('builder:nodeschange', onChange);
    return () => window.removeEventListener('builder:nodeschange', onChange);
  }, []);

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    const current = query.serialize();
    const serialized = typeof current === 'string' ? current : JSON.stringify(current);
    setRedoStack((r) => [...r, serialized]);
    setUndoStack((u) => u.slice(0, -1));
    try {
      const parsed = typeof prev === 'string' ? JSON.parse(prev) : prev;
      actions.deserialize(parsed);
      lastSnapshotRef.current = prev;
    } catch {}
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    const current = query.serialize();
    const serialized = typeof current === 'string' ? current : JSON.stringify(current);
    setUndoStack((u) => [...u, serialized]);
    setRedoStack((r) => r.slice(0, -1));
    try {
      const parsed = typeof next === 'string' ? JSON.parse(next) : next;
      actions.deserialize(parsed);
      lastSnapshotRef.current = next;
    } catch {}
  };

  // ── Page helpers ──

  const PAGE_EXPECTED_COMPONENT: Record<string, string> = {
    financing: 'FinancingFormEmbed',
    consignments: 'ConsignmentsFormEmbed',
    'buy-direct': 'BuyDirectFormEmbed',
    'we-search-for-you': 'WeSearchFormEmbed',
    contact: 'ContactFormEmbed',
    about: 'AboutContentEmbed',
  };

  // Check that a compressed page state decompresses cleanly and has a ROOT.
  // We intentionally do NOT require a specific form component: the user may
  // have removed/replaced it on purpose, and regenerating in that case would
  // silently wipe their edits.
  const isPageValid = (compressed: string | null, _expectedComponent?: string): boolean => {
    if (!compressed) return false;
    try {
      let parsed: any = lz.decompress(lz.decodeBase64(compressed));
      for (let i = 0; i < 3 && typeof parsed === 'string'; i++) {
        try { parsed = JSON.parse(parsed); } catch { break; }
      }
      const nodes = parsed?.nodes || parsed;
      if (!nodes || typeof nodes !== 'object') return false;
      return !!nodes.ROOT;
    } catch {
      return false;
    }
  };

  // Generate a fresh page state from the selected template
  const generatePageState = (page: PageSlug, scheme?: ColorScheme): Record<string, any> | null => {
    if (page === 'home') return null;
    const tpl = getTemplateById(selectedTemplateRef.current) || getTemplateById('tradicional');
    return tpl?.getPageState?.(page, client, scheme || colorScheme) || null;
  };

  // Save state into pagesStateRef for a given page
  const saveToPageSlot = (page: PageSlug, compressed: string) => {
    if (!pagesStateRef.current[page]) {
      pagesStateRef.current[page] = { light: null, dark: null };
    }
    if (colorScheme === 'DARK') {
      pagesStateRef.current[page].dark = compressed;
    } else {
      pagesStateRef.current[page].light = compressed;
    }
  };

  // Validate ALL sub-pages and regenerate any that are missing/corrupt
  const ensureAllSubPages = () => {
    const tpl = getTemplateById(selectedTemplateRef.current) || getTemplateById('tradicional');
    if (!tpl?.getPageState) {
      console.warn('[Builder] No getPageState on template:', selectedTemplateRef.current);
      return;
    }
    for (const bp of BUILDER_PAGES) {
      if (bp.slug === 'home') continue;
      if (hiddenSystemPagesRef.current.includes(bp.slug)) continue; // no regenerar ocultas
      const expected = PAGE_EXPECTED_COMPONENT[bp.slug];
      if (!expected) continue;
      const slots = pagesStateRef.current[bp.slug];
      const lightOk = isPageValid(slots?.light, expected);
      const darkOk = isPageValid(slots?.dark, expected);
      // Regenerate if EITHER theme is missing/corrupt
      if (lightOk && darkOk) continue;
      console.log(`[Builder] Regenerating sub-page "${bp.slug}" (lightOk=${lightOk}, darkOk=${darkOk})`);
      const pageLightState = tpl.getPageState(bp.slug as PageSlug, client, 'LIGHT');
      const pageDarkState = tpl.getPageState(bp.slug as PageSlug, client, 'DARK');
      if (pageLightState && pageDarkState) {
        pagesStateRef.current[bp.slug] = {
          light: lz.encodeBase64(lz.compress(JSON.stringify(pageLightState))),
          dark: lz.encodeBase64(lz.compress(JSON.stringify(pageDarkState))),
        };
      } else {
        console.warn(`[Builder] Failed to generate page "${bp.slug}": light=${!!pageLightState} dark=${!!pageDarkState}`);
      }
    }
  };

  // Ensure every custom page (from client_custom_pages) has content in
  // pagesStateRef so it is never dropped from the saved envelope. Only fills
  // pages that are entirely empty — never clobbers content loaded from the DB.
  const ensureCustomPages = () => {
    for (const cp of customPages) {
      const slots = pagesStateRef.current[cp.slug];
      if (!slots?.light && !slots?.dark) {
        pagesStateRef.current[cp.slug] = buildBlankCustomPage(cp.slug);
      }
    }
  };

  const switchPage = (targetPage: PageSlug) => {
    if (targetPage === currentPage) return;

    try {
      // 1. Save current editor state
      const json = query.serialize();
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      const currentCompressed = lz.encodeBase64(lz.compress(JSON.stringify(parsed)));
      saveToPageSlot(currentPage, currentCompressed);

      // Make sure custom pages have a blank slot before we try to load them,
      // otherwise switching to a not-yet-persisted custom page shows stale content.
      ensureCustomPages();

      // 2. Switch page label
      setCurrentPage(targetPage);

      // 3. Determine if we have VALID saved state for the target page
      const targetSlots = pagesStateRef.current[targetPage];
      const targetCompressed = colorScheme === 'DARK' ? targetSlots?.dark : targetSlots?.light;
      const expectedComponent = PAGE_EXPECTED_COMPONENT[targetPage];

      // For sub-pages, verify the saved state contains the correct form component
      const hasValidState = targetPage === 'home'
        ? !!targetCompressed
        : (targetCompressed && (!expectedComponent || isPageValid(targetCompressed, expectedComponent)));

      if (hasValidState && targetCompressed) {
        try {
          let targetJson: any = lz.decompress(lz.decodeBase64(targetCompressed));
          for (let i = 0; i < 3 && typeof targetJson === 'string'; i++) {
            try { targetJson = JSON.parse(targetJson); } catch { break; }
          }
          const nodes = targetJson?.nodes || targetJson;
          if (nodes?.ROOT) {
            if (!nodes.ROOT.type?.resolvedName || nodes.ROOT.type.resolvedName === 'undefined') {
              nodes.ROOT.type = { resolvedName: 'div' };
            }
            nodes.ROOT.isCanvas = true;
          }
          actions.deserialize(targetJson);
        } catch (deserializeErr) {
          console.warn('Failed to deserialize page, regenerating:', deserializeErr);
          const freshState = generatePageState(targetPage);
          if (freshState) {
            actions.deserialize(freshState);
            const genCompressed = lz.encodeBase64(lz.compress(JSON.stringify(freshState)));
            saveToPageSlot(targetPage, genCompressed);
          }
        }
      } else if (targetPage !== 'home') {
        // No valid state — generate from template
        const freshState = generatePageState(targetPage);
        if (freshState) {
          actions.deserialize(freshState);
          const genCompressed = lz.encodeBase64(lz.compress(JSON.stringify(freshState)));
          saveToPageSlot(targetPage, genCompressed);
        }
      }

      // Reset undo/redo for the new page
      setUndoStack([]);
      setRedoStack([]);
      lastSnapshotRef.current = '';
    } catch (e) {
      console.error('Error switching page:', e);
    }
  };

  // Compress and save builder state to Supabase
  const handleSave = async () => {
    if (!client?.id) {
      setSaveMessage('Error: No hay cliente seleccionado');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
      return;
    }
    // Guard: refuse to save before loadState has hydrated. Otherwise a save
    // triggered during the load window (e.g. an auto-save from
    // handleTemplateSelect right after mount) would write stale defaults
    // (most importantly is_enabled=false) over the real DB row.
    if (!hasLoadedRef.current) {
      console.warn('[Builder] handleSave called before loadState completed — aborting');
      setSaveMessage('Esperando a que termine de cargar...');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
      return;
    }

    try {
      setIsSaving(true);
      // Get the serialized state
      const json = query.serialize();

      // Resolve empty props to actual client values before saving
      // so the website renders correctly without needing client context
      const clientDefaults = getPersonalizedDefaults(client);
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      const resolveEmptyProps = (nodes: any) => {
        if (!nodes || typeof nodes !== 'object') return;
        for (const nodeId of Object.keys(nodes)) {
          const node = nodes[nodeId];
          if (!node?.props) continue;
          const p = node.props;
          // Resolve empty colors to client primary
          const colorProps = [
            'accentColor', 'highlightColor', 'buttonColor', 'buttonBgColor',
            'buttonSecondaryTextColor', 'ctaBgColor', 'ctaTextColor',
            'iconColor', 'cardButtonColor', 'searchButtonColor',
            'primaryButtonColor', 'buttonColorPrimary',
          ];
          for (const prop of colorProps) {
            if (prop in p && !p[prop]) p[prop] = clientDefaults.primaryColor;
          }
          // Resolve empty button text colors
          if ('ctaTextColor' in p && !p.ctaTextColor) p.ctaTextColor = '#ffffff';
          if ('buttonTextColor' in p && !p.buttonTextColor) p.buttonTextColor = clientDefaults.secondaryColor || '#ffffff';
          // Resolve UNSET text (undefined/null) to client name — pero respetar '' (el usuario lo borró a propósito)
          if ('highlightText' in p && p.highlightText == null) p.highlightText = clientDefaults.companyName;
          if ('highlightedText' in p && p.highlightedText == null) p.highlightedText = clientDefaults.companyName;
          if ('companyName' in p && p.companyName == null) p.companyName = clientDefaults.companyName;
          // Resolve logo
          if ('logoUrl' in p && !p.logoUrl) p.logoUrl = clientDefaults.logoUrl;
        }
      };
      // Handle both flat and nested node structures
      if (parsed.nodes) {
        resolveEmptyProps(parsed.nodes);
      } else if (parsed.ROOT) {
        resolveEmptyProps(parsed);
      }

      // ── Save current state to the active page + theme slot ──
      const currentCompressed = lz.encodeBase64(
        lz.compress(JSON.stringify(parsed))
      );

      // Update the active slot for the current page
      if (!pagesStateRef.current[currentPage]) {
        pagesStateRef.current[currentPage] = { light: null, dark: null };
      }
      if (colorScheme === 'DARK') {
        pagesStateRef.current[currentPage].dark = currentCompressed;
      } else {
        pagesStateRef.current[currentPage].light = currentCompressed;
      }

      // Build the v3 multi-page envelope
      // Resolve empty props for ALL pages, not just the current one
      const resolveCompressedState = (compressed: string): string => {
        try {
          let stateJson: any = lz.decompress(lz.decodeBase64(compressed));
          for (let i = 0; i < 3 && typeof stateJson === 'string'; i++) {
            try { stateJson = JSON.parse(stateJson); } catch { break; }
          }
          if (stateJson?.nodes) {
            resolveEmptyProps(stateJson.nodes);
          } else if (stateJson?.ROOT) {
            resolveEmptyProps(stateJson);
          }
          return lz.encodeBase64(lz.compress(JSON.stringify(stateJson)));
        } catch {
          return compressed;
        }
      };

      // Ensure ALL sub-pages exist before saving
      ensureAllSubPages();
      // Ensure custom pages have content so they are persisted into the envelope
      ensureCustomPages();

      // ── Sync navbar & footer from CURRENT page to ALL other pages ──
      // For the active scheme: use live editor state (parsed)
      // For the other scheme: use the saved slot of the current page
      const extractNavFooter = (nodes: any) => {
        let navProps: Record<string, any> | null = null;
        let footerProps: Record<string, any> | null = null;
        let footerComponent: string | null = null;
        for (const node of Object.values(nodes) as any[]) {
          const rn = node?.type?.resolvedName;
          if (rn === 'BuilderNavbar') navProps = { ...node.props };
          if (rn === 'Footer' || rn === 'FooterModerno') {
            footerProps = { ...node.props };
            footerComponent = rn;
          }
        }
        return { navProps, footerProps, footerComponent };
      };

      const applyNavFooterToPages = (
        scheme: 'light' | 'dark',
        source: { navProps: Record<string, any> | null; footerProps: Record<string, any> | null; footerComponent: string | null }
      ) => {
        if (!source.navProps && !source.footerProps) return;
        const allSlugsToSync = [
          ...BUILDER_PAGES.map(bp => bp.slug),
          ...customPages.map(cp => cp.slug),
        ];
        for (const slug of allSlugsToSync) {
          // For the active scheme on the current page, it's already in `parsed` (saved above)
          if (slug === currentPage && scheme === (colorScheme === 'DARK' ? 'dark' : 'light')) continue;
          const targetCompressed = scheme === 'light'
            ? pagesStateRef.current[slug]?.light
            : pagesStateRef.current[slug]?.dark;
          if (!targetCompressed) continue;
          try {
            let targetJson: any = lz.decompress(lz.decodeBase64(targetCompressed));
            for (let i = 0; i < 3 && typeof targetJson === 'string'; i++) {
              try { targetJson = JSON.parse(targetJson); } catch { break; }
            }
            const targetNodes = targetJson?.nodes || targetJson;
            if (!targetNodes) continue;
            let changed = false;
            for (const [nodeId, node] of Object.entries(targetNodes) as [string, any][]) {
              const rn = node?.type?.resolvedName;
              if (rn === 'BuilderNavbar' && source.navProps) {
                targetNodes[nodeId] = { ...node, props: { ...source.navProps } };
                changed = true;
              }
              if ((rn === 'Footer' || rn === 'FooterModerno') && source.footerProps && source.footerComponent) {
                targetNodes[nodeId] = { ...node, type: { resolvedName: source.footerComponent }, props: { ...source.footerProps } };
                changed = true;
              }
            }
            if (changed) {
              const updated = lz.encodeBase64(lz.compress(JSON.stringify(targetJson)));
              if (scheme === 'light') {
                pagesStateRef.current[slug]!.light = updated;
              } else {
                pagesStateRef.current[slug]!.dark = updated;
              }
            }
          } catch { /* skip corrupt page */ }
        }
      };

      // Active scheme: extract from live editor state
      const activeScheme = colorScheme === 'DARK' ? 'dark' : 'light';
      const otherScheme = colorScheme === 'DARK' ? 'light' : 'dark';
      const activeSource = extractNavFooter(parsed?.nodes || parsed);
      applyNavFooterToPages(activeScheme, activeSource);

      // Other scheme: extract from the saved slot of the current page
      const otherCompressed = otherScheme === 'light'
        ? pagesStateRef.current[currentPage]?.light
        : pagesStateRef.current[currentPage]?.dark;
      if (otherCompressed) {
        try {
          let otherJson: any = lz.decompress(lz.decodeBase64(otherCompressed));
          for (let i = 0; i < 3 && typeof otherJson === 'string'; i++) {
            try { otherJson = JSON.parse(otherJson); } catch { break; }
          }
          const otherSource = extractNavFooter(otherJson?.nodes || otherJson);
          applyNavFooterToPages(otherScheme, otherSource);
        } catch { /* skip */ }
      }

      // ── Sync TEXT content from active theme to the other theme (per page) ──
      // Only text props, not colors — so both themes show the same content
      const syncTextsAcrossThemes = () => {
        const activeKey = colorScheme === 'DARK' ? 'dark' : 'light';
        const otherKey = colorScheme === 'DARK' ? 'light' : 'dark';
        for (const slug of Object.keys(pagesStateRef.current)) {
          const activeCompressed = pagesStateRef.current[slug]?.[activeKey];
          const otherCompressed = pagesStateRef.current[slug]?.[otherKey];
          if (!activeCompressed || !otherCompressed) continue;
          try {
            let activeJson: any = lz.decompress(lz.decodeBase64(activeCompressed));
            for (let i = 0; i < 3 && typeof activeJson === 'string'; i++) { try { activeJson = JSON.parse(activeJson); } catch { break; } }
            let otherJson: any = lz.decompress(lz.decodeBase64(otherCompressed));
            for (let i = 0; i < 3 && typeof otherJson === 'string'; i++) { try { otherJson = JSON.parse(otherJson); } catch { break; } }
            const activeNodes = activeJson?.nodes || activeJson;
            const otherNodes = otherJson?.nodes || otherJson;
            if (!activeNodes || !otherNodes) continue;
            let changed = false;
            for (const [nodeId, activeNode] of Object.entries(activeNodes) as [string, any][]) {
              if (!activeNode?.props || nodeId === 'ROOT' || !otherNodes[nodeId]) continue;
              for (const prop of TEXT_PROPS) {
                if (prop in activeNode.props && typeof activeNode.props[prop] === 'string') {
                  if (otherNodes[nodeId].props[prop] !== activeNode.props[prop]) {
                    otherNodes[nodeId].props[prop] = activeNode.props[prop];
                    changed = true;
                  }
                }
              }
              // Sync array props (links, items, features, etc.)
              for (const arrProp of ['links', 'items', 'features', 'testimonials', 'faqs']) {
                if (Array.isArray(activeNode.props[arrProp]) && Array.isArray(otherNodes[nodeId].props[arrProp])) {
                  const src = activeNode.props[arrProp];
                  const dst = otherNodes[nodeId].props[arrProp];
                  for (let i = 0; i < Math.min(src.length, dst.length); i++) {
                    for (const key of ['text', 'title', 'description', 'question', 'answer', 'name', 'role']) {
                      if (typeof src[i]?.[key] === 'string' && src[i][key] !== dst[i]?.[key]) {
                        dst[i][key] = src[i][key];
                        changed = true;
                      }
                    }
                  }
                }
              }
            }
            if (changed) {
              pagesStateRef.current[slug]![otherKey] = lz.encodeBase64(lz.compress(JSON.stringify(otherJson)));
            }
          } catch { /* skip corrupt */ }
        }
      };
      syncTextsAcrossThemes();

      const pages: Record<string, { light: string; dark: string }> = {};
      // Include system pages (sin las ocultas) + custom pages
      const hiddenSlugs = hiddenSystemPagesRef.current;
      const allSlugs = [
        ...BUILDER_PAGES.map(bp => bp.slug).filter(s => !hiddenSlugs.includes(s)),
        ...customPages.map(cp => cp.slug),
      ];
      for (const slug of allSlugs) {
        const slots = pagesStateRef.current[slug];
        if (slots?.light || slots?.dark) {
          pages[slug] = {
            light: resolveCompressedState(slots.light || slots.dark || ''),
            dark: resolveCompressedState(slots.dark || slots.light || ''),
          };
        }
      }

      // Ensure at least the home page exists
      if (!pages.home) {
        pages.home = {
          light: currentCompressed,
          dark: currentCompressed,
        };
      }

      const savedPageSlugs = Object.keys(pages);
      console.log('[Builder Save] Saving v3 envelope with pages:', savedPageSlugs);

      const multiPageState = JSON.stringify({
        v: 3,
        templateId: selectedTemplateRef.current,
        hiddenSystemPages: hiddenSlugs,
        pages,
      });

      console.log('[Builder Save] Envelope size:', (multiPageState.length / 1024).toFixed(1), 'KB');

      // ── is_enabled handling ──
      // We deliberately do NOT include is_enabled here outside of onboarding.
      // Otherwise we'd re-assert it on every save, and during the brief window
      // where loadState hasn't yet hydrated isWebsiteEnabled (it defaults to
      // `false` from useState), a save would silently disable the public site.
      // The toggle button (toggleWebsiteEnabled) is the only path to flip it.
      const saveData: Record<string, any> = {
        client_id: client.id,
        elements_structure: multiPageState,
        color_scheme: colorScheme,
        home_html: generateHtmlFromState(json),
        home_css: generateCssFromState(json),
        updated_at: new Date().toISOString(),
      };
      if (isOnboardingMode) {
        saveData.is_enabled = true;
      }

      // Save to Supabase
      const { error } = await supabase
        .from('client_website_config')
        .upsert(saveData, { onConflict: 'client_id' });

      if (error) {
        console.error('Error saving builder state:', error);
        setSaveMessage('Error al guardar: ' + error.message);
      } else {
        posthog.capture({
          distinctId: client?.id?.toString() || 'anonymous',
          event: 'builder_page_saved',
          properties: {
            color_scheme: colorScheme,
            is_onboarding: isOnboardingMode,
          },
        });
        setSaveMessage(`Guardado: ${savedPageSlugs.length} páginas (${savedPageSlugs.join(', ')})`);
        setIsDirty(false);

        // ── Auto-translate builder texts if language selector is enabled ──
        if ((client as any)?.has_language_selector) {
          translateBuilderTexts(pages, client.id);
        }

        // Si estamos en modo onboarding, completar el onboarding
        if (isOnboardingMode && client) {
          const { error: updateError } = await supabase
            .from('clients')
            .update({ onboarding_status: 'complete' })
            .eq('id', client.id);

          if (!updateError) {
            // Refrescar el client para obtener el nuevo onboarding_status
            await refreshClient();
            // Navegar al home sin recargar la página
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 1000);
          }
        }
      }
    } catch (err) {
      console.error('Failed to save builder state:', err);
      setSaveMessage(
        'Error al guardar: ' +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsSaving(false);
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    }
  };

  // Load builder state from Supabase
  const loadState = async () => {
    if (!client?.id) {
      setSaveMessage('Error: No hay cliente seleccionado');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('client_website_config')
        .select('elements_structure, is_enabled, color_scheme')
        .eq('client_id', client.id)
        .single();

      // No saved config found — show template selector
      if (error || !data) {
        console.log('No saved builder state found, showing template selector');
        setShowTemplateSelector(true);
        return;
      }

      // Set the website enabled state
      const rowData = data as any;
      setIsWebsiteEnabled(rowData?.is_enabled || false);
      setColorScheme(rowData?.color_scheme || 'LIGHT');

      if (rowData?.elements_structure) {
        const raw = String(rowData.elements_structure);
        const scheme = (rowData?.color_scheme || 'LIGHT').toUpperCase();

        // Detect envelope format (v3 multi-page, v2 dual-theme, or legacy)
        let compressedData = raw;
        try {
          const envelope = JSON.parse(raw);
          if (envelope?.v === 3) {
            // v3 multi-page format
            const allPages = envelope.pages || {};
            for (const [slug, slots] of Object.entries(allPages)) {
              pagesStateRef.current[slug] = {
                light: (slots as any).light || null,
                dark: (slots as any).dark || null,
              };
            }
            // Restore selected template
            if (envelope.templateId) {
              selectedTemplateRef.current = envelope.templateId;
            }
            // Restore páginas de sistema ocultas (se usa antes de ensureAllSubPages)
            applyHiddenSystemPages(
              Array.isArray(envelope.hiddenSystemPages)
                ? envelope.hiddenSystemPages.filter((s: any) => typeof s === 'string' && s !== 'home')
                : []
            );
            // Load the home page by default
            const homeSlots = allPages.home || allPages[Object.keys(allPages)[0]];
            if (homeSlots) {
              compressedData = scheme === 'DARK' ? homeSlots.dark : homeSlots.light;
            }
            setCurrentPage('home');
          } else if (envelope?.v === 2) {
            // Legacy v2 single-page format — treat as home page
            pagesStateRef.current.home = {
              light: envelope.light,
              dark: envelope.dark,
            };
            compressedData = scheme === 'DARK' ? envelope.dark : envelope.light;
            setCurrentPage('home');
          } else {
            // Legacy format — store in home page current scheme slot
            pagesStateRef.current.home = {
              light: scheme === 'LIGHT' ? raw : null,
              dark: scheme === 'DARK' ? raw : null,
            };
          }
        } catch {
          // Not JSON — legacy single-theme format
          pagesStateRef.current.home = {
            light: scheme === 'LIGHT' ? raw : null,
            dark: scheme === 'DARK' ? raw : null,
          };
        }

        // Validate ALL sub-pages: regenerate any missing or corrupt ones
        ensureAllSubPages();

        // Decompress and load the state
        let json: any = lz.decompress(lz.decodeBase64(compressedData));
        for (let i = 0; i < 3 && typeof json === 'string'; i++) {
          try { json = JSON.parse(json); } catch { break; }
        }
        const nodes = json?.nodes || json;
        if (nodes?.ROOT) {
          if (!nodes.ROOT.type?.resolvedName || nodes.ROOT.type.resolvedName === 'undefined') {
            nodes.ROOT.type = { resolvedName: 'div' };
          }
          nodes.ROOT.isCanvas = true;
        }
        actions.deserialize(json);
        setIsDirty(false);
      } else {
        // Row exists but no elements_structure — show template selector
        console.log('No elements_structure found, showing template selector');
        setShowTemplateSelector(true);
      }
    } catch (err) {
      console.error('Failed to load builder state:', err);
      setSaveMessage(
        'Error al cargar: ' + (err instanceof Error ? err.message : String(err))
      );
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    } finally {
      hasLoadedRef.current = true;
      // Avisar al editor que la carga inicial terminó (cargó la estructura, se
      // mostró el selector de template, o falló) para que oculte el overlay de
      // carga y no se vea el árbol default mientras llega el deserialize.
      window.dispatchEvent(new Event('builder:loaded'));
    }
  };

  // Get the default serialized state using the clasica template
  const getDefaultSerializedState = () => {
    const template = getTemplateById('tradicional')!;
    return template.getState(client, colorScheme);
  };

  // Gate template selection: if there's existing builder content, confirm
  // before overwriting. First-time selection (empty pagesStateRef) goes
  // through directly so onboarding isn't interrupted.
  const handleTemplateSelectClick = (templateId: string) => {
    const hasExistingContent = Object.values(pagesStateRef.current).some(
      (slots) => slots?.light || slots?.dark
    );
    if (hasExistingContent) {
      setPendingTemplateId(templateId);
      setTemplateChangeConfirmOpen(true);
    } else {
      handleTemplateSelect(templateId);
    }
  };

  const confirmTemplateChange = () => {
    const id = pendingTemplateId;
    setTemplateChangeConfirmOpen(false);
    setPendingTemplateId(null);
    if (id) handleTemplateSelect(id);
  };

  // Handle template selection from the modal
  // Generates BOTH light and dark states from the template and stores them in slots
  const handleTemplateSelect = (templateId: string) => {
    try {
      const template = getTemplateById(templateId);
      if (!template) return;

      // Track which template was selected
      selectedTemplateRef.current = templateId;

      // Generate home page states (both themes)
      const lightState = template.getState(client, 'LIGHT');
      const darkState = template.getState(client, 'DARK');

      // Store home page
      pagesStateRef.current.home = {
        light: lz.encodeBase64(lz.compress(JSON.stringify(lightState))),
        dark: lz.encodeBase64(lz.compress(JSON.stringify(darkState))),
      };

      // Generate all other pages
      if (template.getPageState) {
        for (const bp of BUILDER_PAGES) {
          if (bp.slug === 'home') continue;
          const pageLightState = template.getPageState(bp.slug as PageSlug, client, 'LIGHT');
          const pageDarkState = template.getPageState(bp.slug as PageSlug, client, 'DARK');
          if (pageLightState && pageDarkState) {
            pagesStateRef.current[bp.slug] = {
              light: lz.encodeBase64(lz.compress(JSON.stringify(pageLightState))),
              dark: lz.encodeBase64(lz.compress(JSON.stringify(pageDarkState))),
            };
          }
        }
      }

      // Load the current page's state into the editor
      setCurrentPage('home');
      const activeState = colorScheme === 'DARK' ? darkState : lightState;
      actions.deserialize(activeState);
      setShowTemplateSelector(false);

      // Auto-save — use requestAnimationFrame to ensure React state is settled
      requestAnimationFrame(() => {
        setTimeout(() => {
          handleSave();
        }, 200);
      });
    } catch (err) {
      console.error('Failed to load template:', err);
      setSaveMessage(
        'Error al cargar plantilla: ' +
          (err instanceof Error ? err.message : String(err))
      );
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    }
  };

  // Update theme configuration: mode ('light-only' | 'dark-only' | 'both') and default scheme
  const updateThemeConfig = async (mode: 'light-only' | 'dark-only' | 'both', defaultScheme?: 'LIGHT' | 'DARK') => {
    if (!client?.id) return;

    const newHasDarkMode = mode === 'both';
    const newColorScheme = defaultScheme || (mode === 'dark-only' ? 'DARK' : mode === 'light-only' ? 'LIGHT' : colorScheme);

    const prevHasDarkMode = hasDarkMode;
    const prevColorScheme = colorScheme;

    setHasDarkMode(newHasDarkMode);
    setColorScheme(newColorScheme);

    // If switching default scheme, swap the editor to that theme using the saved slot
    if (newColorScheme !== prevColorScheme) {
      try {
        // Save current state to the current slot first
        const json = query.serialize();
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        const currentCompressed = lz.encodeBase64(lz.compress(JSON.stringify(parsed)));
        if (prevColorScheme === 'LIGHT') lightStateRef.current = currentCompressed;
        else darkStateRef.current = currentCompressed;

        // Load the target slot
        const targetCompressed = newColorScheme === 'DARK' ? darkStateRef.current : lightStateRef.current;
        if (targetCompressed) {
          let targetJson: any = lz.decompress(lz.decodeBase64(targetCompressed));
          for (let i = 0; i < 3 && typeof targetJson === 'string'; i++) {
            try { targetJson = JSON.parse(targetJson); } catch { break; }
          }
          actions.deserialize(targetJson);
        } else {
          // Target slot empty — force all mapped props to target theme values
          const cloned = JSON.parse(JSON.stringify(parsed));
          const nodes = cloned.nodes || cloned;
          const idx = newColorScheme === 'DARK' ? 1 : 0;
          for (const nodeId of Object.keys(nodes)) {
            const node = nodes[nodeId];
            if (!node?.props || nodeId === 'ROOT') continue;
            const componentName = node.type?.resolvedName || node.displayName || '';
            let map = THEME_MAP;
            if (componentName === 'Footer') map = { ...THEME_MAP, ...FOOTER_THEME };
            else if (componentName === 'FooterModerno') map = { ...THEME_MAP, ...FOOTER_MODERNO_THEME };
            for (const prop of Object.keys(node.props)) {
              const entry = map[prop];
              if (!entry) continue;
              if (typeof node.props[prop] === 'string') node.props[prop] = entry[idx];
            }
          }
          actions.deserialize(cloned);
          const gen = lz.encodeBase64(lz.compress(JSON.stringify(cloned)));
          if (newColorScheme === 'DARK') darkStateRef.current = gen;
          else lightStateRef.current = gen;
        }
      } catch (e) {
        console.error('Error swapping theme:', e);
      }
    }

    try {
      // Update has_dark_mode on client
      const { error: clientError } = await supabase
        .from('clients')
        .update({ has_dark_mode: newHasDarkMode })
        .eq('id', client.id);

      // Update color_scheme on website config
      const { error: configError } = await supabase
        .from('client_website_config')
        .upsert(
          { client_id: client.id, color_scheme: newColorScheme, updated_at: new Date().toISOString() },
          { onConflict: 'client_id' }
        );

      if (clientError || configError) {
        console.error('Error updating theme config:', clientError || configError);
        setHasDarkMode(prevHasDarkMode);
        setColorScheme(prevColorScheme);
        setSaveMessage('Error al actualizar configuración de tema');
      } else {
        const labels: Record<string, string> = {
          'light-only': 'Solo tema claro',
          'dark-only': 'Solo tema oscuro',
          'both': `Ambos temas (por defecto: ${newColorScheme === 'LIGHT' ? 'claro' : 'oscuro'})`,
        };
        setSaveMessage(labels[mode]);
        await refreshClient();
      }
    } catch {
      setHasDarkMode(prevHasDarkMode);
      setColorScheme(prevColorScheme);
      setSaveMessage('Error al actualizar configuración de tema');
    }
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };

  // Update language configuration
  const updateLanguageConfig = async (mode: 'es-only' | 'en-only' | 'both', defaultLang?: 'es' | 'en') => {
    if (!client?.id) return;

    const newHasSelector = mode === 'both';
    const newDefault = defaultLang || (mode === 'en-only' ? 'en' : mode === 'es-only' ? 'es' : defaultLanguage);

    const prevHasSelector = hasLanguageSelector;
    const prevDefault = defaultLanguage;

    setHasLanguageSelector(newHasSelector);
    setDefaultLanguage(newDefault);

    try {
      const { error } = await supabase
        .from('clients')
        .update({ has_language_selector: newHasSelector, default_language: newDefault })
        .eq('id', client.id);

      if (error) {
        console.error('Error updating language config:', error);
        setHasLanguageSelector(prevHasSelector);
        setDefaultLanguage(prevDefault);
        setSaveMessage('Error al actualizar configuración de idioma');
      } else {
        const labels: Record<string, string> = {
          'es-only': 'Solo español',
          'en-only': 'Solo inglés',
          'both': `Ambos idiomas (por defecto: ${newDefault === 'es' ? 'español' : 'inglés'})`,
        };
        setSaveMessage(labels[mode]);
        await refreshClient();
      }
    } catch {
      setHasLanguageSelector(prevHasSelector);
      setDefaultLanguage(prevDefault);
      setSaveMessage('Error al actualizar configuración de idioma');
    }
    setShowSaveMessage(true);
    setTimeout(() => setShowSaveMessage(false), 3000);
  };

  const languageMode = hasLanguageSelector
    ? 'both'
    : defaultLanguage === 'en'
      ? 'en-only'
      : 'es-only';

  // Reset builder — open the template selector
  const resetToDefault = () => {
    setResetConfirmOpen(false);
    setShowTemplateSelector(true);
  };

  // Discard changes and reload from database
  const discardChanges = () => {
    loadState();
    setDiscardConfirmOpen(false);
  };

  // Toggle website enabled status
  const toggleWebsiteEnabled = async () => {
    if (!client?.id) {
      setSaveMessage('Error: No hay cliente seleccionado');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      const newStatus = !isWebsiteEnabled;

      const { error } = await supabase.from('client_website_config').upsert(
        {
          client_id: client.id,
          is_enabled: newStatus,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' }
      );

      if (error) {
        console.error('Error updating website status:', error);
        setSaveMessage('Error al actualizar estado: ' + error.message);
      } else {
        setIsWebsiteEnabled(newStatus);
        setSaveMessage(
          `¡Sitio web ${newStatus ? 'activado' : 'desactivado'} exitosamente!`
        );
      }
    } catch (err) {
      console.error('Failed to update website status:', err);
      setSaveMessage(
        'Error al actualizar estado: ' +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setIsUpdatingStatus(false);
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    }
  };

  // ── Theme swap: ONLY structural colors (bg, text, borders) ──
  // NEVER include accent/brand colors (accentColor, highlightColor, buttonBgColor, iconColor, starColor)
  // Those are user-chosen and must remain the same across themes
  const THEME_MAP: Record<string, [string, string]> = {
    // Main backgrounds
    bgColor:              ['#ffffff', '#141414'],
    sectionBgColor:       ['#f8fafc', '#141414'],
    backgroundColor:      ['#f8fafc', '#141414'],
    // Card / surface
    cardBgColor:          ['#ffffff', '#1c1c1c'],
    filterBarBgColor:     ['#ffffff', '#1a1a1a'],
    // Text (structural, not accent)
    textColor:            ['#111827', '#e5e5e5'],
    titleColor:           ['#111827', '#f5f5f5'],
    cardTitleColor:       ['#171717', '#f5f5f5'],
    cardSubtitleColor:    ['#525252', '#a3a3a3'],
    cardSpecsColor:       ['#262626', '#d4d4d4'],
    cardPriceColor:       ['#171717', '#f5f5f5'],
    filterTextColor:      ['#374151', '#d4d4d4'],
    subtitleColor:        ['#4b5563', '#a3a3a3'],
    nameColor:            ['#111827', '#f5f5f5'],
    roleColor:            ['#6b7280', '#737373'],
    testimonialColor:     ['#374151', '#a3a3a3'],
    // Borders
    cardBorderColor:      ['rgba(0,0,0,0.1)', '#2a2a2a'],
    filterBarBorderColor: ['#e5e7eb', '#2a2a2a'],
    // Labels
    labelColor:           ['#6b7280', '#737373'],
    valueColor:           ['#111827', '#e5e5e5'],
  };

  // Footer-specific: structural colors only
  const FOOTER_THEME: Record<string, [string, string]> = {
    bgColor:              ['#f9fafb', '#141414'],
    textColor:            ['#6b7280', '#737373'],
    headingColor:         ['#111827', '#e5e5e5'],
    dividerColor:         ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.06)'],
    socialIconBgColor:    ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.06)'],
  };

  const FOOTER_MODERNO_THEME: Record<string, [string, string]> = {
    bgColor:              ['#f9fafb', '#141414'],
    textColor:            ['#6b7280', '#737373'],
    headingColor:         ['#111827', '#e5e5e5'],
    dividerColor:         ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.06)'],
    socialIconBgColor:    ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.04)'],
  };

  // Toggle color scheme: save current state to active slot, load from other slot
  const toggleColorScheme = () => {
    const newScheme = colorScheme === 'LIGHT' ? 'DARK' : 'LIGHT';
    setColorScheme(newScheme);

    try {
      // 1. Serialize current editor state and save to the CURRENT slot
      const json = query.serialize();
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      const currentCompressed = lz.encodeBase64(lz.compress(JSON.stringify(parsed)));

      if (colorScheme === 'LIGHT') {
        lightStateRef.current = currentCompressed;
      } else {
        darkStateRef.current = currentCompressed;
      }

      // 2. Load the OTHER slot's state
      const otherCompressed = newScheme === 'DARK' ? darkStateRef.current : lightStateRef.current;

      if (otherCompressed) {
        // Other slot has a saved state — load it exactly as the user configured it
        let otherJson: any = lz.decompress(lz.decodeBase64(otherCompressed));
        for (let i = 0; i < 3 && typeof otherJson === 'string'; i++) {
          try { otherJson = JSON.parse(otherJson); } catch { break; }
        }
        const nodes = otherJson?.nodes || otherJson;
        if (nodes?.ROOT) {
          if (!nodes.ROOT.type?.resolvedName || nodes.ROOT.type.resolvedName === 'undefined') {
            nodes.ROOT.type = { resolvedName: 'div' };
          }
          nodes.ROOT.isCanvas = true;
        }
        actions.deserialize(otherJson);
      } else {
        // Other slot is empty (first time switching) — force ALL mapped color props to the target theme values
        const cloned = JSON.parse(JSON.stringify(parsed));
        const nodes = cloned.nodes || cloned;
        const toDark = newScheme === 'DARK';
        const idx = toDark ? 1 : 0; // index into [light, dark] tuples
        for (const nodeId of Object.keys(nodes)) {
          const node = nodes[nodeId];
          if (!node?.props || nodeId === 'ROOT') continue;
          const componentName = node.type?.resolvedName || node.displayName || '';
          let map = THEME_MAP;
          if (componentName === 'Footer') map = { ...THEME_MAP, ...FOOTER_THEME };
          else if (componentName === 'FooterModerno') map = { ...THEME_MAP, ...FOOTER_MODERNO_THEME };
          for (const prop of Object.keys(node.props)) {
            const entry = map[prop];
            if (!entry) continue;
            // Force the prop to the target theme value (don't check current value)
            if (typeof node.props[prop] === 'string') {
              node.props[prop] = entry[idx];
            }
          }
        }
        actions.deserialize(cloned);
        // Save the generated state as the initial version of that slot
        const generatedCompressed = lz.encodeBase64(lz.compress(JSON.stringify(cloned)));
        if (newScheme === 'DARK') darkStateRef.current = generatedCompressed;
        else lightStateRef.current = generatedCompressed;
      }
    } catch (e) {
      console.error('Error toggling theme:', e);
    }

    // Save color_scheme to Supabase in background
    if (client?.id) {
      supabase.from('client_website_config').upsert(
        { client_id: client.id, color_scheme: newScheme, updated_at: new Date().toISOString() },
        { onConflict: 'client_id' }
      ).then(({ error }) => {
        if (error) console.error('Error saving color scheme:', error);
      });
    }
  };

  // Load from a custom state string
  const handleLoadFromString = () => {
    try {
      if (!stateToLoad) return;

      const json = JSON.parse(lz.decompress(lz.decodeBase64(stateToLoad)));
      actions.deserialize(json);
      setLoadDialogOpen(false);
      setSaveMessage('¡Estado personalizado cargado exitosamente!');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    } catch (err) {
      console.error('Failed to load custom state:', err);
      setSaveMessage('Error al cargar estado personalizado: Formato inválido');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    }
  };

  // Helper to export the current state to clipboard
  const handleExportToClipboard = () => {
    try {
      const json = query.serialize();
      const compressedState = lz.encodeBase64(
        lz.compress(JSON.stringify(json))
      );

      // Copy to clipboard
      navigator.clipboard.writeText(compressedState);

      setSaveMessage('¡Estado copiado al portapapeles!');
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    } catch (err) {
      console.error('Failed to export state:', err);
      setSaveMessage(
        'Error al exportar: ' +
          (err instanceof Error ? err.message : String(err))
      );
      setShowSaveMessage(true);
      setTimeout(() => setShowSaveMessage(false), 3000);
    }
  };

  // Generate simple HTML from the state (basic implementation)
  const generateHtmlFromState = (state: any) => {
    // This is a very basic implementation
    // In a real application, you would create a more sophisticated HTML generator
    let html = '<div class="builder-content">';

    // Process nodes in the state
    if (state.nodes) {
      const rootNodeId = Object.keys(state.nodes).find(
        (id) => state.nodes[id].data.parent === 'ROOT'
      );
      if (rootNodeId) {
        html += processNodeToHtml(state.nodes, rootNodeId);
      }
    }

    html += '</div>';
    return html;
  };

  // Process each node into HTML
  const processNodeToHtml = (nodes: any, nodeId: string) => {
    const node = nodes[nodeId];
    if (!node) return '';

    const { data } = node;
    const { name, props } = data;

    let html = '';
    switch (name) {
      case 'Text':
        html += `<p style="font-size: ${props.fontSize}px; color: ${props.color}; text-align: ${props.textAlign}">${props.text}</p>`;
        break;
      case 'Container':
        html += `<div style="background: ${props.background}; padding: ${
          props.padding
        }px; border-radius: ${props.borderRadius}px; ${
          props.shadow ? 'box-shadow: 0 3px 6px rgba(0,0,0,0.1);' : ''
        }">`;
        // Process children
        if (data.nodes && data.nodes.length) {
          data.nodes.forEach((childId: string) => {
            html += processNodeToHtml(nodes, childId);
          });
        }
        html += '</div>';
        break;
      case 'Image':
        html += `<img src="${props.src}" alt="${props.alt}" style="width: ${props.width}; height: ${props.height}; border-radius: 4px;" />`;
        break;
    }

    return html;
  };

  // Generate simple CSS from the state
  const generateCssFromState = (state: any) => {
    // Basic CSS that might be needed
    return `
      .builder-content {
        font-family: 'Inter', sans-serif;
      }
      .builder-content p {
        margin-bottom: 1rem;
      }
      .builder-content img {
        max-width: 100%;
        height: auto;
      }
    `;
  };

  // Page icons constant
  const PAGE_ICONS: Record<string, React.ReactNode> = {
    home: <Home size={14} />,
    financing: <CreditCard size={14} />,
    consignments: <Car size={14} />,
    'buy-direct': <ShoppingCart size={14} />,
    'we-search-for-you': <Search size={14} />,
    contact: <Mail size={14} />,
    about: <Building2 size={14} />,
  };

  // Auto-save and load on client change
  useEffect(() => {
    if (client?.id) {
      loadState();
    }
  }, [client?.id]);

  return (
    <div className='flex flex-col' data-tour='builder-topbar'>
      {/* ═══ Row 1: Site-level bar (dark) ═══ */}
      <div className='flex items-center h-10 px-4 bg-zinc-900 text-white'>
        {/* Left: Back + Builder label */}
        <div className='flex items-center gap-2 shrink-0'>
          {!isOnboardingMode && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => { if (isDirty) { setShowLeaveConfirm(true); } else { performLeave(false); } }}
              className='h-7 px-2 text-zinc-300 hover:text-white hover:bg-zinc-800'
            >
              <ArrowLeft size={15} />
            </Button>
          )}
          <h2 className='text-sm font-semibold tracking-wide'>Builder</h2>
        </div>

        <div className='flex-1' />

        {/* Right: Tour, Plantillas, Acciones, Guardar */}
        <div className='flex items-center gap-2 shrink-0'>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={startTour}
                  className='h-7 px-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700'
                >
                  <Lightbulb className='h-3.5 w-3.5' />
                  <span className='hidden xl:inline text-xs ml-1.5'>Tour</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom'><p>Tour guiado</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowTemplateSelector(true)}
                  className='h-7 px-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700'
                >
                  <LayoutTemplate className='h-3.5 w-3.5' />
                  <span className='hidden xl:inline text-xs ml-1.5'>Plantillas</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side='bottom'><p>Plantillas</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Popover data-tour='builder-actions-menu'>
            <PopoverTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                className='h-7 px-2.5 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 border border-zinc-700'
              >
                Acciones
                <ChevronDown size={13} className='ml-1' />
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-72 p-0' align='end'>
              {/* Estado — toggle row */}
              <div className='flex items-center justify-between px-4 py-3'>
                <div className='flex items-center gap-2'>
                  <div className={`w-2 h-2 rounded-full ${isWebsiteEnabled ? 'bg-sky-500' : 'bg-gray-300'}`} />
                  <span className='text-sm font-medium'>Sitio web</span>
                </div>
                <button
                  onClick={toggleWebsiteEnabled}
                  className={`relative w-9 h-5 rounded-full transition-colors duration-200 cursor-pointer ${
                    isWebsiteEnabled ? 'bg-sky-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    isWebsiteEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className='h-px bg-gray-100' />

              {/* Apariencia section */}
              <div className='px-4 py-3 space-y-3'>
                <p className='text-[11px] font-medium text-gray-400 uppercase tracking-wider'>Apariencia</p>

                {/* Theme — pill selector */}
                <div className='space-y-1.5'>
                  <p className='text-xs text-gray-500'>Tema</p>
                  <div className='flex gap-1 bg-gray-100 p-0.5 rounded-lg'>
                    <button
                      onClick={() => updateThemeConfig('light-only')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all ${
                        themeMode === 'light-only' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Sun size={12} className={themeMode === 'light-only' ? 'text-amber-300' : 'text-amber-500'} />
                      Claro
                    </button>
                    <button
                      onClick={() => updateThemeConfig('dark-only')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all ${
                        themeMode === 'dark-only' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Moon size={12} className={themeMode === 'dark-only' ? 'text-blue-300' : 'text-blue-400'} />
                      Oscuro
                    </button>
                    <button
                      onClick={() => updateThemeConfig('both', colorScheme)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs transition-all ${
                        themeMode === 'both' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Ambos
                    </button>
                  </div>
                  {themeMode === 'both' && (
                    <div className='flex items-center gap-2 pt-1'>
                      <p className='text-[11px] text-gray-400'>Por defecto:</p>
                      <div className='flex gap-1 bg-gray-100 p-0.5 rounded-md'>
                        <button
                          onClick={() => updateThemeConfig('both', 'LIGHT')}
                          className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                            colorScheme === 'LIGHT' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500'
                          }`}
                        >
                          Claro
                        </button>
                        <button
                          onClick={() => updateThemeConfig('both', 'DARK')}
                          className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                            colorScheme === 'DARK' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500'
                          }`}
                        >
                          Oscuro
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Language — pill selector */}
                <div className='space-y-1.5'>
                  <p className='text-xs text-gray-500'>Idioma</p>
                  <div className='flex gap-1 bg-gray-100 p-0.5 rounded-lg'>
                    <button
                      onClick={() => updateLanguageConfig('es-only')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition-all ${
                        languageMode === 'es-only' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      ES
                    </button>
                    <button
                      onClick={() => updateLanguageConfig('en-only')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition-all ${
                        languageMode === 'en-only' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => updateLanguageConfig('both', defaultLanguage)}
                      className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs transition-all ${
                        languageMode === 'both' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Globe size={11} />
                      Ambos
                    </button>
                  </div>
                  {languageMode === 'both' && (
                    <div className='flex items-center gap-2 pt-1'>
                      <p className='text-[11px] text-gray-400'>Por defecto:</p>
                      <div className='flex gap-1 bg-gray-100 p-0.5 rounded-md'>
                        <button
                          onClick={() => updateLanguageConfig('both', 'es')}
                          className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                            defaultLanguage === 'es' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500'
                          }`}
                        >
                          Español
                        </button>
                        <button
                          onClick={() => updateLanguageConfig('both', 'en')}
                          className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                            defaultLanguage === 'en' ? 'bg-slate-800 text-white shadow-sm font-medium' : 'text-gray-500'
                          }`}
                        >
                          Inglés
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className='h-px bg-gray-100' />

              {/* Actions */}
              <div className='p-1.5'>
                <button
                  onClick={() => setShowTemplateSelector(true)}
                  className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors'
                >
                  <LayoutTemplate size={15} className='text-gray-400' />
                  Cambiar plantilla
                </button>
                <button
                  onClick={() => setResetConfirmOpen(true)}
                  className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors'
                >
                  <RefreshCw size={15} className='text-gray-400' />
                  Partir de 0
                </button>
                <button
                  onClick={() => setDiscardConfirmOpen(true)}
                  className='w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-md transition-colors'
                >
                  <Trash2 size={15} />
                  Descartar cambios
                </button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleSave}
            disabled={isSaving}
            size='sm'
            className='h-7 px-3 text-xs bg-sky-500 hover:bg-sky-600 text-white'
            data-tour='builder-save-button'
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* ═══ Row 2: Page-level tools bar (light) ═══ */}
      <div className='flex items-center h-10 px-4 border-b bg-white gap-3'>
        {/* Left: Device toggle + Page dropdown */}
        <div className='flex items-center gap-2 shrink-0'>
          {/* Device toggle dropdown */}
          <div data-tour='builder-device-toggle'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='sm' className='h-7 px-2 gap-1.5 text-xs text-gray-600 hover:text-gray-900'>
                  {currentDevice === 'desktop' && <Monitor size={14} />}
                  {currentDevice === 'tablet' && <Tablet size={14} />}
                  {currentDevice === 'mobile' && <Smartphone size={14} />}
                  {currentDevice === 'desktop' ? 'Escritorio' : currentDevice === 'tablet' ? 'Tablet' : 'Móvil'}
                  <ChevronDown size={12} className='text-gray-400' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-48'>
                {([
                  { key: 'desktop' as PreviewDevice, icon: <Monitor size={14} />, label: 'Escritorio', desc: 'Vista completa' },
                  { key: 'tablet' as PreviewDevice, icon: <Tablet size={14} />, label: 'Tablet', desc: 'Vista tablet' },
                  { key: 'mobile' as PreviewDevice, icon: <Smartphone size={14} />, label: 'Móvil', desc: 'Vista móvil' },
                ]).map((d) => (
                  <DropdownMenuItem key={d.key} onClick={() => setCurrentDevice(d.key)} className='flex items-center gap-2 cursor-pointer text-gray-600'>
                    <span className={cn(currentDevice === d.key ? 'text-sky-600' : 'text-gray-400')}>{d.icon}</span>
                    <div className='flex-1'>
                      <div className='text-sm'>{d.label}</div>
                      <div className='text-[11px] text-gray-400'>{d.desc}</div>
                    </div>
                    {currentDevice === d.key && <Check size={14} className='text-sky-500' />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className='h-5 w-px bg-gray-200' />

          {/* Page selector dropdown */}
          <div className='flex items-center gap-1.5' data-tour='builder-page-selector'>
            <span className='text-xs text-gray-500 font-medium'>Página</span>
            <DropdownMenu onOpenChange={(open) => { if (!open) { setShowAddPage(false); setNewPageTitle(''); } }}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 px-2 text-xs font-medium gap-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                >
                  {PAGE_ICONS[currentPage] || <FileText size={14} />}
                  {allPages.find(p => p.slug === currentPage)?.label || currentPage}
                  <ChevronDown size={12} className='text-gray-400' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-56'>
                <DropdownMenuLabel className='text-xs text-gray-400'>Páginas del sitio</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {allPages.map((bp) => (
                  <DropdownMenuItem
                    key={bp.slug}
                    onClick={() => switchPage(bp.slug as PageSlug)}
                    onContextMenu={(e) => {
                      if (!bp.isSystem) {
                        e.preventDefault();
                        handleDeleteCustomPage(bp.slug);
                      }
                    }}
                    className='flex items-center gap-2 cursor-pointer font-normal text-gray-600'
                  >
                    {PAGE_ICONS[bp.slug] || <FileText size={14} />}
                    <span className='flex-1'>{bp.label}</span>
                    {currentPage === bp.slug && <Check size={14} className='text-blue-500' />}
                    {(!bp.isSystem || bp.slug !== 'home') && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (bp.isSystem) requestHideSystemPage(bp.slug);
                          else handleDeleteCustomPage(bp.slug);
                        }}
                        className='p-0.5 text-gray-400 hover:text-red-500 rounded'
                        title={bp.isSystem ? 'Eliminar página' : 'Eliminar página'}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </DropdownMenuItem>
                ))}
                {hiddenSystemPages.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className='text-xs text-gray-400'>Páginas ocultas</DropdownMenuLabel>
                    {hiddenSystemPages.map((slug) => (
                      <DropdownMenuItem
                        key={`hidden-${slug}`}
                        onSelect={(e) => { e.preventDefault(); restoreSystemPage(slug); }}
                        className='flex items-center gap-2 cursor-pointer font-normal text-gray-400'
                      >
                        {PAGE_ICONS[slug] || <FileText size={14} />}
                        <span className='flex-1 line-through'>
                          {BUILDER_PAGES.find(p => p.slug === slug)?.label || slug}
                        </span>
                        <span className='text-[10px] font-medium text-sky-500'>Restaurar</span>
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                <DropdownMenuSeparator />
                {showAddPage ? (
                  <div className='px-2 py-1.5 flex items-center gap-1' onClick={(e) => e.stopPropagation()}>
                    <input
                      type='text'
                      value={newPageTitle}
                      onChange={(e) => setNewPageTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustomPage(); if (e.key === 'Escape') setShowAddPage(false); }}
                      placeholder='Nombre de página'
                      className='h-7 px-2 text-xs border rounded-md flex-1'
                      autoFocus
                    />
                    <Button size='sm' variant='default' onClick={handleAddCustomPage} className='h-7 w-7 p-0'>
                      <Check size={13} />
                    </Button>
                    <Button size='sm' variant='ghost' onClick={() => setShowAddPage(false)} className='h-7 w-7 p-0'>
                      <X size={13} />
                    </Button>
                  </div>
                ) : (
                  <DropdownMenuItem
                    onSelect={(e) => { e.preventDefault(); setShowAddPage(true); }}
                    className='flex items-center gap-2 text-sky-500 font-semibold cursor-pointer'
                  >
                    <Plus size={14} />
                    <span>Crear nueva página</span>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        </div>

        {/* Center: URL preview */}
        <div className='flex-1 flex justify-center min-w-0'>
          {(client as any)?.domain && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://${(client as any).domain}`);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                      toast.success('URL copiada');
                    }}
                    className='flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-500 hover:bg-gray-200 transition-colors max-w-md truncate cursor-pointer'
                  >
                    <Globe size={13} className='shrink-0 text-gray-400' />
                    <span className='truncate'>{(client as any).domain}</span>
                    {linkCopied ? <Check size={12} className='shrink-0 text-green-500' /> : <Copy size={12} className='shrink-0 text-gray-400' />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side='bottom'>
                  <p>Click para copiar URL del sitio</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Right: Undo/Redo + Theme toggle */}
        <div className='flex items-center gap-2 shrink-0'>
          <div className='flex items-center gap-0.5 bg-gray-100 p-0.5 rounded-md'>
            <Button size='sm' variant='ghost' onClick={handleUndo} disabled={undoStack.length === 0} className='h-7 w-7 p-0 disabled:opacity-30' title='Deshacer'>
              <Undo2 size={14} />
            </Button>
            <Button size='sm' variant='ghost' onClick={handleRedo} disabled={redoStack.length === 0} className='h-7 w-7 p-0 disabled:opacity-30' title='Rehacer'>
              <Redo2 size={14} />
            </Button>
          </div>

          <div className='h-5 w-px bg-gray-200' />

          {/* Zoom controls */}
          <div className='flex items-center gap-0.5'>
            <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className='p-1 text-gray-400 hover:text-gray-600 rounded transition-colors' title='Alejar'>
              <ZoomOut size={14} />
            </button>
            <button onClick={() => setZoom(1)} className='text-[10px] text-gray-500 hover:text-gray-700 min-w-[32px] text-center' title='Restablecer zoom'>
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} className='p-1 text-gray-400 hover:text-gray-600 rounded transition-colors' title='Acercar'>
              <ZoomIn size={14} />
            </button>
          </div>

          <div className='h-5 w-px bg-gray-200' />

          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1.5 p-1 px-2.5 rounded-full ${
                  themeMode === 'both' ? 'bg-gray-50' : 'bg-gray-50/60'
                }`}>
                  <Sun size={15} strokeWidth={colorScheme === 'LIGHT' ? 2.5 : 1.5} className={colorScheme === 'LIGHT' ? 'text-sky-500' : 'text-gray-300'} />
                  <button
                    onClick={themeMode === 'both' ? toggleColorScheme : undefined}
                    disabled={themeMode !== 'both'}
                    className={`relative w-9 h-[18px] rounded-full transition-colors duration-200 ${
                      themeMode !== 'both' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    } ${colorScheme === 'DARK' ? 'bg-sky-500' : 'bg-gray-300'}`}
                    title={themeMode !== 'both'
                      ? 'Habilita ambos temas en Acciones'
                      : `Tema: ${colorScheme === 'LIGHT' ? 'Claro' : 'Oscuro'}`}
                  >
                    <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200 ${
                      colorScheme === 'DARK' ? 'translate-x-[18px]' : 'translate-x-0'
                    }`} />
                  </button>
                  <Moon size={15} strokeWidth={colorScheme === 'DARK' ? 2.5 : 1.5} className={colorScheme === 'DARK' ? 'text-sky-500' : 'text-gray-300'} />
                  {themeMode !== 'both' && (
                    <div className='w-3.5 h-3.5 rounded-full bg-amber-100 flex items-center justify-center'>
                      <span className='text-amber-600 text-[9px] font-bold'>!</span>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {themeMode !== 'both' && (
                <TooltipContent side='bottom' className='max-w-[200px] text-center'>
                  <p className='text-xs'>
                    {themeMode === 'light-only' ? 'Solo tema claro activo.' : 'Solo tema oscuro activo.'}
                    {' '}Habilita ambos en <strong>Acciones</strong> para alternar.
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Message when saving/loading */}
      {showSaveMessage && (
        <div className='fixed bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border z-50'>
          {saveMessage}
        </div>
      )}

      {/* Load dialog */}
      <AlertDialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cargar Estado Guardado</AlertDialogTitle>
            <AlertDialogDescription>
              Pega aquí el estado comprimido que fue exportado previamente
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={stateToLoad}
            onChange={(e) => setStateToLoad(e.target.value)}
            placeholder='Pega el estado guardado aquí...'
            className='min-h-[100px]'
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLoadFromString}>
              Cargar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset confirmation dialog */}
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Partir de 0</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas reiniciar el builder con los
              componentes por defecto? Esta acción eliminará todos los cambios
              actuales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={resetToDefault}>
              Reiniciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard changes confirmation dialog */}
      <AlertDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar Cambios</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas descartar todos los cambios actuales y
              volver al último estado guardado?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={discardChanges}>
              Descartar Cambios
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template change confirmation dialog */}
      <AlertDialog
        open={templateChangeConfirmOpen}
        onOpenChange={(open) => {
          setTemplateChangeConfirmOpen(open);
          if (!open) setPendingTemplateId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cambiar plantilla</AlertDialogTitle>
            <AlertDialogDescription>
              Esto reemplazará todo el contenido del builder con la nueva
              plantilla. Las personalizaciones actuales se perderán. ¿Continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTemplateChange}>
              Cambiar plantilla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete custom page confirmation */}
      <AlertDialog open={!!systemPageToHide} onOpenChange={(open) => { if (!open) setSystemPageToHide(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar página del sitio</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a quitar la página{' '}
              <strong>{BUILDER_PAGES.find(p => p.slug === systemPageToHide)?.label || systemPageToHide}</strong>{' '}
              de tu sitio. Dejará de estar disponible para los visitantes al Guardar.
              Puedes restaurarla después desde el selector de páginas (sección "Páginas ocultas").
              Recuerda quitar también su enlace del menú si lo tenías.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmHideSystemPage}
              className='bg-red-500 hover:bg-red-600'
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pageToDelete} onOpenChange={(open) => { if (!open) setPageToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar página</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Seguro que quieres eliminar la página "{pageToDelete?.title}"? Esta acción no se puede deshacer.
              Recuerda guardar para que el cambio se refleje en el sitio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCustomPage}
              className='bg-red-600 hover:bg-red-700 focus:ring-red-600'
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes — confirm before leaving the builder */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tienes cambios sin guardar</AlertDialogTitle>
            <AlertDialogDescription>
              Si sales ahora perderás los cambios que no hayas guardado. ¿Qué quieres hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quedarme</AlertDialogCancel>
            <Button
              variant='outline'
              onClick={() => { performLeave(false); }}
            >
              Salir sin guardar
            </Button>
            <AlertDialogAction
              onClick={() => { performLeave(true); }}
            >
              Guardar y salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template selector modal */}
      <TemplateSelectorModal
        open={showTemplateSelector}
        onSelect={handleTemplateSelectClick}
        onClose={() => setShowTemplateSelector(false)}
        colorScheme={colorScheme}
      />
    </div>
  );
};
