import { useState, useEffect } from 'react';
import { useEditor } from '@craftjs/core';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';
import lz from 'lzutf8';
import posthog from '@/utils/posthog';
import { BUILDER_PAGES } from './constants/builderPages';

// Curated Google Fonts for professional dealership websites
const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', category: 'Sans Serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans Serif' },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', category: 'Sans Serif' },
  { value: 'DM Sans', label: 'DM Sans', category: 'Sans Serif' },
  { value: 'Outfit', label: 'Outfit', category: 'Sans Serif' },
  { value: 'Satoshi', label: 'Satoshi', category: 'Sans Serif' },
  { value: 'Manrope', label: 'Manrope', category: 'Sans Serif' },
  { value: 'Space Grotesk', label: 'Space Grotesk', category: 'Sans Serif' },
  { value: 'Sora', label: 'Sora', category: 'Sans Serif' },
  { value: 'Nunito Sans', label: 'Nunito Sans', category: 'Sans Serif' },
  { value: 'Raleway', label: 'Raleway', category: 'Sans Serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans Serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans Serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans Serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans Serif' },
  { value: 'Work Sans', label: 'Work Sans', category: 'Sans Serif' },
  { value: 'Rubik', label: 'Rubik', category: 'Sans Serif' },
  { value: 'Urbanist', label: 'Urbanist', category: 'Sans Serif' },
  { value: 'Figtree', label: 'Figtree', category: 'Sans Serif' },
  { value: 'Geist', label: 'Geist', category: 'Sans Serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  { value: 'Source Serif 4', label: 'Source Serif 4', category: 'Serif' },
  { value: 'Cormorant Garamond', label: 'Cormorant Garamond', category: 'Serif' },
];

// Load a Google Font dynamically for preview
const loadGoogleFont = (fontFamily: string) => {
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
};

// Props that should be updated when primary color changes
const PRIMARY_COLOR_PROPS = [
  'accentColor', 'highlightColor', 'buttonColor', 'buttonBgColor',
  'iconColor', 'cardButtonColor', 'searchButtonColor', 'primaryButtonColor',
  'ctaBgColor',
];

// Props that should be updated when secondary color changes
const SECONDARY_COLOR_PROPS = [
  'buttonTextColor', 'ctaTextColor',
];

