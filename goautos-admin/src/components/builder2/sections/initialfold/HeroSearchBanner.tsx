import React, { useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import {
  Search,
  Car,
  Calendar,
  DollarSign,
  CornerDownRight,
} from 'lucide-react';

interface SearchOptionProps {
  label: string;
  placeholder: string;
  icon: React.ReactNode;
}

const SearchOption = ({ label, placeholder, icon }: SearchOptionProps) => (
  <div className='relative flex-1 min-w-[200px]'>
    <label className='block text-xs font-medium mb-1 text-gray-600'>
      {label}
    </label>
    <div className='relative'>
      <div className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
        {icon}
      </div>
      <input
        type='text'
        placeholder={placeholder}
        className='w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all'
      />
    </div>
  </div>
);

interface HeroSearchBannerProps {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  accentColor?: string;
  buttonText?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  searchBarBackgroundColor?: string;
  searchBarTextColor?: string;
  searchOptionMake?: string;
  searchOptionModel?: string;
  searchOptionYear?: string;
  searchOptionPrice?: string;
}

export const HeroSearchBanner = ({
  title = 'Encuentra tu auto ideal',
  subtitle = 'Miles de vehículos disponibles en toda la región',
  backgroundImage = 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1472',
  overlayColor = '#000000',
  overlayOpacity = 0.6,
  textColor = '#ffffff',
  accentColor = '#3b82f6',
  buttonText = 'Buscar',
  buttonColor = '#3b82f6',
  buttonTextColor = '#ffffff',
  searchBarBackgroundColor = '#ffffff',
  searchBarTextColor = '#333333',
  searchOptionMake = 'Marca',
  searchOptionModel = 'Modelo',
  searchOptionYear = 'Año',
  searchOptionPrice = 'Precio',
}: HeroSearchBannerProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const overlayStyle = {
    backgroundColor: overlayColor,
    opacity: overlayOpacity,
  };

  const buttonStyle = {
    backgroundColor: buttonColor,
    color: buttonTextColor,
  };

  const searchBarStyle = {
    backgroundColor: searchBarBackgroundColor,
    color: searchBarTextColor,
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
        <div className='max-w-4xl mx-auto text-center mb-12'>
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

        {/* Search Bar */}
        <div
          className='max-w-5xl mx-auto rounded-xl shadow-xl overflow-hidden'
          style={{ border: selected ? '1px dashed #1e88e5' : 'none' }}
        >
          <div
            style={searchBarStyle}
            className='p-6 flex flex-col md:flex-row gap-4'
          >
            <SearchOption
              label={searchOptionMake}
              placeholder='Todas las marcas'
              icon={<Car size={18} />}
            />
            <SearchOption
              label={searchOptionModel}
              placeholder='Todos los modelos'
              icon={<CornerDownRight size={18} />}
            />
            <SearchOption
              label={searchOptionYear}
              placeholder='Todos los años'
              icon={<Calendar size={18} />}
            />
            <SearchOption
              label={searchOptionPrice}
              placeholder='Cualquier precio'
              icon={<DollarSign size={18} />}
            />
            <div className='flex items-end'>
              <button
                style={buttonStyle}
                className='w-full md:w-auto px-6 py-3 rounded-lg flex items-center justify-center font-medium transition-all hover:brightness-110'
              >
                <Search size={18} className='mr-2' />
                {buttonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HeroSearchBannerSettings = () => {
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

      <h3 className='font-medium mt-6'>Barra de búsqueda</h3>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color de fondo</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.searchBarBackgroundColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.searchBarBackgroundColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.searchBarBackgroundColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.searchBarBackgroundColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto campo marca
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.searchOptionMake || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.searchOptionMake = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto campo modelo
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.searchOptionModel || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.searchOptionModel = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto campo año
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.searchOptionYear || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.searchOptionYear = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Texto campo precio
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.searchOptionPrice || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.searchOptionPrice = e.target.value;
            });
          }}
        />
      </div>

      <h3 className='font-medium mt-6'>Botón</h3>
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
          Color del botón
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.buttonColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.buttonColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color del texto del botón
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.buttonTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonTextColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.buttonTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonTextColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
    </div>
  );
};

HeroSearchBanner.craft = {
  displayName: 'Hero con Buscador',
  props: {
    title: 'Encuentra tu auto ideal',
    subtitle: 'Miles de vehículos disponibles en toda la región',
    backgroundImage:
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1472',
    overlayColor: '#000000',
    overlayOpacity: 0.6,
    textColor: '#ffffff',
    accentColor: '#3b82f6',
    buttonText: 'Buscar',
    buttonColor: '#3b82f6',
    buttonTextColor: '#ffffff',
    searchBarBackgroundColor: '#ffffff',
    searchBarTextColor: '#333333',
    searchOptionMake: 'Marca',
    searchOptionModel: 'Modelo',
    searchOptionYear: 'Año',
    searchOptionPrice: 'Precio',
  },
  related: {
    toolbar: HeroSearchBannerSettings,
  },
};

export { HeroSearchBannerSettings };
