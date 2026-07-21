import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import { Button } from '@/components/ui/button';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface HeroBasicProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonTextSecondary?: string;
  buttonLinkSecondary?: string;
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  buttonSecondaryBgColor?: string;
  buttonSecondaryTextColor?: string;
  alignment?: 'left' | 'center' | 'right';
  children?: React.ReactNode;
}

// Remove the internal settings component as we now have an external one
export const HeroBasic = ({
  title = 'Encuentra el auto ideal para ti',
  subtitle = 'Amplio catálogo de vehículos seminuevos certificados con garantía y financiamiento a tu medida',
  buttonText = 'Ver vehículos',
  buttonLink = '/vehicles',
  buttonTextSecondary = 'Contactar',
  buttonLinkSecondary = '/contact',
  bgColor = '#ffffff',
  textColor = '#333333',
  buttonBgColor = '#3b82f6',
  buttonTextColor = '#ffffff',
  buttonSecondaryBgColor = 'transparent',
  buttonSecondaryTextColor,
  alignment = 'center',
  children,
}: HeroBasicProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { client } = useAuth();
  // Obtener valores por defecto del cliente dinámicamente
  const clientDefaults = getPersonalizedDefaults(client);
  const finalButtonSecondaryTextColor =
    buttonSecondaryTextColor || clientDefaults.primaryColor;

  // Detectar si estamos en modo editor
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const textAlignClass = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end',
  }[alignment];

  const justifyClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[alignment];

  // Scroll to target section or navigate
  const scrollToVehicles = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isEnabled) return;

    const target =
      document.querySelector('[data-section="vehicles"]') ||
      document.getElementById('vehicles-section') ||
      document.querySelector('[class*="vehicle"]');

    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (buttonLink) {
      window.location.href = buttonLink;
    }
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        background: bgColor,
        color: textColor,
        position: 'relative',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
      className='w-full overflow-hidden'
    >
      {selected && <DeleteButton nodeId={id} />}
      {/* Decorative gradient orbs */}
      <div
        className='absolute inset-0 pointer-events-none'
        aria-hidden='true'
      >
        {/* Top-right orb */}
        <div
          className='absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl'
          style={{
            background: `radial-gradient(circle, ${buttonBgColor}15 0%, transparent 70%)`,
          }}
        />
        {/* Bottom-left orb */}
        <div
          className='absolute -bottom-32 -left-32 w-[30rem] h-[30rem] rounded-full blur-3xl'
          style={{
            background: `radial-gradient(circle, ${buttonBgColor}10 0%, transparent 70%)`,
          }}
        />
        {/* Center subtle mesh */}
        <div
          className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] rounded-full blur-3xl opacity-50'
          style={{
            background: `radial-gradient(ellipse at 30% 50%, ${buttonBgColor}08 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, ${buttonBgColor}06 0%, transparent 50%)`,
          }}
        />
      </div>

      {/* Bottom gradient fade border */}
      <div
        className='absolute bottom-0 left-0 right-0 h-px pointer-events-none'
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${buttonBgColor}30 50%, transparent 100%)`,
        }}
      />

      {/* Content */}
      <div className={`relative z-10 max-w-5xl mx-auto px-6 py-20 md:py-28 flex flex-col ${textAlignClass}`}>
        {/* Badge */}
        <div
          className='inline-flex mb-6 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide uppercase'
          style={{
            backgroundColor: `${buttonBgColor}12`,
            color: buttonBgColor,
            border: `1px solid ${buttonBgColor}20`,
          }}
        >
          Tu próximo auto te espera
        </div>

        {/* Title */}
        <EditableText tag="h1" value={title} nodeId={id} propName="title" style={{ color: textColor }} className='text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6' />

        {/* Subtitle */}
        <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle" style={{ color: textColor, opacity: 0.7 }} className='text-lg md:text-xl leading-relaxed max-w-2xl mb-10' />

        {/* Buttons */}
        <div className={`flex flex-wrap gap-4 ${justifyClass}`}>
          <Button
            className='px-8 py-4 text-base rounded-full transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] shadow-lg hover:shadow-xl'
            style={{
              backgroundColor: buttonBgColor,
              color: buttonTextColor,
              boxShadow: `0 4px 14px 0 ${buttonBgColor}40`,
            }}
            onClick={scrollToVehicles}
          >
            <EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" />
          </Button>
          <Button
            asChild
            variant='outline'
            className='px-8 py-4 text-base rounded-full border-2 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]'
            style={{
              backgroundColor: buttonSecondaryBgColor,
              color: finalButtonSecondaryTextColor,
              borderColor: `${finalButtonSecondaryTextColor}40`,
            }}
          >
            <a href={isEnabled ? '#' : buttonLinkSecondary}>
              <EditableText tag="span" value={buttonTextSecondary} nodeId={id} propName="buttonTextSecondary" />
            </a>
          </Button>
        </div>

        {children}
      </div>
    </div>
  );
};

// Settings component for the editor
export const HeroBasicSettings = () => {
  const {
    actions: { setProp },
    title,
    subtitle,
    buttonText,
    buttonLink,
    buttonTextSecondary,
    buttonLinkSecondary,
    bgColor,
    textColor,
    buttonBgColor,
    buttonTextColor,
    buttonSecondaryBgColor,
    buttonSecondaryTextColor,
    alignment,
  } = useNode((node) => ({
    title: node.data.props.title,
    subtitle: node.data.props.subtitle,
    buttonText: node.data.props.buttonText,
    buttonLink: node.data.props.buttonLink,
    buttonTextSecondary: node.data.props.buttonTextSecondary,
    buttonLinkSecondary: node.data.props.buttonLinkSecondary,
    bgColor: node.data.props.bgColor,
    textColor: node.data.props.textColor,
    buttonBgColor: node.data.props.buttonBgColor,
    buttonTextColor: node.data.props.buttonTextColor,
    buttonSecondaryBgColor: node.data.props.buttonSecondaryBgColor,
    buttonSecondaryTextColor: node.data.props.buttonSecondaryTextColor,
    alignment: node.data.props.alignment,
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
          value={alignment}
          onChange={(e) =>
            setProp((props: any) => (props.alignment = e.target.value))
          }
        >
          <option value='left'>Izquierda</option>
          <option value='center'>Centro</option>
          <option value='right'>Derecha</option>
        </select>
      </div>

      {/* Primer botón */}
      <div className='pt-2 border-t'>
        <label className='text-sm font-medium mb-1 block'>
          Texto Botón Principal
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonText}
          onChange={(e) =>
            setProp((props: any) => (props.buttonText = e.target.value))
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Enlace Botón Principal
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonLink}
          onChange={(e) =>
            setProp((props: any) => (props.buttonLink = e.target.value))
          }
        />
        <p className='text-xs text-gray-500 mt-1'>
          Usa '#id' para enlazar a una sección en la página
        </p>
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Color de fondo del botón principal
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
          Color de texto del botón principal
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

      {/* Segundo botón */}
      <div className='pt-2 border-t'>
        <label className='text-sm font-medium mb-1 block'>
          Texto Botón Secundario
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonTextSecondary}
          onChange={(e) =>
            setProp(
              (props: any) => (props.buttonTextSecondary = e.target.value)
            )
          }
        />
      </div>
      <div>
        <label className='text-sm font-medium mb-1 block'>
          Enlace Botón Secundario
        </label>
        <input
          type='text'
          className='w-full p-2 border rounded text-sm'
          value={buttonLinkSecondary}
          onChange={(e) =>
            setProp(
              (props: any) => (props.buttonLinkSecondary = e.target.value)
            )
          }
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
            value={buttonSecondaryBgColor}
            onChange={(e) =>
              setProp(
                (props: any) => (props.buttonSecondaryBgColor = e.target.value)
              )
            }
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={buttonSecondaryBgColor}
            onChange={(e) =>
              setProp(
                (props: any) => (props.buttonSecondaryBgColor = e.target.value)
              )
            }
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
            value={buttonSecondaryTextColor}
            onChange={(e) =>
              setProp(
                (props: any) =>
                  (props.buttonSecondaryTextColor = e.target.value)
              )
            }
          />
          <input
            type='text'
            className='flex-1 p-2 border rounded text-sm ml-2'
            value={buttonSecondaryTextColor}
            onChange={(e) =>
              setProp(
                (props: any) =>
                  (props.buttonSecondaryTextColor = e.target.value)
              )
            }
          />
        </div>
      </div>

      {/* Colores generales */}
      <div className='pt-2 border-t'>
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
    </div>
  );
};

// Obtener valores por defecto del cliente
const clientDefaults = getPersonalizedDefaults(null);

HeroBasic.craft = {
  displayName: 'HeroBasic',
  props: {
    title: clientDefaults.heroTitle,
    subtitle: clientDefaults.heroSubtitle,
    buttonText: clientDefaults.buttonText1,
    buttonLink: '#vehicles',
    buttonTextSecondary: clientDefaults.buttonText2,
    buttonLinkSecondary: '#contact',
    bgColor: clientDefaults.backgroundColor,
    textColor: clientDefaults.textColor,
    buttonBgColor: clientDefaults.primaryColor,
    buttonTextColor: clientDefaults.secondaryColor,
    buttonSecondaryBgColor: 'transparent',
    buttonSecondaryTextColor: clientDefaults.primaryColor,
    alignment: 'center',
  },
  related: {
    settings: HeroBasicSettings,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
  isCanvas: true,
};
