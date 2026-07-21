import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { ArrowRight } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface HeroPremiumProps {
  title?: string;
  highlightText?: string;
  eyebrowText?: string;
  subtitle?: string;
  buttonText?: string;
  buttonLink?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const HeroPremium = ({
  title = 'Experiencia automotriz',
  highlightText = '',
  eyebrowText = 'Premium Collection',
  subtitle = 'Vehículos seleccionados para quienes exigen lo extraordinario.',
  buttonText = 'Explorar vehículos',
  buttonLink = '#vehicles',
  bgColor = '#0a0a0a',
  textColor = '#ffffff',
  accentColor = '',
}: HeroPremiumProps) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth();
  const d = getPersonalizedDefaults(client);
  const accent = accentColor || d.primaryColor;
  const highlight = highlightText || d.companyName;

  const handleClick = (e: React.MouseEvent) => { if (isEnabled) e.preventDefault(); };

  return (
    <div
      ref={connectors.connect}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        position: 'relative',
        border: selected ? '2px dashed #444' : '1px solid transparent',
      }}
      className="w-full min-h-[700px] flex items-center justify-center"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '128px 128px',
      }} />

      {/* Glow orb */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse at 50% 40%, ${hexToRgba(accent, 0.12)} 0%, transparent 60%)`,
      }} />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24 text-center">
        <div className="space-y-8">
          {/* Eyebrow line */}
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12" style={{ backgroundColor: hexToRgba(textColor, 0.2) }} />
            <EditableText tag="span" value={eyebrowText} nodeId={id} propName="eyebrowText" className="text-xs font-medium uppercase tracking-[0.3em]" style={{ color: hexToRgba(textColor, 0.4) }} />
            <div className="h-px w-12" style={{ backgroundColor: hexToRgba(textColor, 0.2) }} />
          </div>

          {/* Title */}
          <EditableText
            tag="h1"
            value={title}
            nodeId={id}
            propName="title"
            className="text-[3rem] sm:text-[4rem] lg:text-[5rem] font-bold leading-[0.95]"
            style={{ color: textColor, letterSpacing: '-0.04em' }}
          />

          {/* Highlight text with glow */}
          <EditableText
            tag="h1"
            value={highlight}
            nodeId={id}
            propName="highlightText"
            className="text-[3rem] sm:text-[4rem] lg:text-[5rem] font-bold leading-[0.95]"
            style={{
              color: accent,
              letterSpacing: '-0.04em',
              textShadow: `0 0 60px ${hexToRgba(accent, 0.4)}, 0 0 120px ${hexToRgba(accent, 0.15)}`,
            }}
          />

          {/* Subtitle */}
          <EditableText
            tag="p"
            value={subtitle}
            nodeId={id}
            propName="subtitle"
            className="text-lg sm:text-xl max-w-xl mx-auto"
            style={{ color: hexToRgba(textColor, 0.5), lineHeight: '1.7' }}
          />

          {/* CTA - glassmorphic button */}
          <div className="pt-4">
            <a
              href={buttonLink}
              onClick={handleClick}
              className="group inline-flex items-center gap-3 h-14 px-8 rounded-full text-[15px] font-medium transition-all duration-300 hover:scale-[1.03]"
              style={{
                backgroundColor: hexToRgba(accent, 0.1),
                border: `1px solid ${hexToRgba(accent, 0.3)}`,
                color: accent,
                backdropFilter: 'blur(12px)',
                boxShadow: `0 0 30px ${hexToRgba(accent, 0.1)}`,
              }}
            >
              <EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" />
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
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

HeroPremium.craft = {
  displayName: 'HeroPremium',
  props: {
    title: 'Experiencia automotriz', highlightText: '', eyebrowText: 'Premium Collection', subtitle: 'Vehículos seleccionados para quienes exigen lo extraordinario.',
    buttonText: 'Explorar vehículos', buttonLink: '#vehicles',
    bgColor: '#0a0a0a', textColor: '#ffffff', accentColor: '',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
