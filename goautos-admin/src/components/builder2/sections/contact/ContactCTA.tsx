import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { EditableText } from '../../EditableText';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface ContactCTAProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  bgColor?: string;
  textColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
}

/**
 * Darken a hex color by a given amount (0-100).
 */
function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * amount));
  const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(2.55 * amount));
  const b = Math.max(0, (num & 0x0000ff) - Math.round(2.55 * amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export const ContactCTA = ({
  title = '¿Listo para encontrar tu auto ideal?',
  subtitle = 'Contáctanos hoy mismo',
  buttonText = 'Contáctanos',
  buttonLink = '/contact',
  bgColor = '#ffffff',
  textColor = '#ffffff',
  buttonBgColor,
  buttonTextColor = '#ffffff',
}: ContactCTAProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalButtonBgColor = buttonBgColor || clientDefaults.primaryColor;

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  const handleClick = () => {
    if (isEnabled) return;
    if (buttonLink) {
      window.location.href = buttonLink;
    }
  };

  const gradientFrom = finalButtonBgColor;
  const gradientTo = darkenHex(finalButtonBgColor, 22);

  return (
    <div
      ref={connectors.connect}
      className={`relative overflow-hidden ${selected ? 'ring-2 ring-dashed ring-slate-400' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
        backgroundColor: bgColor,
      }}
    >
      {selected && isEnabled && <DeleteButton />}

      {/* Decorative orbs */}
      <div
        className='absolute -top-20 -left-20 w-72 h-72 rounded-full pointer-events-none'
        style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(60px)' }}
      />
      <div
        className='absolute top-1/2 -right-16 w-96 h-96 rounded-full pointer-events-none'
        style={{ background: 'rgba(255,255,255,0.06)', filter: 'blur(80px)' }}
      />
      <div
        className='absolute -bottom-10 left-1/3 w-56 h-56 rounded-full pointer-events-none'
        style={{ background: 'rgba(255,255,255,0.05)', filter: 'blur(50px)' }}
      />

      <div className='relative z-10 max-w-4xl mx-auto py-20 md:py-24 px-6 text-center'>
        <EditableText tag="h2" value={title} nodeId={id} propName="title"
          className='text-4xl md:text-5xl font-bold leading-tight tracking-tight'
          style={{ color: textColor }}
        />

        <EditableText tag="p" value={subtitle} nodeId={id} propName="subtitle"
          className='mt-4 text-lg md:text-xl max-w-2xl mx-auto'
          style={{ color: textColor, opacity: 0.8 }}
        />

        <div className='mt-10'>
          <Button
            size='lg'
            className='group rounded-full px-10 py-4 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105'
            style={{
              backgroundColor: '#ffffff',
              color: finalButtonBgColor,
            }}
            onClick={handleClick}
          >
            <EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" />
            <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300' />
          </Button>
        </div>
      </div>
    </div>
  );
};

(ContactCTA as any).craft = {
  displayName: 'ContactCTA',
  props: {
    title: '¿Listo para encontrar tu auto ideal?',
    subtitle: 'Contáctanos hoy mismo',
    buttonText: 'Contáctanos',
    buttonLink: '/contact',
    bgColor: '#ffffff',
    textColor: '#ffffff',
    buttonBgColor: '',
    buttonTextColor: '#ffffff',
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};
