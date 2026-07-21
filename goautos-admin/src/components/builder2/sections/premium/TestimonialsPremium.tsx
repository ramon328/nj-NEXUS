import React, { useState } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DeleteButton } from '../../DeleteButton';
import { EditableText, EditableArrayText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface TestimonialItem {
  quote: string;
  authorName: string;
  authorRole: string;
}

interface TestimonialsPremiumProps {
  eyebrowText?: string;
  testimonials?: TestimonialItem[];
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const TestimonialsPremium = ({
  eyebrowText = 'Testimonios',
  testimonials = [
    { quote: 'Una experiencia de compra excepcional. Desde la primera consulta hasta la entrega, cada detalle fue impecable.', authorName: 'Carolina Vásquez', authorRole: 'Empresaria' },
    { quote: 'El nivel de profesionalismo y la calidad de los vehículos superaron mis expectativas. Sin duda volveré.', authorName: 'Andrés Montero', authorRole: 'Ingeniero' },
    { quote: 'Financiamiento transparente y un servicio post-venta que realmente se preocupa. Los recomiendo completamente.', authorName: 'Isabel Fuentes', authorRole: 'Arquitecta' },
  ],
  bgColor = '#0f0f0f',
  textColor = '#ffffff',
  accentColor = '',
}: TestimonialsPremiumProps) => {
  const { connectors, selected, id } = useNode((s) => ({ selected: s.events.selected }));
  const { isEnabled } = useEditor((s) => ({ isEnabled: s.options.enabled }));
  const { client } = useAuth();
  const accent = accentColor || getPersonalizedDefaults(client).primaryColor;
  const [active, setActive] = useState(0);

  const goNext = () => setActive((i) => (i + 1) % testimonials.length);
  const goPrev = () => setActive((i) => (i - 1 + testimonials.length) % testimonials.length);
  const t = testimonials[active];

  return (
    <div
      ref={connectors.connect}
      style={{ backgroundColor: bgColor, color: textColor, position: 'relative', border: selected ? '2px dashed #444' : '1px solid transparent' }}
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className="max-w-4xl mx-auto px-6 py-24 lg:py-32 text-center">
        {/* Eyebrow */}
        <EditableText
          tag="p"
          value={eyebrowText}
          nodeId={id}
          propName="eyebrowText"
          className="text-xs font-medium uppercase tracking-[0.3em] mb-16"
          style={{ color: accent }}
        />

        {/* Giant quote mark */}
        <div className="relative">
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10rem] leading-none font-serif pointer-events-none select-none" style={{ color: hexToRgba(accent, 0.08) }}>
            &ldquo;
          </div>

          {/* Quote */}
          <div className="relative z-10 min-h-[180px] flex items-center justify-center">
            {t && (
              <div key={active}>
                <EditableArrayText
                  tag="p"
                  value={t.quote}
                  nodeId={id}
                  arrayProp="testimonials"
                  index={active}
                  field="quote"
                  className="text-xl sm:text-2xl lg:text-3xl font-light italic leading-relaxed max-w-3xl mx-auto"
                  style={{ color: hexToRgba(textColor, 0.85) }}
                />
                <div className="mt-10 space-y-1">
                  <EditableArrayText
                    tag="p"
                    value={t.authorName}
                    nodeId={id}
                    arrayProp="testimonials"
                    index={active}
                    field="authorName"
                    className="text-base font-semibold"
                    style={{ color: textColor }}
                  />
                  <EditableArrayText
                    tag="p"
                    value={t.authorRole}
                    nodeId={id}
                    arrayProp="testimonials"
                    index={active}
                    field="authorRole"
                    className="text-sm"
                    style={{ color: hexToRgba(textColor, 0.4) }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        {testimonials.length > 1 && (
          <div className="flex items-center justify-center gap-6 mt-12">
            <button onClick={goPrev} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ border: `1px solid ${hexToRgba(textColor, 0.15)}` }}>
              <ChevronLeft size={18} style={{ color: hexToRgba(textColor, 0.5) }} />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button key={i} onClick={() => setActive(i)}
                  className="w-2 h-2 rounded-full transition-all duration-300"
                  style={{ backgroundColor: i === active ? accent : hexToRgba(textColor, 0.2), transform: i === active ? 'scale(1.3)' : 'scale(1)' }}
                />
              ))}
            </div>
            <button onClick={goNext} className="w-10 h-10 rounded-full flex items-center justify-center transition-colors" style={{ border: `1px solid ${hexToRgba(textColor, 0.15)}` }}>
              <ChevronRight size={18} style={{ color: hexToRgba(textColor, 0.5) }} />
            </button>
          </div>
        )}
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

TestimonialsPremium.craft = {
  displayName: 'TestimonialsPremium',
  props: {
    eyebrowText: 'Testimonios',
    testimonials: [
      { quote: 'Una experiencia de compra excepcional. Desde la primera consulta hasta la entrega, cada detalle fue impecable.', authorName: 'Carolina Vásquez', authorRole: 'Empresaria' },
      { quote: 'El nivel de profesionalismo y la calidad de los vehículos superaron mis expectativas. Sin duda volveré.', authorName: 'Andrés Montero', authorRole: 'Ingeniero' },
      { quote: 'Financiamiento transparente y un servicio post-venta que realmente se preocupa. Los recomiendo completamente.', authorName: 'Isabel Fuentes', authorRole: 'Arquitecta' },
    ],
    bgColor: '#0f0f0f', textColor: '#ffffff', accentColor: '',
  },
  rules: { canDrag: () => true, canDrop: () => true, canMoveIn: () => false },
};
