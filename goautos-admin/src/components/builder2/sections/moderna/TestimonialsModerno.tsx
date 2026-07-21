import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { Star, Sparkles } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText, EditableArrayText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface Testimonial {
  stars: number;
  quote: string;
  authorName: string;
  authorRole: string;
  avatarUrl: string;
}

interface TestimonialsModernoProps {
  eyebrowText?: string;
  sectionTitle?: string;
  sectionSubtitle?: string;
  testimonials?: Testimonial[];
  bgColor?: string;
  cardBgColor?: string;
  textColor?: string;
  starColor?: string;
  accentColor?: string;
}

export const TestimonialsModerno = ({
  eyebrowText = 'Testimonios',
  sectionTitle = 'Lo que dicen nuestros clientes',
  sectionSubtitle = 'Experiencias reales de quienes confiaron en nosotros',
  testimonials = [
    { stars: 5, quote: 'Excelente experiencia de compra. El equipo fue muy profesional y encontré exactamente lo que buscaba en menos de una semana.', authorName: 'Carlos Méndez', authorRole: 'Cliente desde 2023', avatarUrl: '' },
    { stars: 5, quote: 'El mejor servicio postventa que he tenido. Respuesta inmediata y soluciones reales a cada consulta que tuve.', authorName: 'María González', authorRole: 'Cliente desde 2022', avatarUrl: '' },
    { stars: 5, quote: 'Financiamiento rápido y transparente. Me dieron las mejores condiciones del mercado sin letra chica.', authorName: 'Roberto Silva', authorRole: 'Cliente desde 2024', avatarUrl: '' },
  ],
  bgColor = '#fbfbfd',
  cardBgColor = '#ffffff',
  textColor = '#0f172a',
  starColor = '#f59e0b',
  accentColor = '#3b82f6',
}: TestimonialsModernoProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));
  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));
  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const finalAccent = accentColor || clientDefaults.primaryColor;

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
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        {/* Header */}
        <div className="text-center mb-16 lg:mb-20">
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white mb-6"
            style={{ backgroundImage: `linear-gradient(to right, ${finalAccent}, ${lighten(finalAccent, 30)})` }}
          >
            <Sparkles className="h-4 w-4" />
            <EditableText tag="span" value={eyebrowText} nodeId={id} propName="eyebrowText" />
          </span>
          <EditableText
            tag="h2"
            value={sectionTitle}
            nodeId={id}
            propName="sectionTitle"
            className="text-[2rem] sm:text-[2.75rem] font-semibold tracking-tight mb-4"
            style={{ color: textColor, letterSpacing: '-0.025em' }}
          />
          <EditableText
            tag="p"
            value={sectionSubtitle}
            nodeId={id}
            propName="sectionSubtitle"
            className="text-lg max-w-md mx-auto"
            style={{ color: hexToRgba(textColor, 0.5) }}
          />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((t, index) => (
            <div
              key={index}
              className="rounded-2xl p-7 sm:p-8 transition-all duration-200 h-full hover:-translate-y-1"
              style={{
                backgroundColor: cardBgColor,
                border: `1px solid ${hexToRgba(textColor, 0.06)}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 20px 40px -15px rgba(0,0,0,0.12)';
                e.currentTarget.style.borderColor = hexToRgba(textColor, 0.1);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                e.currentTarget.style.borderColor = hexToRgba(textColor, 0.06);
              }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={16} fill={starColor} style={{ color: starColor }} />
                ))}
              </div>

              {/* Quote */}
              <EditableArrayText
                tag="p"
                value={t.quote}
                nodeId={id}
                arrayProp="testimonials"
                index={index}
                field="quote"
                className="text-[15px] leading-relaxed mb-8"
                style={{ color: hexToRgba(textColor, 0.7) }}
              />

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: hexToRgba(finalAccent, 0.1), color: finalAccent }}
                >
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.authorName} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    t.authorName.charAt(0)
                  )}
                </div>
                <div>
                  <EditableArrayText tag="p" value={t.authorName} nodeId={id} arrayProp="testimonials" index={index} field="authorName" className="text-[14px] font-semibold" style={{ color: textColor }} />
                  <EditableArrayText tag="p" value={t.authorRole} nodeId={id} arrayProp="testimonials" index={index} field="authorRole" className="text-[13px]" style={{ color: hexToRgba(textColor, 0.4) }} />
                </div>
              </div>
            </div>
          ))}
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

TestimonialsModerno.craft = {
  displayName: 'TestimonialsModerno',
  props: {
    eyebrowText: 'Testimonios',
    sectionTitle: 'Lo que dicen nuestros clientes',
    sectionSubtitle: 'Experiencias reales de quienes confiaron en nosotros',
    testimonials: [
      { stars: 5, quote: 'Excelente experiencia de compra. El equipo fue muy profesional y encontré exactamente lo que buscaba en menos de una semana.', authorName: 'Carlos Méndez', authorRole: 'Cliente desde 2023', avatarUrl: '' },
      { stars: 5, quote: 'El mejor servicio postventa que he tenido. Respuesta inmediata y soluciones reales a cada consulta que tuve.', authorName: 'María González', authorRole: 'Cliente desde 2022', avatarUrl: '' },
      { stars: 5, quote: 'Financiamiento rápido y transparente. Me dieron las mejores condiciones del mercado sin letra chica.', authorName: 'Roberto Silva', authorRole: 'Cliente desde 2024', avatarUrl: '' },
    ],
    bgColor: '#fbfbfd',
    cardBgColor: '#ffffff',
    textColor: '#0f172a',
    starColor: '#f59e0b',
    accentColor: '#3b82f6',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
