'use client';

import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { Button } from '@/components/ui/button';
import { Element } from '@craftjs/core';

interface HeroMinimalisticProps {
  title?: string;
  subtitle?: string;
  buttonText1?: string;
  buttonText2?: string;
  buttonLink1?: string;
  buttonLink2?: string;
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonPaddingX?: string;
  buttonPaddingY?: string;
  carImageUrl?: string;
  titleAlignment?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
}

export const HeroMinimalistic = ({
  title = 'Descubre Tu Próximo Vehículo',
  subtitle = 'Explora nuestra selección premium de autos y encuentra el que se adapta a tu estilo de vida',
  buttonText1 = 'Ver vehículos',
  buttonText2 = 'Contactar',
  buttonLink1 = '/vehicles',
  buttonLink2 = '/contact',
  bgColor = '#ffffff',
  textColor = '#333333',
  buttonBgColor = '#e05d31',
  buttonTextColor = '#ffffff',
  buttonPaddingX = '1.5rem',
  buttonPaddingY = '0.5rem',
  carImageUrl = 'https://images.unsplash.com/photo-1493238792000-8113da705763?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80',
  titleAlignment = 'left',
  children,
}: HeroMinimalisticProps) => {
  const {
    connectors: { connect, drag },
    selected,
    actions: { setProp },
    id,
  } = useNode((state) => ({
    selected: state.events.selected,
    dragged: state.events.dragged,
  }));

  // Detectar si estamos en modo editor
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const scrollToSection = (sectionId: string) => {
    if (isEnabled) {
      return; // No hacer nada en modo editor
    }

    // En el modo editor, simplemente registramos que se ha hecho clic
    if (sectionId.startsWith('#')) {
      const targetId = sectionId.substring(1); // Remover el # inicial

      // Buscar por ID
      const section = document.getElementById(targetId);

      // Si no encuentra por ID, buscar por clase o por atributo data-section
      const alternativeSection =
        section ||
        document.querySelector(`[data-section="${targetId}"]`) ||
        document.querySelector(`.section-${targetId}`);

      if (alternativeSection) {
        alternativeSection.scrollIntoView({ behavior: 'smooth' });
        console.log(`Scrolling to section: ${targetId}`);
        return;
      }

      // Si no hemos encontrado la sección, intentamos buscar componentes con nombres similares
      const possibleSections = document.querySelectorAll(
        '[class*="vehicle"], [id*="vehicle"], [data-section*="vehicle"]'
      );
      if (possibleSections.length > 0) {
        possibleSections[0].scrollIntoView({ behavior: 'smooth' });
        console.log(`Scrolling to vehicle section via fuzzy match`);
        return;
      }

      console.log(
        `Section ${targetId} not found. This is normal in editor mode.`
      );
    } else {
      // Es una URL externa, navegamos a ella
      window.open(sectionId, '_blank');
    }
  };

  return (
    <div
      ref={(ref) => connect(ref as HTMLDivElement)}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: selected ? '2px dashed #666666' : '1px solid transparent',
        position: 'relative',
        transform: 'translateZ(0)',
      }}
      className='w-full py-16 md:py-24 overflow-hidden'
    >
      {/* Botón de eliminar */}
      {selected && <DeleteButton nodeId={id} />}

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='grid md:grid-cols-2 gap-12 lg:gap-16 items-center'>
          {/* Left side - Text content */}
          <div style={{ textAlign: titleAlignment }}>
            {/* Accent bar */}
            <div
              className='rounded-full mb-6'
              style={{
                width: '4rem',
                height: '0.375rem',
                backgroundColor: buttonBgColor,
                marginLeft: titleAlignment === 'center' ? 'auto' : titleAlignment === 'right' ? 'auto' : '0',
                marginRight: titleAlignment === 'center' ? 'auto' : '0',
              }}
            />

            <EditableText tag="h1" value={title} nodeId={id} propName="title"
              className='text-5xl md:text-6xl font-black mb-6'
              style={{
                color: textColor,
                letterSpacing: '-0.025em',
                lineHeight: '1.1',
              }}
            />

            <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle"
              className='text-lg md:text-xl mb-10 max-w-lg'
              style={{
                color: textColor,
                opacity: 0.8,
                lineHeight: '1.7',
                marginLeft: titleAlignment === 'center' ? 'auto' : titleAlignment === 'right' ? 'auto' : '0',
                marginRight: titleAlignment === 'center' ? 'auto' : titleAlignment === 'left' ? 'auto' : '0',
              }}
            />

            <div
              className='flex flex-wrap gap-4'
              style={{
                justifyContent: titleAlignment === 'center' ? 'center' : titleAlignment === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <Button
                className='rounded-full font-semibold text-base transition-all duration-300 hover:scale-105 hover:shadow-lg'
                style={{
                  backgroundColor: buttonBgColor,
                  color: buttonTextColor,
                  paddingLeft: buttonPaddingX,
                  paddingRight: buttonPaddingX,
                  paddingTop: buttonPaddingY,
                  paddingBottom: buttonPaddingY,
                  boxShadow: `0 4px 14px 0 ${buttonBgColor}66`,
                }}
                onClick={() => scrollToSection(buttonLink1)}
              >
                <EditableText tag="span" value={buttonText1} nodeId={id} propName="buttonText1" />
              </Button>
              <Button
                className='rounded-full font-semibold text-base border-2 bg-transparent transition-all duration-300 hover:scale-105'
                variant='outline'
                style={{
                  borderColor: buttonBgColor,
                  color: buttonBgColor,
                  paddingLeft: buttonPaddingX,
                  paddingRight: buttonPaddingX,
                  paddingTop: buttonPaddingY,
                  paddingBottom: buttonPaddingY,
                  backgroundColor: 'transparent',
                }}
                onClick={() => scrollToSection(buttonLink2)}
              >
                <EditableText tag="span" value={buttonText2} nodeId={id} propName="buttonText2" />
              </Button>
            </div>
          </div>

          {/* Right side - Image with visual treatment */}
          <div className='flex justify-center md:justify-end'>
            {carImageUrl && (
              <div className='relative' style={{ perspective: '1000px' }}>
                {/* Decorative gradient orb behind image */}
                <div
                  className='absolute -top-8 -right-8 w-72 h-72 rounded-full opacity-30 blur-3xl'
                  style={{ backgroundColor: buttonBgColor }}
                />
                {/* Secondary decorative orb */}
                <div
                  className='absolute -bottom-6 -left-6 w-48 h-48 rounded-full opacity-20 blur-2xl'
                  style={{ backgroundColor: buttonBgColor }}
                />

                {/* Dots pattern */}
                <div
                  className='absolute -top-4 -left-4 w-24 h-24 opacity-20'
                  style={{
                    backgroundImage: `radial-gradient(${buttonBgColor} 1.5px, transparent 1.5px)`,
                    backgroundSize: '10px 10px',
                  }}
                />

                {/* Image card */}
                <div
                  className='relative rounded-2xl overflow-hidden transition-transform duration-500 hover:scale-[1.02]'
                  style={{
                    boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)`,
                    borderBottom: `4px solid ${buttonBgColor}`,
                    transform: 'rotate(-1deg)',
                  }}
                >
                  <img
                    src={carImageUrl}
                    alt='Auto destacado'
                    className='w-full object-cover'
                    style={{
                      aspectRatio: '4 / 3',
                      maxHeight: '450px',
                      display: 'block',
                    }}
                  />
                  {/* Subtle gradient overlay on image */}
                  <div
                    className='absolute inset-0 pointer-events-none'
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,0,0,0.03) 0%, transparent 50%, rgba(0,0,0,0.08) 100%)',
                    }}
                  />
                </div>

                {/* Small accent frame corner */}
                <div
                  className='absolute -bottom-3 -right-3 w-20 h-20 rounded-br-2xl border-b-2 border-r-2 opacity-40'
                  style={{ borderColor: buttonBgColor }}
                />
              </div>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

// Settings component for the editor
export const HeroMinimalisticSettings = () => {
  const {
    actions: { setProp },
    title,
    subtitle,
    buttonText1,
    buttonText2,
    buttonLink1,
    buttonLink2,
    bgColor,
    textColor,
    buttonBgColor,
    buttonTextColor,
    buttonPaddingX,
    buttonPaddingY,
    carImageUrl,
    titleAlignment,
  } = useNode((node) => ({
    title: node.data.props.title,
    subtitle: node.data.props.subtitle,
    buttonText1: node.data.props.buttonText1,
    buttonText2: node.data.props.buttonText2,
    buttonLink1: node.data.props.buttonLink1,
    buttonLink2: node.data.props.buttonLink2,
    bgColor: node.data.props.bgColor,
    textColor: node.data.props.textColor,
    buttonBgColor: node.data.props.buttonBgColor,
    buttonTextColor: node.data.props.buttonTextColor,
    buttonPaddingX: node.data.props.buttonPaddingX,
    buttonPaddingY: node.data.props.buttonPaddingY,
    carImageUrl: node.data.props.carImageUrl,
    titleAlignment: node.data.props.titleAlignment,
  }));

  return (
    <div className='space-y-4'>
      <div>
        <label className='text-sm font-medium mb-1 block'>Título</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={title}
          onChange={(e) =>
            setProp((props: any) => (props.title = e.target.value))
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Subtítulo</label>
        <textarea
          className='w-full p-2 border rounded text-sm'
          rows={3}
          value={subtitle}
          onChange={(e) =>
            setProp((props: any) => (props.subtitle = e.target.value))
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Alineación del texto
        </label>
        <select
          className='w-full p-2 border rounded text-sm'
          value={titleAlignment}
          onChange={(e) =>
            setProp((props: any) => (props.titleAlignment = e.target.value))
          }
        >
          <option value='left'>Izquierda</option>
          <option value='center'>Centro</option>
          <option value='right'>Derecha</option>
        </select>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Texto Botón 1</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonText1}
          onChange={(e) =>
            setProp((props: any) => (props.buttonText1 = e.target.value))
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Enlace Botón 1</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonLink1}
          onChange={(e) =>
            setProp((props: any) => (props.buttonLink1 = e.target.value))
          }
        />
        <p className='text-xs text-gray-500 mt-1'>
          Usa '#id' para enlazar a una sección en la página
        </p>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Texto Botón 2</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonText2}
          onChange={(e) =>
            setProp((props: any) => (props.buttonText2 = e.target.value))
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Enlace Botón 2</label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonLink2}
          onChange={(e) =>
            setProp((props: any) => (props.buttonLink2 = e.target.value))
          }
        />
        <p className='text-xs text-gray-500 mt-1'>
          Usa '#id' para enlazar a una sección en la página
        </p>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          URL Imagen del Auto
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={carImageUrl}
          onChange={(e) =>
            setProp((props: any) => (props.carImageUrl = e.target.value))
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>Color de fondo</label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={bgColor}
            onChange={(e) =>
              setProp((props: any) => (props.bgColor = e.target.value))
            }
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={bgColor}
            onChange={(e) =>
              setProp((props: any) => (props.bgColor = e.target.value))
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
            value={textColor}
            onChange={(e) =>
              setProp((props: any) => (props.textColor = e.target.value))
            }
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={textColor}
            onChange={(e) =>
              setProp((props: any) => (props.textColor = e.target.value))
            }
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de fondo del botón
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={buttonBgColor}
            onChange={(e) =>
              setProp((props: any) => (props.buttonBgColor = e.target.value))
            }
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={buttonBgColor}
            onChange={(e) =>
              setProp((props: any) => (props.buttonBgColor = e.target.value))
            }
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de texto del botón
        </label>
        <div className='flex items-center'>
          <input
            type='color'
            className='w-10 h-10 p-1 border rounded'
            value={buttonTextColor}
            onChange={(e) =>
              setProp((props: any) => (props.buttonTextColor = e.target.value))
            }
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={buttonTextColor}
            onChange={(e) =>
              setProp((props: any) => (props.buttonTextColor = e.target.value))
            }
          />
        </div>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Padding horizontal del botón
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonPaddingX}
          onChange={(e) =>
            setProp((props: any) => (props.buttonPaddingX = e.target.value))
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Padding vertical del botón
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonPaddingY}
          onChange={(e) =>
            setProp((props: any) => (props.buttonPaddingY = e.target.value))
          }
        />
      </div>
    </div>
  );
};

HeroMinimalistic.craft = {
  displayName: 'HeroMinimalistic',
  props: {
    title: 'Descubre Tu Próximo Vehículo',
    subtitle:
      'Explora nuestra selección premium de autos y encuentra el que se adapta a tu estilo de vida',
    buttonText1: 'Ver vehículos',
    buttonText2: 'Contactar',
    buttonLink1: '/vehicles',
    buttonLink2: '/contact',
    bgColor: '#ffffff',
    textColor: '#333333',
    buttonBgColor: '#e05d31',
    buttonTextColor: '#ffffff',
    buttonPaddingX: '1.5rem',
    buttonPaddingY: '0.5rem',
    carImageUrl:
      'https://images.unsplash.com/photo-1493238792000-8113da705763?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1000&q=80',
    titleAlignment: 'left',
  },
  related: {
    settings: HeroMinimalisticSettings,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
  isCanvas: true,
};
