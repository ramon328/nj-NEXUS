import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface HeroCarSearchProps {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  searchButtonColor?: string;
  searchBoxBackground?: string;
  searchBoxTextColor?: string;
  showMakeModel?: boolean;
  showPrice?: boolean;
  showYear?: boolean;
  buttonText?: string;
}

export const HeroCarSearch = ({
  title = 'Encuentra tu auto ideal',
  subtitle = 'Busca entre miles de vehículos disponibles',
  backgroundImage = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1470',
  overlayColor = '#000000',
  overlayOpacity = 0.5,
  textColor = '#ffffff',
  searchButtonColor = '#3b82f6',
  searchBoxBackground = '#ffffff',
  searchBoxTextColor = '#333333',
  showMakeModel = true,
  showPrice = true,
  showYear = true,
  buttonText = 'Buscar',
}: HeroCarSearchProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
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
      className='w-full min-h-[500px] flex items-center'
    >
      {/* Overlay */}
      <div style={overlayStyle} className='absolute inset-0 z-0' />

      {/* Content */}
      <div className='container mx-auto px-4 z-10 relative py-12'>
        <div className='max-w-3xl mx-auto text-center mb-8'>
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

        {/* Search Box */}
        <div
          style={{
            backgroundColor: searchBoxBackground,
            color: searchBoxTextColor,
          }}
          className='rounded-lg shadow-lg p-4 md:p-6 max-w-4xl mx-auto'
        >
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {showMakeModel && (
              <div>
                <label className='text-sm font-medium mb-1 block'>
                  Marca y Modelo
                </label>
                <Input
                  type='text'
                  placeholder='Ej: Toyota Corolla'
                  className='w-full'
                />
              </div>
            )}

            {showYear && (
              <div>
                <label className='text-sm font-medium mb-1 block'>Año</label>
                <div className='grid grid-cols-2 gap-2'>
                  <Input type='number' placeholder='Desde' className='w-full' />
                  <Input type='number' placeholder='Hasta' className='w-full' />
                </div>
              </div>
            )}

            {showPrice && (
              <div>
                <label className='text-sm font-medium mb-1 block'>Precio</label>
                <div className='grid grid-cols-2 gap-2'>
                  <Input
                    type='number'
                    placeholder='Mínimo'
                    className='w-full'
                  />
                  <Input
                    type='number'
                    placeholder='Máximo'
                    className='w-full'
                  />
                </div>
              </div>
            )}
          </div>

          <div className='mt-6 text-center'>
            <Button
              style={{
                backgroundColor: searchButtonColor,
              }}
              className='px-6 py-2 text-white rounded-md hover:opacity-90 transition-opacity'
            >
              {buttonText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroCarSearchSettings = () => {
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
            value={selected.props.overlayOpacity || 0.5}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayOpacity = parseFloat(e.target.value);
              });
            }}
          />
          <span className='w-10 text-center'>
            {(selected.props.overlayOpacity || 0.5) * 100}%
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
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del botón de búsqueda
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.searchButtonColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.searchButtonColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.searchButtonColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.searchButtonColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de fondo del buscador
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.searchBoxBackground || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.searchBoxBackground = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.searchBoxBackground || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.searchBoxBackground = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto del buscador
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.searchBoxTextColor || '#333333'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.searchBoxTextColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.searchBoxTextColor || '#333333'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.searchBoxTextColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto del botón
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.buttonText || 'Buscar'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.buttonText = e.target.value;
            });
          }}
        />
      </div>
      <div className='space-y-2'>
        <div className='flex items-center'>
          <input
            type='checkbox'
            id='showMakeModel'
            checked={selected.props.showMakeModel}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.showMakeModel = e.target.checked;
              });
            }}
            className='mr-2'
          />
          <label htmlFor='showMakeModel' className='text-sm'>
            Mostrar campo de Marca y Modelo
          </label>
        </div>
        <div className='flex items-center'>
          <input
            type='checkbox'
            id='showYear'
            checked={selected.props.showYear}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.showYear = e.target.checked;
              });
            }}
            className='mr-2'
          />
          <label htmlFor='showYear' className='text-sm'>
            Mostrar campo de Año
          </label>
        </div>
        <div className='flex items-center'>
          <input
            type='checkbox'
            id='showPrice'
            checked={selected.props.showPrice}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.showPrice = e.target.checked;
              });
            }}
            className='mr-2'
          />
          <label htmlFor='showPrice' className='text-sm'>
            Mostrar campo de Precio
          </label>
        </div>
      </div>
    </div>
  );
};

HeroCarSearch.craft = {
  displayName: 'Hero con Buscador',
  props: {
    title: 'Encuentra tu auto ideal',
    subtitle: 'Busca entre miles de vehículos disponibles',
    backgroundImage:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1470',
    overlayColor: '#000000',
    overlayOpacity: 0.5,
    textColor: '#ffffff',
    searchButtonColor: '#3b82f6',
    searchBoxBackground: '#ffffff',
    searchBoxTextColor: '#333333',
    showMakeModel: true,
    showPrice: true,
    showYear: true,
    buttonText: 'Buscar',
  },
  related: {
    toolbar: HeroCarSearchSettings,
  },
};

export { HeroCarSearchSettings };
