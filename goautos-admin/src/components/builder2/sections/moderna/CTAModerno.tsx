import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { ArrowRight } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface CTAModernoProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  accentColor?: string;
}

export const CTAModerno = ({
  title = '¿Listo para encontrar tu auto ideal?',
  subtitle = 'Contáctanos hoy y descubre las mejores opciones de financiamiento disponibles para ti.',
  buttonText = 'Comenzar ahora',
  buttonLink = '#contact',
  accentColor = '#3b82f6',
}: CTAModernoProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalAccent = accentColor || clientDefaults.primaryColor;

  const handleClick = (e: React.MouseEvent) => {
    if (isEnabled) e.preventDefault();
  };

  const lighterAccent = lighten(finalAccent, 25);

  return (
    <div
      ref={connectors.connect}
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: selected ? '2px dashed #666' : '1px solid transparent',
        outline: selected ? '1px dashed #999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `linear-gradient(135deg, ${finalAccent} 0%, ${lighterAccent} 100%)` }}
      />

      {/* Subtle white orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/15" style={{ filter: 'blur(80px)' }} />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10" style={{ filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
        <EditableText
          tag="h2"
          value={title}
          nodeId={id}
          propName="title"
          className="text-[2rem] sm:text-[2.75rem] font-semibold text-white leading-tight mb-5"
          style={{ letterSpacing: '-0.025em' }}
        />
        <EditableText
          tag="p"
          value={subtitle}
          nodeId={id}
          propName="subtitle"
          className="text-lg sm:text-xl text-white/70 max-w-lg mx-auto mb-10"
        />
        <a
          href={buttonLink}
          onClick={handleClick}
          className="group inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium rounded-full bg-white transition-all duration-300 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
          style={{ color: finalAccent }}
        >
          <EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" />
          <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
        </a>
      </div>
    </div>
  );
};

function lighten(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  let r = Math.min(255, ((num >> 16) & 0xff) + amount);
  let g = Math.min(255, ((num >> 8) & 0xff) + amount);
  let b = Math.min(255, (num & 0xff) + amount);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

CTAModerno.craft = {
  displayName: 'CTAModerno',
  props: {
    title: '¿Listo para encontrar tu auto ideal?',
    subtitle: 'Contáctanos hoy y descubre las mejores opciones de financiamiento disponibles para ti.',
    buttonText: 'Comenzar ahora',
    buttonLink: '#contact',
    accentColor: '#3b82f6',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
