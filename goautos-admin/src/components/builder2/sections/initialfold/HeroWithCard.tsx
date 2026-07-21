import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText } from '../../EditableText';
import { Button } from '@/components/ui/button';

interface HeroWithCardProps {
  title?: string;
  subtitle?: string;
  cardTitle?: string;
  cardDescription?: string;
  buttonText?: string;
  buttonLink?: string;
  backgroundImage?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  cardPosition?: 'left' | 'right';
  cardBackground?: string;
  cardTextColor?: string;
  children?: React.ReactNode;
}

export const HeroWithCard = ({
  title = 'GoAuto - Tu mejor opción',
  subtitle = 'Encuentra el vehículo perfecto para ti',
  cardTitle = 'Financiamiento disponible',
  cardDescription = 'Ofrecemos las mejores opciones de financiamiento adaptadas a tus necesidades. Aprobación rápida y tasas competitivas.',
  buttonText = 'Solicitar ahora',
  buttonLink = '/financiamiento',
  backgroundImage = 'https://images.unsplash.com/photo-1583267746897-2cf415887172?q=80&w=1470',
  overlayColor = '#000000',
  overlayOpacity = 0.6,
  textColor = '#ffffff',
  cardPosition = 'right',
  cardBackground = '#ffffff',
  cardTextColor = '#333333',
  children,
}: HeroWithCardProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  // Detectar si estamos en modo editor
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const overlayStyle = {
    backgroundColor: overlayColor,
    opacity: overlayOpacity,
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
      <div className='container mx-auto px-4 z-10 relative py-12'>
        <div
          className={`flex flex-col lg:flex-row items-center ${
            cardPosition === 'left' ? 'lg:flex-row-reverse' : ''
          } gap-8`}
        >
          {/* Text content */}
          <div className='lg:w-1/2 space-y-6'>
            <EditableText tag="h1" value={title} nodeId={id} propName="title" style={{ color: textColor }} className='text-4xl md:text-5xl font-bold' />
            <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle" style={{ color: textColor }} className='text-lg md:text-xl' />
          </div>

          {/* Card */}
          <div className='lg:w-1/2'>
            <div
              style={{
                backgroundColor: cardBackground,
                color: cardTextColor,
              }}
              className='rounded-lg shadow-lg p-8'
            >
              <EditableText tag="h3" value={cardTitle} nodeId={id} propName="cardTitle" className='text-2xl font-bold mb-4' />
              <EditableText tag="p" value={cardDescription} nodeId={id} propName="cardDescription" className='mb-6' />
              <Button
                asChild
                className='px-6 py-2 text-white rounded-md bg-blue-600 hover:bg-blue-700 transition-colors'
              >
                <a href={isEnabled ? '#' : buttonLink}><EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" /></a>
              </Button>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
};

const HeroWithCardSettings = () => {
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
    <div className='space-y-4'>
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
          Título de la tarjeta
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.cardTitle || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.cardTitle = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Descripción de la tarjeta
        </label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={3}
          value={selected.props.cardDescription || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.cardDescription = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto del botón
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.buttonText || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.buttonText = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Enlace del botón
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.buttonLink || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.buttonLink = e.target.value;
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
            value={selected.props.overlayOpacity || 0.6}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayOpacity = parseFloat(e.target.value);
              });
            }}
          />
          <span className='w-10 text-center'>
            {(selected.props.overlayOpacity || 0.6) * 100}%
          </span>
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
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Posición de la tarjeta
        </label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={selected.props.cardPosition || 'right'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.cardPosition = e.target.value;
            });
          }}
        >
          <option value='left'>Izquierda</option>
          <option value='right'>Derecha</option>
        </select>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de fondo de la tarjeta
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.cardBackground || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.cardBackground = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.cardBackground || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.cardBackground = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto de la tarjeta
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.cardTextColor || '#333333'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.cardTextColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.cardTextColor || '#333333'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.cardTextColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

HeroWithCard.craft = {
  displayName: 'HeroWithCard',
  props: {
    title: 'GoAuto - Tu mejor opción',
    subtitle: 'Encuentra el vehículo perfecto para ti',
    cardTitle: 'Financiamiento disponible',
    cardDescription:
      'Ofrecemos las mejores opciones de financiamiento adaptadas a tus necesidades. Aprobación rápida y tasas competitivas.',
    buttonText: 'Solicitar ahora',
    buttonLink: '/financiamiento',
    backgroundImage:
      'https://images.unsplash.com/photo-1583267746897-2cf415887172?q=80&w=1470',
    overlayColor: '#000000',
    overlayOpacity: 0.6,
    textColor: '#ffffff',
    cardPosition: 'right',
    cardBackground: '#ffffff',
    cardTextColor: '#333333',
  },
  related: {
    toolbar: HeroWithCardSettings,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
  isCanvas: true,
};

export { HeroWithCardSettings };
