import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText, EditableArrayText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface TrustItem {
  text: string;
}

interface HeroModernoProps {
  title?: string;
  highlightText?: string;
  subtitle?: string;
  badgeText?: string;
  buttonText?: string;
  buttonLink?: string;
  buttonText2?: string;
  buttonLink2?: string;
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  trustItems?: TrustItem[];
}

export const HeroModerno = ({
  title = 'Encuentra tu próximo vehículo en',
  highlightText = '',
  subtitle = 'La mejor selección de vehículos con financiamiento a tu medida y atención personalizada.',
  badgeText = 'Tu automotora de confianza',
  buttonText = 'Ver vehículos',
  buttonLink = '#vehicles',
  buttonText2 = 'Contáctanos',
  buttonLink2 = '#contact',
  bgColor = '#fbfbfd',
  textColor = '#0f172a',
  accentColor = '#3b82f6',
  trustItems = [
    { text: '500+ autos vendidos' },
    { text: '4.9★ en Google' },
    { text: 'Financiamiento 100%' },
    { text: 'Garantía incluida' },
  ],
}: HeroModernoProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalHighlight = highlightText || clientDefaults.companyName;
  const finalAccent = accentColor || clientDefaults.primaryColor;
  const lighterAccent = lighten(finalAccent, 60);

  const handleClick = (e: React.MouseEvent) => {
    if (isEnabled) e.preventDefault();
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        position: 'relative',
        border: selected ? '2px dashed #666' : '1px solid transparent',
        outline: selected ? '1px dashed #999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className="w-full min-h-[700px] flex items-center"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      {/* Full background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 70% 20%, ${hexToRgba(finalAccent, 0.08)} 0%, transparent 60%), radial-gradient(ellipse at 30% 80%, ${hexToRgba(finalAccent, 0.05)} 0%, transparent 60%)` }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-12">
        <div className="flex flex-col items-center text-center" style={{ gap: '1.75rem' }}>
          {/* Badge */}
          <div
            className="flex items-center gap-2.5 text-sm font-medium"
            style={{ color: hexToRgba(textColor, 0.5) }}
          >
            <span className="w-8 h-px" style={{ backgroundColor: hexToRgba(textColor, 0.2) }} />
            <EditableText tag="span" value={badgeText} nodeId={id} propName="badgeText" />
            <span className="w-8 h-px" style={{ backgroundColor: hexToRgba(textColor, 0.2) }} />
          </div>

          {/* Headline */}
          <div>
            <EditableText
              tag="h1"
              value={title}
              nodeId={id}
              propName="title"
              className="text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem] font-semibold leading-[1.05]"
              style={{ color: textColor, letterSpacing: '-0.035em' }}
            />
            <EditableText
              tag="h1"
              value={finalHighlight}
              nodeId={id}
              propName="highlightText"
              className="text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem] font-semibold leading-[1.05]"
              style={{ color: finalAccent, letterSpacing: '-0.035em' }}
            />
          </div>

          {/* Subtitle */}
          <EditableText
            tag="p"
            value={subtitle}
            nodeId={id}
            propName="subtitle"
            className="text-lg sm:text-xl font-normal leading-relaxed max-w-lg mx-auto"
            style={{ color: hexToRgba(textColor, 0.5) }}
          />

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-x-7 gap-y-3">
            {trustItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[15px]"
                style={{ color: hexToRgba(textColor, 0.6) }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: finalAccent }} />
                <EditableArrayText tag="span" value={item.text} nodeId={id} arrayProp="trustItems" index={i} field="text" />
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
            <a
              href={buttonLink}
              onClick={handleClick}
              className="group inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium text-white rounded-full transition-all duration-300 hover:shadow-xl hover:scale-[1.02]"
              style={{
                backgroundImage: `linear-gradient(to right, ${finalAccent}, ${lighten(finalAccent, 20)})`,
                boxShadow: `0 8px 24px ${hexToRgba(finalAccent, 0.25)}`,
              }}
            >
              <EditableText tag="span" value={buttonText} nodeId={id} propName="buttonText" />
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-300" />
            </a>
            <a
              href={buttonLink2}
              onClick={handleClick}
              className="inline-flex items-center justify-center h-14 px-8 text-[17px] font-medium rounded-full transition-all duration-200 hover:bg-slate-100"
              style={{ color: hexToRgba(textColor, 0.7) }}
            >
              <EditableText tag="span" value={buttonText2} nodeId={id} propName="buttonText2" />
            </a>
          </div>

          {/* Trust line */}
          <div
            className="flex items-center justify-center gap-5 pt-1 text-[13px]"
            style={{ color: hexToRgba(textColor, 0.35) }}
          >
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Garantía incluida</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Financiamiento flexible</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Envío a domicilio</span>
          </div>
        </div>
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

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const num = parseInt(clean, 16);
  return `rgba(${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff},${alpha})`;
}

HeroModerno.craft = {
  displayName: 'HeroModerno',
  props: {
    title: 'Encuentra tu próximo vehículo en',
    highlightText: '',
    subtitle: 'La mejor selección de vehículos con financiamiento a tu medida y atención personalizada.',
    badgeText: 'Tu automotora de confianza',
    buttonText: 'Ver vehículos',
    buttonLink: '#vehicles',
    buttonText2: 'Contáctanos',
    buttonLink2: '#contact',
    bgColor: '#fbfbfd',
    textColor: '#0f172a',
    accentColor: '#3b82f6',
    trustItems: [
      { text: '500+ autos vendidos' },
      { text: '4.9★ en Google' },
      { text: 'Financiamiento 100%' },
      { text: 'Garantía incluida' },
    ],
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};
