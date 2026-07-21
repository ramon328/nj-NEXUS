import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { ChevronRight, Star, Check, Shield } from 'lucide-react';

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const Feature = ({ icon, title, description }: FeatureProps) => (
  <div className='flex gap-3 items-start'>
    <div className='flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600'>
      {icon}
    </div>
    <div>
      <h3 className='font-medium text-gray-900'>{title}</h3>
      <p className='text-sm text-gray-600 mt-1'>{description}</p>
    </div>
  </div>
);

interface HeroImageDividedProps {
  title?: string;
  subtitle?: string;
  description?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  imageSrc?: string;
  primaryButtonColor?: string;
  primaryButtonTextColor?: string;
  secondaryButtonColor?: string;
  secondaryButtonTextColor?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  showFeatures?: boolean;
  featureOneTitle?: string;
  featureOneDesc?: string;
  featureTwoTitle?: string;
  featureTwoDesc?: string;
  featureThreeTitle?: string;
  featureThreeDesc?: string;
  reversed?: boolean;
}

export const HeroImageDivided = ({
  title = 'La mejor selección de autos seminuevos y nuevos',
  subtitle = 'GoAuto',
  description = 'Encuentra el vehículo perfecto para ti. Con miles de opciones disponibles, garantía extendida y financiamiento accesible, comprar tu próximo auto nunca fue tan fácil.',
  primaryButtonText = 'Ver catálogo',
  secondaryButtonText = 'Solicitar cotización',
  imageSrc = 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1470',
  primaryButtonColor = '#3b82f6',
  primaryButtonTextColor = '#ffffff',
  secondaryButtonColor = '#ffffff',
  secondaryButtonTextColor = '#111827',
  backgroundColor = '#ffffff',
  textColor = '#111827',
  accentColor = '#3b82f6',
  showFeatures = true,
  featureOneTitle = 'Autos certificados',
  featureOneDesc = 'Todos nuestros vehículos son inspeccionados minuciosamente',
  featureTwoTitle = 'Garantía extendida',
  featureTwoDesc = 'Hasta 3 años de garantía en motor y transmisión',
  featureThreeTitle = 'Compra segura',
  featureThreeDesc = 'Documentación verificada y proceso transparente',
  reversed = false,
}: HeroImageDividedProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const primaryButtonStyle = {
    backgroundColor: primaryButtonColor,
    color: primaryButtonTextColor,
  };

  const secondaryButtonStyle = {
    backgroundColor: secondaryButtonColor,
    color: secondaryButtonTextColor,
    borderColor:
      secondaryButtonTextColor === '#ffffff'
        ? 'rgba(255,255,255,0.2)'
        : '#e5e7eb',
  };

  const contentStyles = {
    color: textColor,
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        backgroundColor,
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full py-12 md:py-20'
    >
      <div className='container px-4 mx-auto'>
        <div
          className={`flex flex-col md:flex-row gap-12 md:gap-16 items-center ${
            reversed ? 'md:flex-row-reverse' : ''
          }`}
        >
          {/* Text Content */}
          <div className='flex-1'>
            <div className='max-w-xl' style={contentStyles}>
              <p
                className='text-sm font-semibold uppercase tracking-wider mb-3'
                style={{ color: accentColor }}
              >
                {subtitle}
              </p>
              <h1 className='text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4'>
                {title}
              </h1>
              <p className='text-lg opacity-90 mb-8'>{description}</p>

              <div className='flex flex-wrap gap-4 mb-12'>
                <button
                  style={primaryButtonStyle}
                  className='px-6 py-3 rounded-lg font-medium text-base inline-flex items-center transition-all hover:brightness-110'
                >
                  {primaryButtonText}
                  <ChevronRight size={18} className='ml-1' />
                </button>
                <button
                  style={secondaryButtonStyle}
                  className='px-6 py-3 rounded-lg font-medium text-base border transition-all hover:bg-gray-50'
                >
                  {secondaryButtonText}
                </button>
              </div>

              {showFeatures && (
                <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
                  <Feature
                    icon={<Shield size={20} />}
                    title={featureOneTitle}
                    description={featureOneDesc}
                  />
                  <Feature
                    icon={<Check size={20} />}
                    title={featureTwoTitle}
                    description={featureTwoDesc}
                  />
                  <Feature
                    icon={<Star size={20} />}
                    title={featureThreeTitle}
                    description={featureThreeDesc}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Image */}
          <div className='flex-1'>
            <div
              className='relative rounded-xl overflow-hidden shadow-xl'
              style={{
                border: selected ? '1px dashed #1e88e5' : 'none',
                aspectRatio: '4/3',
              }}
            >
              <img
                src={imageSrc}
                alt={title}
                className='w-full h-full object-cover'
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroImageDividedSettings = () => {
  const { actions, selected } = useEditor((state) => {
    const currentNodeId = state.events.selected;
    let selectedNode = null;

    if (currentNodeId) {
      const nodeId = Array.from(currentNodeId as Set<string>)[0];
      if (nodeId && state.nodes[nodeId]) {
        selectedNode = {
          id: nodeId,
          data: state.nodes[nodeId].data,
          props: state.nodes[nodeId].data.props,
        };
      }
    }

    return {
      selected: selectedNode,
    };
  });

  if (!selected) return null;

  return (
    <div className='space-y-4 overflow-y-auto max-h-[600px] pr-2'>
      <h3 className='font-medium'>Configuración general</h3>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Distribuir contenido al revés
        </label>
        <input
          type='checkbox'
          checked={selected.props.reversed || false}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.reversed = e.target.checked;
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>Subtítulo</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.subtitle || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.subtitle = e.target.value;
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={2}
          value={selected.props.title || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.title = e.target.value;
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>Descripción</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={3}
          value={selected.props.description || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.description = e.target.value;
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>URL de imagen</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.imageSrc || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.imageSrc = e.target.value;
            });
          }}
        />
      </div>

      <h3 className='font-medium mt-6'>Colores</h3>

      <div>
        <label className='text-sm font-medium mb-1 block'>Color de fondo</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.backgroundColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.backgroundColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.backgroundColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.backgroundColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.textColor || '#111827'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.textColor || '#111827'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de acento
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.accentColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.accentColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.accentColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.accentColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <h3 className='font-medium mt-6'>Botones</h3>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto del botón principal
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.primaryButtonText || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.primaryButtonText = e.target.value;
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del botón principal
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.primaryButtonColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.primaryButtonColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.primaryButtonColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.primaryButtonColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto del botón principal
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.primaryButtonTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.primaryButtonTextColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.primaryButtonTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.primaryButtonTextColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto del botón secundario
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.secondaryButtonText || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.secondaryButtonText = e.target.value;
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del botón secundario
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.secondaryButtonColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.secondaryButtonColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.secondaryButtonColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.secondaryButtonColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <h3 className='font-medium mt-6'>Características</h3>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Mostrar características
        </label>
        <input
          type='checkbox'
          checked={selected.props.showFeatures || false}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.showFeatures = e.target.checked;
            });
          }}
        />
      </div>

      {selected.props.showFeatures && (
        <>
          <div>
            <label className='text-sm font-medium mb-1 block'>
              Característica 1 - Título
            </label>
            <input
              type='text'
              className='w-full p-2 border rounded text-sm'
              value={selected.props.featureOneTitle || ''}
              onChange={(e) => {
                actions.setProp(selected.id, (props: any) => {
                  props.featureOneTitle = e.target.value;
                });
              }}
            />
          </div>
          <div>
            <label className='text-sm font-medium mb-1 block'>
              Característica 1 - Descripción
            </label>
            <input
              type='text'
              className='w-full p-2 border rounded text-sm'
              value={selected.props.featureOneDesc || ''}
              onChange={(e) => {
                actions.setProp(selected.id, (props: any) => {
                  props.featureOneDesc = e.target.value;
                });
              }}
            />
          </div>

          <div>
            <label className='text-sm font-medium mb-1 block'>
              Característica 2 - Título
            </label>
            <input
              type='text'
              className='w-full p-2 border rounded text-sm'
              value={selected.props.featureTwoTitle || ''}
              onChange={(e) => {
                actions.setProp(selected.id, (props: any) => {
                  props.featureTwoTitle = e.target.value;
                });
              }}
            />
          </div>
          <div>
            <label className='text-sm font-medium mb-1 block'>
              Característica 2 - Descripción
            </label>
            <input
              type='text'
              className='w-full p-2 border rounded text-sm'
              value={selected.props.featureTwoDesc || ''}
              onChange={(e) => {
                actions.setProp(selected.id, (props: any) => {
                  props.featureTwoDesc = e.target.value;
                });
              }}
            />
          </div>

          <div>
            <label className='text-sm font-medium mb-1 block'>
              Característica 3 - Título
            </label>
            <input
              type='text'
              className='w-full p-2 border rounded text-sm'
              value={selected.props.featureThreeTitle || ''}
              onChange={(e) => {
                actions.setProp(selected.id, (props: any) => {
                  props.featureThreeTitle = e.target.value;
                });
              }}
            />
          </div>
          <div>
            <label className='text-sm font-medium mb-1 block'>
              Característica 3 - Descripción
            </label>
            <input
              type='text'
              className='w-full p-2 border rounded text-sm'
              value={selected.props.featureThreeDesc || ''}
              onChange={(e) => {
                actions.setProp(selected.id, (props: any) => {
                  props.featureThreeDesc = e.target.value;
                });
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

HeroImageDivided.craft = {
  displayName: 'Hero con Imagen Dividida',
  props: {
    title: 'La mejor selección de autos seminuevos y nuevos',
    subtitle: 'GoAuto',
    description:
      'Encuentra el vehículo perfecto para ti. Con miles de opciones disponibles, garantía extendida y financiamiento accesible, comprar tu próximo auto nunca fue tan fácil.',
    primaryButtonText: 'Ver catálogo',
    secondaryButtonText: 'Solicitar cotización',
    imageSrc:
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1470',
    primaryButtonColor: '#3b82f6',
    primaryButtonTextColor: '#ffffff',
    secondaryButtonColor: '#ffffff',
    secondaryButtonTextColor: '#111827',
    backgroundColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#3b82f6',
    showFeatures: true,
    featureOneTitle: 'Autos certificados',
    featureOneDesc:
      'Todos nuestros vehículos son inspeccionados minuciosamente',
    featureTwoTitle: 'Garantía extendida',
    featureTwoDesc: 'Hasta 3 años de garantía en motor y transmisión',
    featureThreeTitle: 'Compra segura',
    featureThreeDesc: 'Documentación verificada y proceso transparente',
    reversed: false,
  },
  related: {
    toolbar: HeroImageDividedSettings,
  },
};

export { HeroImageDividedSettings };
