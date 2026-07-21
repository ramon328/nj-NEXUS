import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Button } from '@/components/ui/button';

interface HeroWithImageProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  imageSrc?: string;
  bgColor?: string;
  textColor?: string;
  imagePosition?: 'left' | 'right';
}

// Settings component for the HeroWithImage
const HeroWithImageSettings = () => {
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
          rows={3}
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
          URL de la imagen
        </label>
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
      <div>
        <label className='text-sm font-medium mb-1 block'>Color de fondo</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.bgColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.bgColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.bgColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.bgColor = e.target.value;
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
            value={selected.props.textColor || '#333333'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.textColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.textColor || '#333333'}
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
          Posición de la imagen
        </label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={selected.props.imagePosition || 'right'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.imagePosition = e.target.value;
            });
          }}
        >
          <option value='left'>Izquierda</option>
          <option value='right'>Derecha</option>
        </select>
      </div>
    </div>
  );
};

export const HeroWithImage = ({
  title = 'Financiamiento a tu medida',
  subtitle = 'Obtén tu auto seminuevo con opciones de financiamiento accesibles y aprobación rápida',
  buttonText = 'Ver opciones',
  buttonLink = '/financiamiento',
  imageSrc = 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800',
  bgColor = '#ffffff',
  textColor = '#333333',
  imagePosition = 'right',
}: HeroWithImageProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  // Detectar si estamos en modo editor
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const isImageRight = imagePosition === 'right';

  return (
    <div
      ref={connectors.connect}
      style={{
        background: bgColor,
        color: textColor,
        padding: '40px 20px',
        position: 'relative',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full'
    >
      <div className='max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center'>
        {!isImageRight && (
          <div className='h-full'>
            <img
              src={imageSrc}
              alt='GoAuto'
              className='rounded-lg shadow-md w-full h-full object-cover'
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}

        <div className={`text-${isImageRight ? 'left' : 'right'}`}>
          <h1
            style={{ color: textColor }}
            className='text-3xl md:text-4xl font-bold mb-4'
          >
            {title}
          </h1>
          <p style={{ color: textColor }} className='text-base md:text-lg mb-6'>
            {subtitle}
          </p>
          <Button
            asChild
            className='px-6 py-2 text-white rounded-md bg-blue-600 hover:bg-blue-700 transition-colors'
          >
            <a href={isEnabled ? '#' : buttonLink}>{buttonText}</a>
          </Button>
        </div>

        {isImageRight && (
          <div className='h-full'>
            <img
              src={imageSrc}
              alt='GoAuto'
              className='rounded-lg shadow-md w-full h-full object-cover'
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

HeroWithImage.craft = {
  displayName: 'Hero con Imagen',
  props: {
    title: 'Financiamiento a tu medida',
    subtitle:
      'Obtén tu auto seminuevo con opciones de financiamiento accesibles y aprobación rápida',
    buttonText: 'Ver opciones',
    buttonLink: '/financiamiento',
    imageSrc:
      'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800',
    bgColor: '#ffffff',
    textColor: '#333333',
    imagePosition: 'right',
  },
  related: {
    toolbar: HeroWithImageSettings,
  },
};

export { HeroWithImageSettings };