export const ThemePanel = () => {
  const { client, refreshClient } = useAuth();
  const { actions, query } = useEditor();

  const [primaryColor, setPrimaryColor] = useState('#e05d31');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('Poppins');
  const [isOpen, setIsOpen] = useState(false);
  const [isFontOpen, setIsFontOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fontSearch, setFontSearch] = useState('');

  // Access pagesStateRef from parent Topbar via window (set by Topbar)
  const getPagesStateRef = (): Record<string, { light: string | null; dark: string | null }> | null => {
    return (window as any).__builderPagesStateRef?.current || null;
  };

  useEffect(() => {
    if (client) {
      setPrimaryColor(client.theme?.light?.primary || '#e05d31');
      setSecondaryColor(client.theme?.light?.secondary || '#ffffff');
      setFontFamily((client.theme as any)?.light?.fontFamily || 'Poppins');
    }
  }, [client]);

  // Preload selected font for preview
  useEffect(() => {
    loadGoogleFont(fontFamily);
  }, [fontFamily]);

  // Update color props in a CraftJS node tree
  const updateColorsInState = (state: any, primary: string, secondary: string): any => {
    const nodes = state?.nodes || state;
    if (!nodes || typeof nodes !== 'object') return state;

    for (const nodeId of Object.keys(nodes)) {
      const node = nodes[nodeId];
      if (!node?.props) continue;
      const p = node.props;

      for (const prop of PRIMARY_COLOR_PROPS) {
        if (prop in p && p[prop]) p[prop] = primary;
      }
      for (const prop of SECONDARY_COLOR_PROPS) {
        if (prop in p && p[prop]) p[prop] = secondary;
      }
      // highlightedText/companyName stay as-is (text, not colors)
    }

    return state;
  };

  // Update colors in a compressed page state
  const updateCompressedState = (compressed: string, primary: string, secondary: string): string => {
    try {
      let parsed: any = lz.decompress(lz.decodeBase64(compressed));
      for (let i = 0; i < 3 && typeof parsed === 'string'; i++) {
        try { parsed = JSON.parse(parsed); } catch { break; }
      }
      updateColorsInState(parsed, primary, secondary);
      return lz.encodeBase64(lz.compress(JSON.stringify(parsed)));
    } catch {
      return compressed;
    }
  };

  const handleSave = async () => {
    if (!client?.id) return;
    setSaving(true);
    try {
      // 1. Save theme to client record
      const { error } = await supabase
        .from('clients')
        .update({
          theme: {
            ...client.theme,
            light: {
              ...client.theme?.light,
              primary: primaryColor,
              secondary: secondaryColor,
              fontFamily,
            },
          },
        })
        .eq('id', client.id);

      if (error) throw error;
      await refreshClient();

      // 2. Update current editor page
      try {
        const state = query.serialize();
        const parsed = typeof state === 'string' ? JSON.parse(state) : state;
        const nodes = parsed.nodes || parsed;
        for (const nodeId of Object.keys(nodes)) {
          const node = nodes[nodeId];
          if (!node?.props) continue;

          for (const prop of PRIMARY_COLOR_PROPS) {
            if (prop in node.props && node.props[prop]) {
              actions.setProp(nodeId, (props: any) => {
                props[prop] = primaryColor;
              });
            }
          }
          for (const prop of SECONDARY_COLOR_PROPS) {
            if (prop in node.props && node.props[prop]) {
              actions.setProp(nodeId, (props: any) => {
                props[prop] = secondaryColor;
              });
            }
          }
        }
      } catch (e) {
        console.error('Error updating current page colors:', e);
      }

      // 3. Update ALL other pages in pagesStateRef
      const pagesState = getPagesStateRef();
      if (pagesState) {
        for (const bp of BUILDER_PAGES) {
          const slots = pagesState[bp.slug];
          if (!slots) continue;
          if (slots.light) {
            slots.light = updateCompressedState(slots.light, primaryColor, secondaryColor);
          }
          if (slots.dark) {
            slots.dark = updateCompressedState(slots.dark, primaryColor, secondaryColor);
          }
        }
      }

      posthog.capture({
        distinctId: client?.id?.toString() || 'anonymous',
        event: 'builder_theme_changed',
        properties: {
          primary: primaryColor,
          secondary: secondaryColor,
          fontFamily,
        },
      });
      toast.success('Tema actualizado en todas las páginas');
    } catch (err) {
      console.error('Error saving theme:', err);
      toast.error('Error al guardar tema');
    } finally {
      setSaving(false);
    }
  };

  const filteredFonts = FONT_OPTIONS.filter((f) =>
    f.label.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const sansSerif = filteredFonts.filter((f) => f.category === 'Sans Serif');
  const serif = filteredFonts.filter((f) => f.category === 'Serif');

  return (
    <div className='space-y-2'>
    {/* ── Colors Section ── */}
    <div className='border border-gray-200 rounded-xl overflow-hidden'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <Icon icon='mdi:palette' className='text-lg text-gray-600' />
          <span className='text-sm font-medium text-gray-900'>Colores de Marca</span>
        </div>
        <div className='flex items-center gap-2'>
          <div className='flex gap-1'>
            <div className='w-4 h-4 rounded-full border border-gray-300' style={{ backgroundColor: primaryColor }} />
            <div className='w-4 h-4 rounded-full border border-gray-300' style={{ backgroundColor: secondaryColor }} />
          </div>
          <Icon icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className='text-lg text-gray-400' />
        </div>
      </button>

      {isOpen && (
        <div className='p-3 space-y-3 border-t border-gray-200'>
          {/* Color rows */}
          <div className='space-y-2'>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className='w-8 h-8 rounded border border-gray-200 cursor-pointer p-0 appearance-none [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm'
              />
              <div className='flex-1'>
                <p className='text-xs font-medium text-gray-700'>Primario</p>
                <p className='text-[10px] text-gray-400'>Botones, acentos</p>
              </div>
              <input
                type='text'
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className='w-20 px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-600'
              />
            </div>

            <div className='flex items-center gap-2'>
              <input
                type='color'
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className='w-8 h-8 rounded border border-gray-200 cursor-pointer p-0 appearance-none [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-sm'
              />
              <div className='flex-1'>
                <p className='text-xs font-medium text-gray-700'>Secundario</p>
                <p className='text-[10px] text-gray-400'>Texto de botones</p>
              </div>
              <input
                type='text'
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className='w-20 px-2 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-600'
              />
            </div>
          </div>

          {/* Preview */}
          <div className='flex gap-2'>
            <button
              className='flex-1 px-3 py-1.5 rounded-md text-xs font-medium'
              style={{ backgroundColor: primaryColor, color: secondaryColor }}
            >
              Primario
            </button>
            <button
              className='flex-1 px-3 py-1.5 rounded-md text-xs font-medium border'
              style={{ borderColor: primaryColor, color: primaryColor }}
            >
              Secundario
            </button>
          </div>

          {/* Logo */}
          {client?.logo && (
            <div className='flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100'>
              <img src={client.logo} alt='Logo' className='h-8 object-contain' />
              <p className='text-[10px] text-gray-400 flex-1'>Cambiar en Configuración</p>
            </div>
          )}
        </div>
      )}
    </div>

    {/* ── Typography Section ── */}
    <div className='border border-gray-200 rounded-xl overflow-hidden'>
      <button
        onClick={() => setIsFontOpen(!isFontOpen)}
        className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <Icon icon='mdi:format-font' className='text-lg text-gray-600' />
          <span className='text-sm font-medium text-gray-900'>Tipografía</span>
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-xs text-gray-500' style={{ fontFamily }}>{fontFamily}</span>
          <Icon icon={isFontOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} className='text-lg text-gray-400' />
        </div>
      </button>

      {isFontOpen && (
        <div className='p-3 space-y-3 border-t border-gray-200'>
          {/* Search */}
          <div className='relative'>
            <Icon icon='mdi:magnify' className='absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm' />
            <input
              type='text'
              placeholder='Buscar fuente...'
              value={fontSearch}
              onChange={(e) => setFontSearch(e.target.value)}
              className='w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-sky-300'
            />
          </div>

          {/* Font list */}
          <div className='max-h-[280px] overflow-y-auto space-y-1 -mx-1 px-1'>
            {sansSerif.length > 0 && (
              <>
                <p className='text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 pt-1'>Sans Serif</p>
                {sansSerif.map((font) => {
                  loadGoogleFont(font.value);
                  return (
                    <button
                      key={font.value}
                      onClick={() => setFontFamily(font.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        fontFamily === font.value
                          ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </button>
                  );
                })}
              </>
            )}
            {serif.length > 0 && (
              <>
                <p className='text-[10px] font-medium text-gray-400 uppercase tracking-wider px-1 pt-2'>Serif</p>
                {serif.map((font) => {
                  loadGoogleFont(font.value);
                  return (
                    <button
                      key={font.value}
                      onClick={() => setFontFamily(font.value)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        fontFamily === font.value
                          ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Preview */}
          <div className='p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1' style={{ fontFamily }}>
            <p className='text-base font-semibold text-gray-900'>Título de ejemplo</p>
            <p className='text-xs text-gray-500'>Texto del cuerpo con la fuente seleccionada para previsualizar cómo se verá en tu sitio web.</p>
          </div>
        </div>
      )}
    </div>

    {/* ── Save button (shared) ── */}
    <button
      onClick={() => setShowConfirm(true)}
      disabled={saving}
      className='w-full py-2.5 px-3 rounded-xl text-xs font-medium text-white bg-sky-500 hover:bg-sky-600 transition-colors disabled:opacity-50'
    >
      {saving ? (
        <span className='flex items-center justify-center gap-1.5'>
          <Icon icon='mdi:loading' className='animate-spin text-sm' />
          Aplicando...
        </span>
      ) : (
        'Aplicar a todo el sitio'
      )}
    </button>

    <p className='text-[10px] text-gray-400 text-center'>
      Se actualizan colores y tipografía en todas las páginas
    </p>

    {/* Confirmation modal */}
    {showConfirm && (
      <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40'>
        <div className='bg-white rounded-xl shadow-xl w-80 p-5 space-y-4 mx-4'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center shrink-0'>
              <Icon icon='mdi:palette' className='text-lg text-sky-500' />
            </div>
            <div>
              <h3 className='text-sm font-semibold text-gray-900'>Aplicar tema</h3>
              <p className='text-xs text-gray-500'>Esta acción no se puede deshacer</p>
            </div>
          </div>

          <p className='text-xs text-gray-600 leading-relaxed'>
            Se aplicarán los colores y la tipografía en <strong>todas las páginas</strong> y ambos temas (claro y oscuro).
          </p>

          <div className='space-y-2'>
            <div className='flex items-center gap-2 p-2 bg-gray-50 rounded-lg'>
              <div className='w-5 h-5 rounded border border-gray-200' style={{ backgroundColor: primaryColor }} />
              <span className='text-[11px] font-mono text-gray-500'>{primaryColor}</span>
              <span className='text-[11px] text-gray-300 mx-1'>+</span>
              <div className='w-5 h-5 rounded border border-gray-200' style={{ backgroundColor: secondaryColor }} />
              <span className='text-[11px] font-mono text-gray-500'>{secondaryColor}</span>
            </div>
            <div className='flex items-center gap-2 p-2 bg-gray-50 rounded-lg'>
              <Icon icon='mdi:format-font' className='text-gray-400 text-sm' />
              <span className='text-[11px] text-gray-500' style={{ fontFamily }}>{fontFamily}</span>
            </div>
          </div>

          <div className='flex gap-2'>
            <button
              onClick={() => setShowConfirm(false)}
              className='flex-1 py-2 px-3 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors'
            >
              Cancelar
            </button>
            <button
              onClick={() => { setShowConfirm(false); handleSave(); }}
              disabled={saving}
              className='flex-1 py-2 px-3 rounded-lg text-xs font-medium text-white bg-sky-500 hover:bg-sky-600 transition-colors disabled:opacity-50'
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
};
