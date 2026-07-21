import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText, EditableArrayText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import { ImageSelector } from '../../settings/ImageSelector';
import { isBlankHtml } from './logoHelpers';

interface LogoItem {
  src: string;
  alt: string;
}

interface LogoGroup {
  category: string;
  logos: LogoItem[];
}

interface LogoGridProps {
  title?: string;
  subtitle?: string;
  groups?: LogoGroup[];
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  grayscale?: boolean;
  logoMaxHeight?: number;
}

const placeholderLogo = (label: string) => {
  const safe = label.replace(/[<>&'"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><rect x="1" y="1" width="158" height="58" rx="6" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1" stroke-dasharray="4 2"/><text x="80" y="34" font-family="-apple-system,system-ui,sans-serif" font-size="13" font-weight="500" fill="#6b7280" text-anchor="middle">${safe}</text></svg>`;
  return `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa(svg) : ''}`;
};

const DEFAULT_GROUPS: LogoGroup[] = [
  {
    category: 'Marcas que vendemos',
    logos: [
      { src: placeholderLogo('Marca 1'), alt: 'Marca 1' },
      { src: placeholderLogo('Marca 2'), alt: 'Marca 2' },
      { src: placeholderLogo('Marca 3'), alt: 'Marca 3' },
      { src: placeholderLogo('Marca 4'), alt: 'Marca 4' },
    ],
  },
  {
    category: 'Bancos partners',
    logos: [
      { src: placeholderLogo('Banco 1'), alt: 'Banco 1' },
      { src: placeholderLogo('Banco 2'), alt: 'Banco 2' },
      { src: placeholderLogo('Banco 3'), alt: 'Banco 3' },
    ],
  },
  {
    category: 'Certificaciones',
    logos: [
      { src: placeholderLogo('Cert 1'), alt: 'Cert 1' },
      { src: placeholderLogo('Cert 2'), alt: 'Cert 2' },
    ],
  },
];

export const LogoGrid = ({
  title = 'Con el respaldo de los mejores',
  subtitle = 'Trabajamos con empresas e instituciones de primer nivel',
  groups = DEFAULT_GROUPS,
  bgColor = '#ffffff',
  textColor = '#111827',
  accentColor = '#3b82f6',
  grayscale = true,
  logoMaxHeight = 44,
}: LogoGridProps) => {
  const { connectors, selected, id } = useNode((s) => ({
    selected: s.events.selected,
  }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));

  const subtextColor = `${textColor}99`;

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
      className='w-full py-12 md:py-16 px-4 sm:px-6 lg:px-8'
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className='max-w-7xl mx-auto'>
        {(!isBlankHtml(title) || !isBlankHtml(subtitle)) && (
        <div className='text-center mb-12'>
          {!isBlankHtml(title) && (
          <EditableText
            tag='h2'
            value={title}
            nodeId={id}
            propName='title'
            className='text-2xl md:text-3xl font-bold'
            style={{ color: textColor }}
          />
          )}
          {!isBlankHtml(subtitle) && (
            <EditableText
              tag='p'
              value={subtitle}
              nodeId={id}
              propName='subtitle'
              className='mt-2 text-sm md:text-base'
              style={{ color: subtextColor }}
            />
          )}
        </div>
        )}

        <div className='space-y-10'>
          {groups.map((group, gi) => (
            <div key={gi}>
              <div className='flex items-center gap-3 mb-5'>
                <div
                  className='h-px flex-1'
                  style={{ backgroundColor: `${textColor}20` }}
                />
                <EditableArrayText
                  tag='h3'
                  value={group.category}
                  nodeId={id}
                  arrayProp='groups'
                  index={gi}
                  field='category'
                  className='text-sm font-semibold uppercase tracking-wider'
                  style={{ color: accentColor }}
                />
                <div
                  className='h-px flex-1'
                  style={{ backgroundColor: `${textColor}20` }}
                />
              </div>
              <div className='flex flex-wrap items-center justify-center gap-x-12 gap-y-6'>
                {group.logos.map((logo, li) => (
                  <div
                    key={li}
                    className='flex items-center justify-center min-h-[60px] min-w-[120px]'
                  >
                    <img
                      src={logo.src}
                      alt={logo.alt || ''}
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
          ))}
        </div>
      </div>
    </div>
  );
};

const LogoGridSettings = () => {
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

  const updateGroupName = (gi: number, name: string) => {
    actions.setProp(id, (p: any) => {
      const arr = [...(p.groups || [])];
      arr[gi] = { ...arr[gi], category: name };
      p.groups = arr;
    });
  };

  const updateLogo = (
    gi: number,
    li: number,
    field: 'src' | 'alt',
    value: string
  ) => {
    actions.setProp(id, (p: any) => {
      const groups = [...(p.groups || [])];
      const logos = [...(groups[gi]?.logos || [])];
      logos[li] = { ...logos[li], [field]: value };
      groups[gi] = { ...groups[gi], logos };
      p.groups = groups;
    });
  };

  const addLogoToGroup = (gi: number) => {
    actions.setProp(id, (p: any) => {
      const groups = [...(p.groups || [])];
      const logos = [...(groups[gi]?.logos || [])];
      const next = logos.length + 1;
      logos.push({
        src: placeholderLogo(`Logo ${next}`),
        alt: `Logo ${next}`,
      });
      groups[gi] = { ...groups[gi], logos };
      p.groups = groups;
    });
  };

  const removeLogo = (gi: number, li: number) => {
    actions.setProp(id, (p: any) => {
      const groups = [...(p.groups || [])];
      const logos = (groups[gi]?.logos || []).filter(
        (_: any, i: number) => i !== li
      );
      groups[gi] = { ...groups[gi], logos };
      p.groups = groups;
    });
  };

  const addGroup = () => {
    actions.setProp(id, (p: any) => {
      p.groups = [
        ...(p.groups || []),
        {
          category: 'Nueva categoría',
          logos: [
            { src: placeholderLogo('Logo 1'), alt: 'Logo 1' },
            { src: placeholderLogo('Logo 2'), alt: 'Logo 2' },
          ],
        },
      ];
    });
  };

  const removeGroup = (gi: number) => {
    actions.setProp(id, (p: any) => {
      p.groups = (p.groups || []).filter((_: any, i: number) => i !== gi);
    });
  };

  return (
    <div className='space-y-4 overflow-y-auto max-h-[600px] pr-2'>
      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
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
        <label className='text-sm font-medium mb-1 block'>Subtítulo</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={2}
          value={props.subtitle || ''}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.subtitle = e.target.value;
            })
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color de fondo</label>
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
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color de texto</label>
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
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de acento (categorías)
        </label>
        <input
          type='color'
          className='w-10 h-10 p-1 border rounded'
          value={props.accentColor || '#3b82f6'}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.accentColor = e.target.value;
            })
          }
        />
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
          value={props.logoMaxHeight || 44}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.logoMaxHeight = parseInt(e.target.value) || 44;
            })
          }
        />
      </div>
      <div className='flex items-center gap-2'>
        <input
          type='checkbox'
          id='grid-grayscale'
          checked={!!props.grayscale}
          onChange={(e) =>
            actions.setProp(id, (p: any) => {
              p.grayscale = e.target.checked;
            })
          }
        />
        <label htmlFor='grid-grayscale' className='text-sm'>
          Logos en gris
        </label>
      </div>

      <div className='pt-4 border-t'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-sm font-medium'>
            Categorías ({(props.groups || []).length})
          </span>
          <button
            onClick={addGroup}
            className='text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100'
          >
            + Categoría
          </button>
        </div>
        <div className='space-y-4'>
          {(props.groups || []).map((group: LogoGroup, gi: number) => (
            <div key={gi} className='p-3 border rounded space-y-2 bg-gray-50'>
              <div className='flex items-center justify-between'>
                <span className='text-xs text-gray-500'>
                  Categoría {gi + 1}
                </span>
                <button
                  onClick={() => removeGroup(gi)}
                  className='text-xs text-red-500 hover:text-red-700'
                >
                  Eliminar categoría
                </button>
              </div>
              <div>
                <label className='text-xs text-gray-600 mb-0.5 block'>
                  Nombre
                </label>
                <input
                  type='text'
                  className='w-full p-1.5 border rounded text-xs'
                  value={group.category || ''}
                  onChange={(e) => updateGroupName(gi, e.target.value)}
                />
              </div>
              <div className='pt-2'>
                <div className='flex items-center justify-between mb-1'>
                  <span className='text-xs text-gray-600'>
                    Logos ({(group.logos || []).length})
                  </span>
                  <button
                    onClick={() => addLogoToGroup(gi)}
                    className='text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded'
                  >
                    + Logo
                  </button>
                </div>
                <div className='space-y-2'>
                  {(group.logos || []).map((logo: LogoItem, li: number) => (
                    <div
                      key={li}
                      className='p-2 bg-white border rounded space-y-1.5'
                    >
                      <div className='flex items-center justify-between'>
                        <span className='text-[10px] text-gray-400'>
                          Logo {li + 1}
                        </span>
                        <button
                          onClick={() => removeLogo(gi, li)}
                          className='text-[10px] text-red-500'
                        >
                          ×
                        </button>
                      </div>
                      <ImageSelector
                        key={`grid-${gi}-${li}-${(logo.src || '').slice(0, 32)}`}
                        value={logo.src}
                        onChange={(v) => updateLogo(gi, li, 'src', v)}
                        placeholder='Subir logo'
                      />
                      <input
                        type='text'
                        className='w-full p-1 border rounded text-xs'
                        placeholder='...o pega una URL'
                        value={
                          logo.src && !logo.src.startsWith('data:')
                            ? logo.src
                            : ''
                        }
                        onChange={(e) =>
                          updateLogo(gi, li, 'src', e.target.value)
                        }
                      />
                      <input
                        type='text'
                        className='w-full p-1 border rounded text-xs'
                        placeholder='Alt'
                        value={logo.alt || ''}
                        onChange={(e) =>
                          updateLogo(gi, li, 'alt', e.target.value)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

LogoGrid.craft = {
  displayName: 'LogoGrid',
  props: {
    title: 'Con el respaldo de los mejores',
    subtitle: 'Trabajamos con empresas e instituciones de primer nivel',
    groups: DEFAULT_GROUPS,
    bgColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#3b82f6',
    grayscale: true,
    logoMaxHeight: 44,
  },
  related: {
    toolbar: LogoGridSettings,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};

export { LogoGridSettings };
