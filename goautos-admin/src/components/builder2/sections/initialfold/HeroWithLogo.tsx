import React, { useState, useEffect } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Button } from '@/components/ui/button';
import { ImageIcon } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { optimizeAndUploadBuilderImage } from '@/utils/builderImageUpload';

interface HeroWithLogoProps {
  backgroundImage?: string;
  backgroundImage2?: string;
  backgroundImage3?: string;
  backgroundImage4?: string;
  logoUrl?: string;
  logoText?: string;
  logoScale?: number;
  buttonText?: string;
  buttonLink?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonBorderColor?: string;
  buttonBorderWidth?: number;
  buttonBorderRadius?: number;
  buttonIsCircular?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  height?: string;
  children?: React.ReactNode;
}

export const HeroWithLogo = ({
  backgroundImage = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470',
  backgroundImage2 = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1470',
  backgroundImage3 = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1470',
  backgroundImage4 = 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1470',
  logoUrl = '',
  logoText = 'Automotora',
  logoScale = 1,
  buttonText = 'Ver Stock Completo',
  buttonLink = '/vehicles',
  buttonBgColor = '#e05d31',
  buttonTextColor = '#ffffff',
  buttonBorderColor = '#000000',
  buttonBorderWidth = 0,
  buttonBorderRadius = 8,
  buttonIsCircular = 'false',
  overlayColor = '#000000',
  overlayOpacity = 0.3,
  height = '600px',
  children,
}: HeroWithLogoProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
    id: state.id,
  }));

  // Detectar si estamos en modo editor
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  // Estado para el carrusel de imágenes
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Array de imágenes
  const images = [
    backgroundImage,
    backgroundImage2,
    backgroundImage3,
    backgroundImage4,
  ].filter(Boolean);

  // Efecto para el carrusel y zoom
  useEffect(() => {
    if (images.length <= 1) return; // No animar si solo hay una imagen

    let startTime: number;
    let animationFrameId: number;

    const animateZoom = (timestamp: number) => {
      if (!startTime) startTime = timestamp;

      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / 4500, 1); // 4.5 segundos = 4500ms

      // Zoom muy lento de 1.0 a 1.15 en 4.5 segundos
      const currentZoom = 1 + progress * 0.15; // Zoom máximo de 1.15x
      setZoomLevel(currentZoom);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateZoom);
      }
    };

    const startAnimation = () => {
      // Resetear zoom al inicio
      setZoomLevel(1);
      startTime = undefined;
      animationFrameId = requestAnimationFrame(animateZoom);
    };

    // Iniciar la primera animación
    startAnimation();

    // Cambiar imagen cada 4.5 segundos
    const interval = setInterval(() => {
      // Iniciar transición
      setIsTransitioning(true);

      setTimeout(() => {
        // Cambiar imagen después del fade out
        setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);

        // Finalizar transición y reiniciar animación
        setTimeout(() => {
          setIsTransitioning(false);
          startAnimation(); // Reiniciar el zoom
        }, 100);
      }, 300); // Fade out más rápido
    }, 4500); // Cambiar cada 4.5 segundos

    return () => {
      clearInterval(interval);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [images.length]);

  const overlayStyle = {
    backgroundColor: overlayColor,
    opacity: overlayOpacity,
  };

  // Function to handle button navigation - solo se ejecuta fuera del editor
  const handleButtonClick = () => {
    if (isEnabled) return; // No hacer nada en modo editor

    if (!buttonLink) return;

    // Detectar hash links (navegación interna)
    if (buttonLink.startsWith('#')) {
      const element = document.querySelector(buttonLink);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Detectar rutas internas
    if (buttonLink.startsWith('/')) {
      window.location.href = buttonLink;
      return;
    }

    // Detectar URLs externas (http/https)
    if (buttonLink.startsWith('http://') || buttonLink.startsWith('https://')) {
      window.open(buttonLink, '_blank');
      return;
    }

    // Detectar redes sociales
    const socialRegex =
      /^(www\.|wa\.me|instagram\.com|facebook\.com|twitter\.com|x\.com|linkedin\.com|youtube\.com|tiktok\.com)/i;
    if (socialRegex.test(buttonLink)) {
      const fullUrl = buttonLink.startsWith('www.')
        ? `https://${buttonLink}`
        : `https://${buttonLink}`;
      window.open(fullUrl, '_blank');
      return;
    }

    // Si no es ninguno de los anteriores, tratar como URL externa
    window.open(buttonLink, '_blank');
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        height,
        position: 'relative',
        overflow: 'hidden',
        border: selected ? '2px dashed #1e88e5' : '2px solid transparent',
      }}
      className='w-full flex items-center justify-center'
    >
      {/* Botón de eliminar */}
      {selected && <DeleteButton nodeId={id} />}
      {/* Background Image Container with Zoom Effect */}
      <div
        style={{
          backgroundImage: `url(${
            images[currentImageIndex] || backgroundImage
          })`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: `scale(${zoomLevel})`,
          transition: 'transform 0.1s ease-out, opacity 0.5s ease-in-out',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          opacity: isTransitioning ? 0.3 : 1,
        }}
      />

      {/* Overlay */}
      <div style={overlayStyle} className='absolute inset-0 z-0' />

      {/* Content */}
      <div className='container mx-auto px-4 z-10 relative flex flex-col items-center justify-center h-full'>
        <div className='text-center'>
          {/* Logo */}
          <div className='mb-8'>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoText}
                className='mx-auto max-h-32 max-w-full object-contain'
                style={{
                  transform: `scale(${logoScale})`,
                  transition: 'transform 0.3s ease-in-out',
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
                }}
              />
            ) : (
              <EditableText tag="h1" value={logoText} nodeId={id} propName="logoText"
                className='text-6xl md:text-7xl font-bold text-white mb-2'
                style={{
                  transform: `scale(${logoScale})`,
                  transition: 'transform 0.3s ease-in-out',
                }}
              />
            )}
          </div>

          {/* Botón */}
          <div className='flex justify-center'>
            <Button
              className={`px-8 py-3 transition-colors text-lg font-medium ${
                buttonIsCircular === 'true' ? 'rounded-full' : ''
              }`}
              style={{
                backgroundColor: buttonBgColor,
                color: buttonTextColor,
                borderColor: buttonBorderColor,
                borderWidth: `${buttonBorderWidth}px`,
                borderStyle: buttonBorderWidth > 0 ? 'solid' : 'none',
                borderRadius:
                  buttonIsCircular === 'true'
                    ? '50%'
                    : `${buttonBorderRadius}px`,
              }}
              onClick={handleButtonClick}
            >
              <EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" />
            </Button>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

