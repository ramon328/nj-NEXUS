import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { ArrowRight } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface CTAPremiumProps {
  title?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const CTAPremium = ({
  title = 'Agenda tu visita exclusiva',
  subtitle = 'Reserva una cita personalizada con uno de nuestros asesores y vive la experiencia premium que mereces.',
  buttonText = 'Reservar ahora',
  buttonLink = '#contact',
  bgColor = '#0a0a0a',
  textColor = '#ffffff',
  accentColor = '',
}: CTAPremiumProps) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth();
  const accent = accentColor || getPersonalizedDefaults(client).primaryColor;

  const handleClick = (e: React.MouseEvent) => { if (isEnabled) e.preventDefault(); };

  return (
    <div
      ref={connectors.connect}
      style={{ backgroundColor: bgColor, color: textColor, position: 'relative', border: selected ? '2px dashed #444' : '1px solid transparent' }}
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 50% 50%, ${hexToRgba(accent, 0.1)} 0%, transparent 60%)`,
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 lg:py-32 flex justify-center">
        {/* Glass card */}
        <div
          className="w-full max-w-3xl rounded-3xl p-10 sm:p-14 lg:p-16 text-center"
          style={{
            backgroundColor: hexToRgba(textColor, 0.03),
            border: `1px solid ${hexToRgba(textColor, 0.08)}`,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 0 80px ${hexToRgba(accent, 0.06)}, inset 0 1px 0 ${hexToRgba(textColor, 0.05)}`,
          }}
        >
          <EditableText
            tag="h2"
            value={title}
            nodeId={id}
            propName="title"
            className="text-[2rem] sm:text-[2.5rem] lg:text-[3rem] font-bold mb-6"
            style={{ color: textColor, letterSpacing: '-0.03em' }}
          />
          <EditableText
            tag="p"
            value={subtitle}
            nodeId={id}
            propName="subtitle"
            className="text-base sm:text-lg max-w-lg mx-auto mb-10"
            style={{ color: hexToRgba(textColor, 0.5), lineHeight: '1.7' }}
          />
          <a
            href={buttonLink}
            onClick={handleClick}
            className="group inline-flex items-center gap-3 h-14 px-10 rounded-full text-[15px] font-semibold transition-all duration-300 hover:scale-[1.03]"
            style={{
              border: `2px solid ${accent}`,
              color: accent,
              backgroundColor: 'transparent',
              boxShadow: `0 0 30px ${hexToRgba(accent, 0.15)}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = accent;
              e.currentTarget.style.color = bgColor;
              e.currentTarget.style.boxShadow = `0 0 50px ${hexToRgba(accent, 0.3)}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = accent;
              e.currentTarget.style.boxShadow = `0 0 30px ${hexToRgba(accent, 0.15)}`;
            }}
          >
            <EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" />
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(255,255,255,${alpha})`;
  const num = parseInt(clean, 16);
  return `rgba(${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff},${alpha})`;
}

CTAPremium.craft = {
  displayName: 'CTAPremium',
  props: {
    title: 'Agenda tu visita exclusiva',
    subtitle: 'Reserva una cita personalizada con uno de nuestros asesores y vive la experiencia premium que mereces.',
    buttonText: 'Reservar ahora', buttonLink: '#contact',
    bgColor: '#0a0a0a', textColor: '#ffffff', accentColor: '',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
