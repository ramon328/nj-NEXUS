import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import { Button } from '@/components/ui/button';

interface HeroWithVideoEmbedProps {
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
  videoUrl?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  textAlignment?: 'left' | 'center' | 'right';
  height?: string;
  maxWidth?: string;
  borderRadius?: string;
  children?: React.ReactNode;
}

const getBackgroundEmbedUrl = (url: string): string | null => {
  if (!url) return null;

  // Streamable: https://streamable.com/uuu73a  o  https://streamable.com/e/uuu73a
  let m = url.match(/streamable\.com\/(?:e\/)?([a-zA-Z0-9]+)/);
  if (m) {
    return `https://streamable.com/e/${m[1]}?autoplay=1&muted=1&loop=1&nocontrols=1`;
  }

  // YouTube: watch?v= | youtu.be | embed | shorts
  m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
  );
  if (m) {
    const id = m[1];
    return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&showinfo=0&rel=0&iv_load_policy=3&playsinline=1`;
  }

  // Vimeo: vimeo.com/123456
  m = url.match(/vimeo\.com\/(\d+)/);
  if (m) {
    return `https://player.vimeo.com/video/${m[1]}?autoplay=1&loop=1&muted=1&background=1`;
  }

  return null;
};

export const HeroWithVideoEmbed = ({
  title = 'Encuentra tu próximo auto',
  subtitle = 'Amplio inventario de autos seminuevos verificados y con garantía',
  buttonText = 'Ver vehículos',
  buttonLink = '#vehicles',
  buttonTextSecondary = 'Contactar',
  buttonLinkSecondary = '#contact',
  buttonBgColor = '#3b82f6',
  buttonTextColor = '#ffffff',
  buttonSecondaryBgColor = 'transparent',
  buttonSecondaryTextColor = '#ffffff',
  videoUrl = '',
  overlayColor = '#000000',
  overlayOpacity = 0.5,
  textColor = '#ffffff',
  textAlignment = 'center',
  height = '500px',
  maxWidth = '1280px',
  borderRadius = '16px',
  children,
}: HeroWithVideoEmbedProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const embedUrl = getBackgroundEmbedUrl(videoUrl || '');

  const overlayStyle: React.CSSProperties = {
    backgroundColor: overlayColor,
    opacity: overlayOpacity,
  };

  const scrollToVehicles = (e: React.MouseEvent) => {
    if (isEnabled) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    const vehicleSection =
      document.querySelector('[data-section="vehicles"]') ||
      document.getElementById('vehicles-section') ||
      document.querySelector('.VehicleGrid') ||
      document.querySelector('.vehicles-section') ||
      document.querySelector('[class*="vehicle"]');

    if (vehicleSection) {
      vehicleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (buttonLink) {
      window.location.href = buttonLink;
    }
  };

  const handleSecondaryButtonClick = (e: React.MouseEvent) => {
    if (isEnabled) {
      e.preventDefault();
    }
  };

  return (
    <div className='w-full px-4 sm:px-6 flex justify-center'>
      <div
        ref={connectors.connect}
        style={{
          width: '100%',
          maxWidth,
          height,
          position: 'relative',
          overflow: 'hidden',
          borderRadius,
          color: textColor,
          backgroundColor: '#000',
          border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
        }}
        className='flex items-center'
      >
      {/* Botón de eliminar */}
      {selected && <DeleteButton nodeId={id} />}

      {/* Video de fondo (cover) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {embedUrl ? (
          <iframe
            src={embedUrl}
            allow='autoplay; fullscreen; picture-in-picture'
            allowFullScreen
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '177.78vh',
              height: '56.25vw',
              minWidth: '100%',
              minHeight: '100%',
              transform: 'translate(-50%, -50%)',
              border: 0,
            }}
            title='Hero video'
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '24px',
              backgroundColor: '#1f2937',
              pointerEvents: 'none',
            }}
          >
            <span
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 500,
                padding: '8px 14px',
                borderRadius: '8px',
              }}
            >
              Pega un URL de Streamable o Vimeo en la configuración
            </span>
          </div>
        )}
      </div>

      {/* Overlay */}
      <div style={overlayStyle} className='absolute inset-0 z-[1]' />

      {/* Contenido */}
      <div className='container mx-auto px-4 relative z-[2]'>
        <div
          className={`max-w-3xl mx-auto text-${textAlignment}`}
          style={{ margin: textAlignment === 'center' ? '0 auto' : '0' }}
        >
          <EditableText
            tag='h1'
            value={title}
            nodeId={id}
            propName='title'
            style={{ color: textColor }}
            className='text-4xl md:text-5xl font-bold mb-4'
          />
          <EditableText
            tag='p'
            value={subtitle}
            nodeId={id}
            propName='subtitle'
            style={{ color: textColor }}
            className='text-lg md:text-xl mb-8'
          />
          <div className='flex flex-wrap gap-4 justify-center'>
            <Button
              className='px-8 py-3 rounded-md transition-colors'
              style={{
                backgroundColor: buttonBgColor,
                color: buttonTextColor,
              }}
              onClick={scrollToVehicles}
            >
              <EditableText
                tag='span'
                value={buttonText}
                nodeId={id}
                propName='buttonText'
              />
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
                <EditableText
                  tag='span'
                  value={buttonTextSecondary}
                  nodeId={id}
                  propName='buttonTextSecondary'
                />
              </a>
            </Button>
          </div>

          {children}
        </div>
      </div>
      </div>
    </div>
  );
};

const HeroWithVideoEmbedSettingsStub = () => null;

HeroWithVideoEmbed.craft = {
  displayName: 'HeroWithVideoEmbed',
  props: {
    title: 'Encuentra tu próximo auto',
    subtitle:
      'Amplio inventario de autos seminuevos verificados y con garantía',
    buttonText: 'Ver vehículos',
    buttonLink: '#vehicles',
    buttonTextSecondary: 'Contactar',
    buttonLinkSecondary: '#contact',
    buttonBgColor: '#3b82f6',
    buttonTextColor: '#ffffff',
    buttonSecondaryBgColor: 'transparent',
    buttonSecondaryTextColor: '#ffffff',
    videoUrl: '',
    overlayColor: '#000000',
    overlayOpacity: 0.5,
    textColor: '#ffffff',
    textAlignment: 'center',
    height: '500px',
    maxWidth: '1280px',
    borderRadius: '16px',
  },
  related: {
    settings: HeroWithVideoEmbedSettingsStub,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
  isCanvas: true,
};
