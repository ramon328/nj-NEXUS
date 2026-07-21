import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { CreditCard, Car, CalendarClock, ShieldCheck } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const FeatureCard = ({ icon, title, description, color }: FeatureCardProps) => (
  <div className='flex flex-col items-center bg-white rounded-lg shadow-md p-6 transition-transform hover:-translate-y-1'>
    <div
      className='p-3 rounded-full mb-4'
      style={{ backgroundColor: `${color}20` }}
    >
      <div style={{ color }}>{icon}</div>
    </div>
    <h3 className='text-lg font-semibold mb-2'>{title}</h3>
    <p className='text-gray-600 text-center text-sm'>{description}</p>
  </div>
);

interface HeroFeatureCardsProps {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  cardBackgroundColor?: string;
  cardTextColor?: string;
  accentColor?: string;
  // Feature 1
  feature1Title?: string;
  feature1Description?: string;
  feature1Icon?: string;
  feature1Color?: string;
  // Feature 2
  feature2Title?: string;
  feature2Description?: string;
  feature2Icon?: string;
  feature2Color?: string;
  // Feature 3
  feature3Title?: string;
  feature3Description?: string;
  feature3Icon?: string;
  feature3Color?: string;
  // Feature 4
  feature4Title?: string;
  feature4Description?: string;
  feature4Icon?: string;
  feature4Color?: string;
}

export const HeroFeatureCards = ({
  title = 'Lo mejor para tu próximo auto',
  subtitle = 'Descubre por qué miles de personas eligen GoAuto para encontrar vehículos',
  backgroundImage = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470',
  overlayColor = '#000000',
  overlayOpacity = 0.7,
  textColor = '#ffffff',
  cardBackgroundColor = '#ffffff',
  cardTextColor = '#333333',
  accentColor = '#3b82f6',
  // Feature 1
  feature1Title = 'Financiamiento a tu medida',
  feature1Description = 'Opciones flexibles de pago adaptadas a tu presupuesto y necesidades',
  feature1Icon = 'CreditCard',
  feature1Color = '#3b82f6',
  // Feature 2
  feature2Title = 'Amplio catálogo',
  feature2Description = 'Miles de vehículos nuevos y usados con toda la información que necesitas',
  feature2Icon = 'Car',
  feature2Color = '#10b981',
  // Feature 3
  feature3Title = 'Proceso rápido',
  feature3Description = 'Desde la búsqueda hasta la adquisición en tiempo récord',
  feature3Icon = 'CalendarClock',
  feature3Color = '#f59e0b',
  // Feature 4
  feature4Title = 'Garantía total',
  feature4Description = 'Todos nuestros vehículos pasan por rigurosas inspecciones de calidad',
  feature4Icon = 'ShieldCheck',
  feature4Color = '#ef4444',
}: HeroFeatureCardsProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const overlayStyle = {
    backgroundColor: overlayColor,
    opacity: overlayOpacity,
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'CreditCard':
        return <CreditCard size={24} />;
      case 'Car':
        return <Car size={24} />;
      case 'CalendarClock':
        return <CalendarClock size={24} />;
      case 'ShieldCheck':
        return <ShieldCheck size={24} />;
      default:
        return <Car size={24} />;
    }
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        color: textColor,
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full min-h-[600px] flex items-center'
    >
      {/* Overlay */}
      <div style={overlayStyle} className='absolute inset-0 z-0' />

      {/* Content */}
      <div className='container mx-auto px-4 z-10 relative py-16'>
        <div className='max-w-3xl mx-auto text-center mb-12'>
          <h1
            style={{ color: textColor }}
            className='text-4xl md:text-5xl font-bold mb-4'
          >
            {title}
          </h1>
          <p style={{ color: textColor }} className='text-lg md:text-xl'>
            {subtitle}
          </p>
        </div>

        {/* Feature Cards */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8'>
          <FeatureCard
            icon={getIconComponent(feature1Icon)}
            title={feature1Title}
            description={feature1Description}
            color={feature1Color}
          />
          <FeatureCard
            icon={getIconComponent(feature2Icon)}
            title={feature2Title}
            description={feature2Description}
            color={feature2Color}
          />
          <FeatureCard
            icon={getIconComponent(feature3Icon)}
            title={feature3Title}
            description={feature3Description}
            color={feature3Color}
          />
          <FeatureCard
            icon={getIconComponent(feature4Icon)}
            title={feature4Title}
            description={feature4Description}
            color={feature4Color}
          />
        </div>
      </div>
    </div>
  );
};