const HeroWithLogoSettings = () => {
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

  // Función para manejar la selección de archivos.
  // Optimiza (redimensiona + WebP) y sube a Storage, guardando solo la URL.
  // Antes guardaba el archivo en base64 dentro del prop, lo que inflaba la
  // config del cliente a decenas de MB y ralentizaba el sitio público.
  const handleFileSelect = (propertyName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const url = await optimizeAndUploadBuilderImage(file);
        actions.setProp(selected.id, (props: any) => {
          props[propertyName] = url;
        });
      } catch (err) {
        console.error('Error al subir la imagen de fondo:', err);
      }
    };
    input.click();
  };

  if (!selected) return null;

  return (
    <div className='space-y-4'>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Imagen de fondo 1
        </label>
        <div className='flex gap-2'>
          <input
            type='url'
            className='flex-1 p-2 border rounded text-sm'
            placeholder='URL de la imagen de fondo'
            value={selected.props.backgroundImage || ''}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.backgroundImage = e.target.value;
              });
            }}
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleFileSelect('backgroundImage')}
            className='flex items-center gap-2'
          >
            <ImageIcon className='h-4 w-4' />
            Seleccionar archivo
          </Button>
        </div>
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Imagen de fondo 2
        </label>
        <div className='flex gap-2'>
          <input
            type='url'
            className='flex-1 p-2 border rounded text-sm'
            placeholder='URL de la imagen de fondo'
            value={selected.props.backgroundImage2 || ''}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.backgroundImage2 = e.target.value;
              });
            }}
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleFileSelect('backgroundImage2')}
            className='flex items-center gap-2'
          >
            <ImageIcon className='h-4 w-4' />
            Seleccionar archivo
          </Button>
        </div>
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Imagen de fondo 3
        </label>
        <div className='flex gap-2'>
          <input
            type='url'
            className='flex-1 p-2 border rounded text-sm'
            placeholder='URL de la imagen de fondo'
            value={selected.props.backgroundImage3 || ''}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.backgroundImage3 = e.target.value;
              });
            }}
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleFileSelect('backgroundImage3')}
            className='flex items-center gap-2'
          >
            <ImageIcon className='h-4 w-4' />
            Seleccionar archivo
          </Button>
        </div>
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Imagen de fondo 4
        </label>
        <div className='flex gap-2'>
          <input
            type='url'
            className='flex-1 p-2 border rounded text-sm'
            placeholder='URL de la imagen de fondo'
            value={selected.props.backgroundImage4 || ''}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.backgroundImage4 = e.target.value;
              });
            }}
          />
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => handleFileSelect('backgroundImage4')}
            className='flex items-center gap-2'
          >
            <ImageIcon className='h-4 w-4' />
            Seleccionar archivo
          </Button>
        </div>
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>Logo (URL)</label>
        <input
          type='url'
          className='w-full p-2 border rounded text-sm'
          placeholder='URL del logo (opcional)'
          value={selected.props.logoUrl || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.logoUrl = e.target.value;
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>Texto del logo</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          placeholder='Texto del logo'
          value={selected.props.logoText || ''}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.logoText = e.target.value;
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>
          Tamaño del logo ({Math.round((selected.props.logoScale || 1) * 100)}%)
        </label>
        <input
          type='range'
          min='0.5'
          max='2'
          step='0.1'
          className='w-full'
          value={selected.props.logoScale || 1}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.logoScale = parseFloat(e.target.value);
            });
          }}
        />
        <div className='flex justify-between text-xs text-gray-500 mt-1'>
          <span>50%</span>
          <span>100%</span>
          <span>200%</span>
        </div>
      </div>

      <div className='pt-2 border-t'>
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
        <label className='text-sm font-medium mb-1 block'>Link del botón</label>
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

      <div className='pt-2 border-t'>
        <label className='text-sm font-medium mb-1 block'>
          Color del botón
        </label>
        <div className='flex gap-2'>
          <input
            type='color'
            className='w-12 h-8 border rounded'
            value={selected.props.buttonBgColor || '#1e3a8a'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonBgColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm'
            value={selected.props.buttonBgColor || '#1e3a8a'}
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
          Color del texto del botón
        </label>
        <div className='flex gap-2'>
          <input
            type='color'
            className='w-12 h-8 border rounded'
            value={selected.props.buttonTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonTextColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm'
            value={selected.props.buttonTextColor || '#ffffff'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.buttonTextColor = e.target.value;
              });
            }}
          />
        </div>
      </div>

      <div className='pt-2 border-t'>
        <label className='text-sm font-medium mb-1 block'>
          Color del overlay
        </label>
        <div className='flex gap-2'>
          <input
            type='color'
            className='w-12 h-8 border rounded'
            value={selected.props.overlayColor || '#000000'}
            onChange={(e) => {
              actions.setProp(selected.id, (props: any) => {
                props.overlayColor = e.target.value;
              });
            }}
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm'
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
          Opacidad del overlay (
          {Math.round((selected.props.overlayOpacity || 0.3) * 100)}%)
        </label>
        <input
          type='range'
          min='0'
          max='1'
          step='0.1'
          className='w-full'
          value={selected.props.overlayOpacity || 0.3}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.overlayOpacity = parseFloat(e.target.value);
            });
          }}
        />
      </div>

      <div>
        <label className='text-sm font-medium mb-1 block'>Altura (px)</label>
        <input
          type='number'
          className='w-full p-2 border rounded text-sm'
          value={parseInt(selected.props.height?.replace('px', '') || '600')}
          onChange={(e) => {
            actions.setProp(selected.id, (props: any) => {
              props.height = `${e.target.value}px`;
            });
          }}
        />
      </div>
    </div>
  );
};

HeroWithLogo.craft = {
  displayName: 'HeroWithLogo',
  props: {
    backgroundImage:
      'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1470',
    backgroundImage2:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1470',
    backgroundImage3:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1470',
    backgroundImage4:
      'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1470',
    logoUrl: '',
    logoText: 'Automotora',
    logoScale: 1,
    buttonText: 'Ver Stock Completo',
    buttonLink: '/vehicles',
    buttonBgColor: '#e05d31',
    buttonTextColor: '#ffffff',
    buttonBorderColor: '#000000',
    buttonBorderWidth: 0,
    buttonBorderRadius: 8,
    buttonIsCircular: 'false',
    overlayColor: '#000000',
    overlayOpacity: 0.3,
    height: '600px',
  },
  related: {
    settings: HeroWithLogoSettings,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
};

export { HeroWithLogoSettings };
