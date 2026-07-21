import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import { ImageSelector } from '../../settings/ImageSelector';
import { isBlankHtml } from './logoHelpers';

interface LogoItem {
  src: string;
  alt: string;
}

interface LogoMarqueeProps {
  title?: string;
  logos?: LogoItem[];
  bgColor?: string;
  textColor?: string;
  speed?: 'slow' | 'normal' | 'fast';
  grayscale?: boolean;
  logoMaxHeight?: number;
  showFadeEdges?: boolean;
}

const placeholderLogo = (label: string) => {
  const safe = label.replace(/[<>&'"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><rect x="1" y="1" width="158" height="58" rx="6" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1" stroke-dasharray="4 2"/><text x="80" y="34" font-family="-apple-system,system-ui,sans-serif" font-size="13" font-weight="500" fill="#6b7280" text-anchor="middle">${safe}</text></svg>`;
  return `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(svg) : ''}`;
};

const DEFAULT_LOGOS: LogoItem[] = [
  { src: placeholderLogo('Marca 1'), alt: 'Marca 1' },
  { src: placeholderLogo('Marca 2'), alt: 'Marca 2' },
  { src: placeholderLogo('Marca 3'), alt: 'Marca 3' },
  { src: placeholderLogo('Marca 4'), alt: 'Marca 4' },
  { src: placeholderLogo('Marca 5'), alt: 'Marca 5' },
  { src: placeholderLogo('Marca 6'), alt: 'Marca 6' },
  { src: placeholderLogo('Marca 7'), alt: 'Marca 7' },
  { src: placeholderLogo('Marca 8'), alt: 'Marca 8' },
];

const speedToDuration: Record<string, string> = {
  slow: '60s',
  normal: '40s',
  fast: '20s',
};

export const LogoMarquee = ({
  title = 'Marcas que trabajamos',
  logos = DEFAULT_LOGOS,
  bgColor = '#ffffff',
  textColor = '#111827',
  speed = 'normal',
  grayscale = true,
  logoMaxHeight = 40,
  showFadeEdges = true,
}: LogoMarqueeProps) => {
  const { connectors, selected, id } = useNode((s) => ({
    selected: s.events.selected,
  }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));

  const duration = speedToDuration[speed] || speedToDuration.normal;

  // Duplicate logos array so the marquee loops seamlessly.
  const doubled = [...logos, ...logos];

  return (
    <div
      ref={(el: HTMLDivElement | null) => {
        if (el) connectors.connect(el);
      }}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        position: 'relative',
        border: selected ? '2px dashed #666' : '1px solid transparent',
        outline: selected ? '1px dashed #999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className='w-full py-12 md:py-16'
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      {/* Inline scoped styles — keyframes + reduced motion + edge fade */}
      <style>{`
        @keyframes logoMarqueeSlide_${id} {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .logo-marquee-track-${id} {
          animation: logoMarqueeSlide_${id} ${duration} linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .logo-marquee-track-${id} {
            animation: none;
          }
        }
        .logo-marquee-mask-${id} {
          mask-image: linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%);
        }
      `}</style>

      {!isBlankHtml(title) && (
        <div className='text-center mb-8 px-4'>
          <EditableText
            tag='h2'
            value={title}
            nodeId={id}
            propName='title'
            className='text-2xl md:text-3xl font-bold'
            style={{ color: textColor }}
          />
        </div>
      )}

      <div
        className={`overflow-hidden ${showFadeEdges ? `logo-marquee-mask-${id}` : ''}`}
      >
        <div
          className={`logo-marquee-track-${id} flex items-center w-max`}
          style={{ gap: '3rem', paddingRight: '3rem' }}
        >
          {doubled.map((logo, i) => (
            <div
              key={i}
              className='flex-shrink-0 flex items-center justify-center min-h-[60px] min-w-[120px]'
              aria-hidden={i >= logos.length}
            >
              <img
                src={logo.src}
                alt={i < logos.length ? logo.alt || '' : ''}
                style={{
                  maxHeight: `${logoMaxHeight}px`,
                  filter: grayscale ? 'grayscale(100%)' : 'none',
                  opacity: grayscale ? 0.7 : 1,
                }}
                className='w-auto object-contain'
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const LogoMarqueeSettings = () => {
  const { actions, selected } = useEditor((state) => {
    const currentNodeId = state.events.selected;
    let selectedNode: { id: string; props: any } | null = null;
    if (currentNodeId) {
      const nodeId = Array.from(currentNodeId as Set<string>)[0];
      if (nodeId && state.nodes[nodeId]) {
        selectedNode = {
          id: nodeId,
          props: state.nodes[nodeId].data.props,
        };
      }
    }
    return { selected: selectedNode };
  });

  if (!selected) return null;
  const props = selected.props;
  const id = selected.id;

  const updateLogo = (index: number, field: 'src' | 'alt', value: string) => {
    actions.setProp(id, (p: any) => {
      const arr = [...(p.logos || [])];
      arr[index] = { ...arr[index], [field]: value };
      p.logos = arr;
    });
  };

  const addLogo = () => {
    actions.setProp(id, (p: any) => {
      const next = (p.logos || []).length + 1;
      p.logos = [
        ...(p.logos || []),
        { src: placeholderLogo(`Marca ${next}`), alt: `Marca ${next}` },
      ];
    });
  };

  const removeLogo = (index: number) => {
    actions.setProp(id, (p: any) => {
      p.logos = (p.logos || []).filter((_: any, i: number) => i !== index);
    });
  };

  return (
    <div className='space-y-4 overflow-y-auto max-h-[600px] pr-2'>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Título (opcional, vacío para ocultar)
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={props.title || ''}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.title = e.target.value;
            })
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color de fondo</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={props.bgColor || '#ffffff'}
            onChange={(e) =>
              actions.setProp(id, (p: any) => {
                p.bgColor = e.target.value;
              })
            }
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={props.bgColor || '#ffffff'}
            onChange={(e) =>
              actions.setProp(id, (p: any) => {
                p.bgColor = e.target.value;
              })
            }
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color de texto</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={props.textColor || '#111827'}
            onChange={(e) =>
              actions.setProp(id, (p: any) => {
                p.textColor = e.target.value;
              })
            }
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={props.textColor || '#111827'}
            onChange={(e) =>
              actions.setProp(id, (p: any) => {
                p.textColor = e.target.value;
              })
            }
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Velocidad</label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={props.speed || 'normal'}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.speed = e.target.value;
            })
          }
        >
          <option value='slow'>Lenta</option>
          <option value='normal'>Normal</option>
          <option value='fast'>Rápida</option>
        </select>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Altura máxima del logo (px)
        </label>
        <input
          type='number'
          className='w-full p-2 border rounded text-sm'
          min={20}
          max={120}
          value={props.logoMaxHeight || 40}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.logoMaxHeight = parseInt(e.target.value) || 40;
            })
          }
        />
      </div>
      <div className='flex items-center gap-2'>
        <input
          type='checkbox'
          id='marquee-grayscale'
          checked={!!props.grayscale}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.grayscale = e.target.checked;
            })
          }
        />
        <label htmlFor='marquee-grayscale' className='text-sm'>
          Logos en gris
        </label>
      </div>
      <div className='flex items-center gap-2'>
        <input
          type='checkbox'
          id='marquee-fade'
          checked={!!props.showFadeEdges}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.showFadeEdges = e.target.checked;
            })
          }
        />
        <label htmlFor='marquee-fade' className='text-sm'>
          Difuminar bordes
        </label>
      </div>

      <div className='pt-4 border-t'>
        <div className='flex items-center justify-between mb-2'>
          <span className='text-sm font-medium'>
            Logos ({(props.logos || []).length})
          </span>
          <button
            onClick={addLogo}
            className='text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100'
          >
            + Agregar
          </button>
        </div>
        <div className='space-y-3'>
          {(props.logos || []).map((logo: LogoItem, i: number) => (
            <div key={i} className='p-3 border rounded space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='text-xs text-gray-500'>Logo {i + 1}</span>
                <button
                  onClick={() => removeLogo(i)}
                  className='text-xs text-red-500 hover:text-red-700'
                >
                  Eliminar
                </button>
              </div>
              <div>
                <label className='text-xs text-gray-600 mb-1 block'>
                  Imagen
                </label>
                <ImageSelector
                  key={`marquee-logo-${i}-${(logo.src || '').slice(0, 32)}`}
                  value={logo.src}
                  onChange={(v) => updateLogo(i, 'src', v)}
                  placeholder='Arrastra un logo o haz clic'
                />
                <input
                  type='text'
                  className='w-full p-1.5 border rounded text-xs mt-2'
                  placeholder='...o pega una URL'
                  value={
                    logo.src && !logo.src.startsWith('data:') ? logo.src : ''
                  }
                  onChange={(e) => updateLogo(i, 'src', e.target.value)}
                />
              </div>
              <div>
                <label className='text-xs text-gray-600 mb-0.5 block'>
                  Texto alt
                </label>
                <input
                  type='text'
                  className='w-full p-1.5 border rounded text-xs'
                  value={logo.alt || ''}
                  onChange={(e) => updateLogo(i, 'alt', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

LogoMarquee.craft = {
  displayName: 'LogoMarquee',
  props: {
    title: 'Marcas que trabajamos',
    logos: DEFAULT_LOGOS,
    bgColor: '#ffffff',
    textColor: '#111827',
    speed: 'normal',
    grayscale: true,
    logoMaxHeight: 40,
    showFadeEdges: true,
  },
  related: {
    toolbar: LogoMarqueeSettings,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};

export { LogoMarqueeSettings };
