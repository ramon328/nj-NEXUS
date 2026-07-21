import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Shield, Clock, CreditCard, Award, Headphones, Truck, Star, Zap } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText, EditableArrayText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

const ICON_MAP: Record<string, React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>> = {
  Shield, Clock, CreditCard, Award, Headphones, Truck, Star, Zap,
};

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
}

interface FeatureShowcaseProps {
  eyebrowText?: string;
  sectionTitle?: string;
  subtitle?: string;
  features?: FeatureItem[];
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(255,255,255,${alpha})`;
  const num = parseInt(clean, 16);
  return `rgba(${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff},${alpha})`;
}

export const FeatureShowcase = ({
  eyebrowText = 'Por qué elegirnos',
  sectionTitle = 'Una experiencia premium en cada detalle',
  subtitle = 'Nos dedicamos a ofrecer el más alto estándar en cada paso del proceso.',
  features = [
    { icon: 'Shield', title: 'Garantía extendida', description: 'Cada vehículo cuenta con cobertura completa respaldada por los mejores estándares de la industria.' },
    { icon: 'CreditCard', title: 'Financiamiento flexible', description: 'Planes personalizados con las mejores tasas del mercado.' },
    { icon: 'Clock', title: 'Atención 24/7', description: 'Soporte dedicado cuando lo necesites, sin importar la hora.' },
    { icon: 'Award', title: 'Certificación premium', description: 'Cada vehículo supera 150 puntos de inspección rigurosa.' },
    { icon: 'Truck', title: 'Entrega a domicilio', description: 'Tu vehículo llega directamente a tu puerta.' },
    { icon: 'Headphones', title: 'Asesor personal', description: 'Un experto dedicado exclusivamente a tu búsqueda.' },
  ],
  bgColor = '#0a0a0a',
  textColor = '#ffffff',
  accentColor = '',
}: FeatureShowcaseProps) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth();
  const accent = accentColor || getPersonalizedDefaults(client).primaryColor;

  const gridAreas = [
    'sm:col-span-2 sm:row-span-2',
    '', '', '', '', '',
  ];

  return (
    <div
      ref={(el: HTMLDivElement | null) => { if (el) connectors.connect(el); }}
      style={{ backgroundColor: bgColor, color: textColor, position: 'relative', overflow: 'hidden', border: selected ? '2px dashed #444' : '1px solid transparent' }}
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${hexToRgba(accent, 0.06)} 0%, transparent 70%)` }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${hexToRgba(accent, 0.04)} 0%, transparent 70%)` }} />

      <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
        {/* Header — left-aligned for premium feel */}
        <div className="max-w-3xl mb-20">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 max-w-[40px]" style={{ backgroundColor: accent }} />
            <EditableText
              tag="p"
              value={eyebrowText}
              nodeId={id}
              propName="eyebrowText"
              className="text-xs font-semibold uppercase tracking-[0.25em]"
              style={{ color: accent }}
            />
          </div>
          <EditableText
            tag="h2"
            value={sectionTitle}
            nodeId={id}
            propName="sectionTitle"
            className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] mb-5"
            style={{ color: textColor, letterSpacing: '-0.03em' }}
          />
          <EditableText
            tag="p"
            value={subtitle}
            nodeId={id}
            propName="subtitle"
            className="text-lg leading-relaxed max-w-2xl"
            style={{ color: hexToRgba(textColor, 0.5) }}
          />
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {features.map((f, i) => {
            const IconComp = ICON_MAP[f.icon] || Shield;
            const isFeatured = i === 0;
            const gridClass = gridAreas[i] || '';

            return (
              <div
                key={i}
                className={`group relative rounded-2xl overflow-hidden transition-all duration-500 hover:-translate-y-1 ${gridClass} ${isFeatured ? 'p-10 lg:p-12' : 'p-7 lg:p-8'}`}
                style={{
                  backgroundColor: hexToRgba(textColor, 0.04),
                  border: `1px solid ${hexToRgba(textColor, 0.07)}`,
                }}
              >
                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 50% 0%, ${hexToRgba(accent, 0.08)} 0%, transparent 60%)` }}
                />

                {/* Top accent line on hover */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
                />

                <div className="relative z-10">
                  {/* Icon */}
                  <div
                    className={`rounded-2xl flex items-center justify-center mb-6 ${isFeatured ? 'w-16 h-16' : 'w-12 h-12'}`}
                    style={{
                      background: `linear-gradient(135deg, ${hexToRgba(accent, 0.15)}, ${hexToRgba(accent, 0.05)})`,
                      border: `1px solid ${hexToRgba(accent, 0.15)}`,
                    }}
                  >
                    <IconComp size={isFeatured ? 28 : 22} style={{ color: accent }} />
                  </div>

                  {/* Title */}
                  <EditableArrayText
                    tag="h3"
                    value={f.title}
                    nodeId={id}
                    arrayProp="features"
                    index={i}
                    field="title"
                    className={`font-bold mb-3 leading-tight ${isFeatured ? 'text-2xl lg:text-3xl' : 'text-lg'}`}
                    style={{ color: textColor, letterSpacing: '-0.02em' }}
                  />

                  {/* Description */}
                  <EditableArrayText
                    tag="p"
                    value={f.description}
                    nodeId={id}
                    arrayProp="features"
                    index={i}
                    field="description"
                    className={`leading-relaxed ${isFeatured ? 'text-base lg:text-lg' : 'text-[14px]'}`}
                    style={{ color: hexToRgba(textColor, 0.5) }}
                  />

                  {/* Featured card: extra accent element */}
                  {isFeatured && (
                    <div className="mt-8 flex items-center gap-2" style={{ color: accent }}>
                      <span className="text-sm font-medium">Conoce más</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="group-hover:translate-x-1 transition-transform duration-300">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

FeatureShowcase.craft = {
  displayName: 'FeatureShowcase',
  props: {
    eyebrowText: 'Por qué elegirnos',
    sectionTitle: 'Una experiencia premium en cada detalle',
    subtitle: 'Nos dedicamos a ofrecer el más alto estándar en cada paso del proceso.',
    features: [
      { icon: 'Shield', title: 'Garantía extendida', description: 'Cada vehículo cuenta con cobertura completa respaldada por los mejores estándares de la industria.' },
      { icon: 'CreditCard', title: 'Financiamiento flexible', description: 'Planes personalizados con las mejores tasas del mercado.' },
      { icon: 'Clock', title: 'Atención 24/7', description: 'Soporte dedicado cuando lo necesites, sin importar la hora.' },
      { icon: 'Award', title: 'Certificación premium', description: 'Cada vehículo supera 150 puntos de inspección rigurosa.' },
      { icon: 'Truck', title: 'Entrega a domicilio', description: 'Tu vehículo llega directamente a tu puerta.' },
      { icon: 'Headphones', title: 'Asesor personal', description: 'Un experto dedicado exclusivamente a tu búsqueda.' },
    ],
    bgColor: '#0a0a0a', textColor: '#ffffff', accentColor: '',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
