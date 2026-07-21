import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText } from '../../EditableText';
import { Button } from '@/components/ui/button';

interface HeroWithBackgroundProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonTextSecondary?: string;
  buttonLinkSecondary?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonSecondaryBgColor?: string;
  buttonSecondaryTextColor?: string;
  backgroundImage?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  textAlignment?: 'left' | 'center' | 'right';
  height?: string;
  children?: React.ReactNode;
}

export const HeroWithBackground = ({
  title = 'Encuentra tu próximo auto',
  subtitle = 'Amplio inventario de autos seminuevos verificados y con garantía',
  buttonText = 'Ver vehículos',
  buttonLink = '/vehicles',
  buttonTextSecondary = 'Contactar',
  buttonLinkSecondary = '/contact',
  buttonBgColor = '#3b82f6',
  buttonTextColor = '#ffffff',
  buttonSecondaryBgColor = 'transparent',
  buttonSecondaryTextColor = '#ffffff',
  backgroundImage = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470',
  overlayColor = '#000000',
  overlayOpacity = 0.5,
  textColor = '#ffffff',
  textAlignment = 'center',
  height = '500px',
  children,
}: HeroWithBackgroundProps) => {
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

  // Function to scroll to vehicles section - solo se ejecuta fuera del editor
  const scrollToVehicles = (e: React.MouseEvent) => {
    if (isEnabled) {
      e.preventDefault();
      return; // No hacer nada en modo editor
    }

    e.preventDefault();
    console.log(
      'Attempting to scroll to vehicles section from HeroWithBackground'
    );

    // Try multiple selector approaches
    const vehicleSection =
      document.querySelector('[data-section="vehicles"]') ||
      document.getElementById('vehicles-section') ||
      document.querySelector('.VehicleGrid') ||
      document.querySelector('.vehicles-section') ||
      document.querySelector('[class*="vehicle"]');

    if (vehicleSection) {
      console.log('Found vehicle section, scrolling now');

      // Try multiple scroll methods
      try {
        // Method 1: scrollIntoView
        vehicleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // Method 2: If the above doesn't work consistently in the builder
        setTimeout(() => {
          const yOffset =
            vehicleSection.getBoundingClientRect().top +
            window.pageYOffset -
            50;
          window.scrollTo({
            top: yOffset,
            behavior: 'smooth',
          });
        }, 100);
      } catch (error) {
        console.error('Error scrolling:', error);

        // Fallback method 3: direct position scroll
        const yOffset =
          vehicleSection.getBoundingClientRect().top + window.pageYOffset - 50;
        window.scrollTo(0, yOffset);
      }
    } else {
      console.log('Vehicle section not found, trying alternative methods');

      // Fallback: try to find any vehicle-related sections by text content
      const headings = Array.from(
        document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      );
      const vehicleHeading = headings.find(
        (h) =>
          h.textContent?.toLowerCase().includes('vehículo') ||
          h.textContent?.toLowerCase().includes('vehiculo') ||
          h.textContent?.toLowerCase().includes('auto') ||
          h.textContent?.toLowerCase().includes('inventario')
      );

      if (vehicleHeading) {
        console.log('Found vehicle heading, scrolling to it');
        vehicleHeading.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        console.log('No vehicle section found at all');
        // If all else fails and we have a buttonLink, navigate to it
        if (buttonLink) {
          window.location.href = buttonLink;
        }
      }
    }
  };

  // Función para manejar el clic del botón secundario
  const handleSecondaryButtonClick = (e: React.MouseEvent) => {
    if (isEnabled) {
      e.preventDefault();
      return; // No hacer nada en modo editor
    }
    // En modo normal, permitir la navegación
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height,
        position: 'relative',
        color: textColor,
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full flex items-center'
    >
      {/* Overlay */}
      <div style={overlayStyle} className='absolute inset-0 z-0' />

      {/* Content */}
      <div className='container mx-auto px-4 z-10 relative'>
        <div
          className={`max-w-3xl mx-auto text-${textAlignment}`}
          style={{ margin: textAlignment === 'center' ? '0 auto' : '0' }}
        >
          <EditableText tag="h1" value={title} nodeId={id} propName="title" style={{ color: textColor }} className='text-4xl md:text-5xl font-bold mb-4' />
          <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle" style={{ color: textColor }} className='text-lg md:text-xl mb-8' />
          <div className='flex flex-wrap gap-4 justify-center'>
            <Button
              className='px-8 py-3 rounded-md transition-colors'
              style={{
                backgroundColor: buttonBgColor,
                color: buttonTextColor,
              }}
              onClick={scrollToVehicles}
            >
              <EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" />
            </Button>
            <Button
              asChild
              variant='outline'
              className='px-8 py-3 rounded-md border-2 transition-colors'
              style={{
                backgroundColor: buttonSecondaryBgColor,
                color: buttonSecondaryTextColor,
                borderColor: buttonSecondaryTextColor,
              }}
            >
              <a
                href={isEnabled ? '#' : buttonLinkSecondary}
                onClick={handleSecondaryButtonClick}
              >
                <EditableText tag="span" value={buttonTextSecondary} nodeId={id} propName="buttonTextSecondary" />
              </a>
            </Button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

const HeroWithBackgroundSettings = () => {
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

      {/* Primer botón */}
      <div className='pt-2 border-t'>
        <label className='text-sm font-medium mb-1 block'>
          Texto del botón principal
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
          Enlace del botón principal
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
          Color de fondo del botón principal
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.buttonBgColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonBgColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.buttonBgColor || '#3b82f6'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonBgColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de texto del botón principal
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

      {/* Segundo botón */}
      <div className='pt-2 border-t'>
        <label className='text-sm font-medium mb-1 block'>
          Texto del botón secundario
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.buttonTextSecondary || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.buttonTextSecondary = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Enlace del botón secundario
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.buttonLinkSecondary || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.buttonLinkSecondary = e.target.value;
            });
          }}
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de fondo del botón secundario
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.buttonSecondaryBgColor || 'transparent'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonSecondaryBgColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.buttonSecondaryBgColor || 'transparent'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonSecondaryBgColor = e.target.value;
              });
            }}
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de texto del botón secundario
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={selected.props.buttonSecondaryTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonSecondaryTextColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={selected.props.buttonSecondaryTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonSecondaryTextColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      {/* Fondo y otros ajustes */}
      <div className='pt-2 border-t'>
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
          Alineación del texto
        </label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={selected.props.textAlignment || 'center'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.textAlignment = e.target.value;
            });
          }}
        >
          <option value='left'>Izquierda</option>
          <option value='center'>Centro</option>
          <option value='right'>Derecha</option>
        </select>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Altura</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={selected.props.height || '500px'}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.height = e.target.value;
            });
          }}
        />
      </div>
    </div>
  );
};

HeroWithBackground.craft = {
  displayName: 'HeroWithBackground',
  props: {
    title: 'Encuentra tu próximo auto',
    subtitle:
      'Amplio inventario de autos seminuevos verificados y con garantía',
    buttonText: 'Ver vehículos',
    buttonLink: '/vehicles',
    buttonTextSecondary: 'Contactar',
    buttonLinkSecondary: '/contact',
    buttonBgColor: '#3b82f6',
    buttonTextColor: '#ffffff',
    buttonSecondaryBgColor: 'transparent',
    buttonSecondaryTextColor: '#ffffff',
    backgroundImage:
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470',
    overlayColor: '#000000',
    overlayOpacity: 0.5,
    textColor: '#ffffff',
    textAlignment: 'center',
    height: '500px',
  },
  related: {
    settings: HeroWithBackgroundSettings,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
  isCanvas: true,
};

export { HeroWithBackgroundSettings };