const HeroFeatureCardsSettings = () => {
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
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.title || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.title = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Subtítulo</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={2}
          value={selected.props.subtitle || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.subtitle = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          URL de imagen de fondo
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.backgroundImage || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.backgroundImage = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de superposición
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.overlayColor || '#000000'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.overlayColor || '#000000'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Opacidad de superposición
        </label>
        <div className='flex items-center space-x-2'>
          <input
            type='range'
            min='0'
            max='1'
            step='0.1'
            className='flex-1'
            value={selected.props.overlayOpacity || 0.7}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayOpacity = parseFloat(e.target.value);
              });
            }}
          />
          <span className='w-10 text-center'>
            {(selected.props.overlayOpacity || 0.7) * 100}%
          </span>
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto principal
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.textColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.textColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <h3 className='font-medium mt-6'>Característica 1</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.feature1Title || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature1Title = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Descripción</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={2}
          value={selected.props.feature1Description || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature1Description = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Ícono</label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={selected.props.feature1Icon || 'CreditCard'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature1Icon = e.target.value;
            });
          }}
        >
          <option value='CreditCard'>Tarjeta de crédito</option>
          <option value='Car'>Auto</option>
          <option value='CalendarClock'>Calendario</option>
          <option value='ShieldCheck'>Escudo</option>
        </select>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.feature1Color || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.feature1Color = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.feature1Color || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.feature1Color = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <h3 className='font-medium mt-6'>Característica 2</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.feature2Title || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature2Title = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Descripción</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={2}
          value={selected.props.feature2Description || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature2Description = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Ícono</label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={selected.props.feature2Icon || 'Car'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature2Icon = e.target.value;
            });
          }}
        >
          <option value='CreditCard'>Tarjeta de crédito</option>
          <option value='Car'>Auto</option>
          <option value='CalendarClock'>Calendario</option>
          <option value='ShieldCheck'>Escudo</option>
        </select>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.feature2Color || '#10b981'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.feature2Color = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.feature2Color || '#10b981'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.feature2Color = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <h3 className='font-medium mt-6'>Característica 3</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.feature3Title || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature3Title = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Descripción</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={2}
          value={selected.props.feature3Description || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature3Description = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Ícono</label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={selected.props.feature3Icon || 'CalendarClock'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature3Icon = e.target.value;
            });
          }}
        >
          <option value='CreditCard'>Tarjeta de crédito</option>
          <option value='Car'>Auto</option>
          <option value='CalendarClock'>Calendario</option>
          <option value='ShieldCheck'>Escudo</option>
        </select>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.feature3Color || '#f59e0b'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.feature3Color = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.feature3Color || '#f59e0b'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.feature3Color = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <h3 className='font-medium mt-6'>Característica 4</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.feature4Title || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature4Title = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Descripción</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={2}
          value={selected.props.feature4Description || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature4Description = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Ícono</label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={selected.props.feature4Icon || 'ShieldCheck'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.feature4Icon = e.target.value;
            });
          }}
        >
          <option value='CreditCard'>Tarjeta de crédito</option>
          <option value='Car'>Auto</option>
          <option value='CalendarClock'>Calendario</option>
          <option value='ShieldCheck'>Escudo</option>
        </select>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.feature4Color || '#ef4444'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.feature4Color = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.feature4Color || '#ef4444'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.feature4Color = e.target.value;
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

HeroFeatureCards.craft = {
  displayName: 'Hero con Características',
  props: {
    title: 'Lo mejor para tu próximo auto',
    subtitle:
      'Descubre por qué miles de personas eligen GoAuto para encontrar vehículos',
    backgroundImage:
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470',
    overlayColor: '#000000',
    overlayOpacity: 0.7,
    textColor: '#ffffff',
    cardBackgroundColor: '#ffffff',
    cardTextColor: '#333333',
    accentColor: '#3b82f6',
    // Feature 1
    feature1Title: 'Financiamiento a tu medida',
    feature1Description:
      'Opciones flexibles de pago adaptadas a tu presupuesto y necesidades',
    feature1Icon: 'CreditCard',
    feature1Color: '#3b82f6',
    // Feature 2
    feature2Title: 'Amplio catálogo',
    feature2Description:
      'Miles de vehículos nuevos y usados con toda la información que necesitas',
    feature2Icon: 'Car',
    feature2Color: '#10b981',
    // Feature 3
    feature3Title: 'Proceso rápido',
    feature3Description:
      'Desde la búsqueda hasta la adquisición en tiempo récord',
    feature3Icon: 'CalendarClock',
    feature3Color: '#f59e0b',
    // Feature 4
    feature4Title: 'Garantía total',
    feature4Description:
      'Todos nuestros vehículos pasan por rigurosas inspecciones de calidad',
    feature4Icon: 'ShieldCheck',
    feature4Color: '#ef4444',
  },
  related: {
    toolbar: HeroFeatureCardsSettings,
  },
};

export { HeroFeatureCardsSettings };
