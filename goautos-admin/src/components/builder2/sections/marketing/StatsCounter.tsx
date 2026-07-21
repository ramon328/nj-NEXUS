import React from 'react';
import { useNode } from '@craftjs/core';
import { EditableArrayText } from '../../EditableText';
import { DeleteButton } from '../../DeleteButton';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface Stat {
  value: string;
  label: string;
  prefix: string;
  suffix: string;
}

interface StatsCounterProps {
  stats?: Stat[];
  bgColor?: string;
  textColor?: string;
  columns?: 2 | 3 | 4;
}

/**
 * Attempt to darken a hex color by a percentage for gradient effect.
 */
function shiftColor(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const num = parseInt(clean, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Convert hex to rgba for glass-morphism backgrounds.
 */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(255,255,255,${alpha})`;
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const StatsCounter = ({
  stats = [
    { value: '500', label: 'Vehículos vendidos', prefix: '', suffix: '+' },
    { value: '98', label: 'Satisfacción del cliente', prefix: '', suffix: '%' },
    { value: '10', label: 'Años de experiencia', prefix: '', suffix: '+' },
    { value: '24', label: 'Tiempo de respuesta', prefix: '', suffix: 'h' },
  ],
  bgColor = '#ffffff',
  textColor = '#111827',
  columns = 4,
}: StatsCounterProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { client } = useAuth();
  const clientDefaults = getPersonalizedDefaults(client);
  const accentColor = clientDefaults.primaryColor;

  const gradientEnd = shiftColor(bgColor, -12);

  const columnClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }[columns] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';

  const isDark =
    bgColor !== '#ffffff' &&
    bgColor !== '#fff' &&
    parseInt(bgColor.replace('#', '').substring(0, 2), 16) < 128;

  const glassBackground = isDark
    ? 'rgba(255,255,255,0.06)'
    : 'rgba(255,255,255,0.55)';

  const glassBorder = isDark
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(0,0,0,0.06)';

  const subtitleColor = isDark
    ? 'rgba(255,255,255,0.4)'
    : hexToRgba(textColor, 0.35);

  const keyframesStyle = `
    @keyframes statsGradientSlide {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;

  return (
    <div
      ref={connectors.connect}
      style={{
        background: `linear-gradient(165deg, ${bgColor} 0%, ${gradientEnd} 100%)`,
        color: textColor,
        position: 'relative',
        border: selected ? '2px dashed #666666' : '1px solid transparent',
        outline: selected ? '1px dashed #999999' : 'none',
        outlineOffset: selected ? '2px' : '0px',
      }}
      className='w-full'
    >
      <style>{keyframesStyle}</style>
      {selected && <DeleteButton nodeId={id} />}

      <div className='py-16 md:py-24 px-5 md:px-8'>
        <div className='max-w-6xl mx-auto'>
          {/* Section header */}
          <div className='text-center mb-12 md:mb-16'>
            <p
              className='text-xs font-semibold uppercase tracking-[0.25em] mb-3'
              style={{ color: accentColor, opacity: 0.8 }}
            >
              En cifras
            </p>
            <h2
              className='text-2xl md:text-3xl font-bold'
              style={{ color: textColor, opacity: 0.85 }}
            >
              Nuestros números
            </h2>
            <div
              className='w-12 h-1 rounded-full mx-auto mt-4'
              style={{
                background: `linear-gradient(90deg, ${accentColor}, ${shiftColor(accentColor, 40)})`,
              }}
            />
          </div>

          {/* Stats grid */}
          <div className={`grid gap-6 md:gap-8 ${columnClass}`}>
            {stats.map((stat, index) => (
              <div
                key={index}
                className='group flex flex-col items-center text-center p-8 md:p-10 rounded-3xl transition-all duration-500 ease-out cursor-default'
                style={{
                  background: glassBackground,
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: `1px solid ${glassBorder}`,
                  boxShadow: `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)';
                  e.currentTarget.style.boxShadow = `0 8px 30px ${hexToRgba(accentColor, 0.12)}, 0 4px 12px rgba(0,0,0,0.06)`;
                  e.currentTarget.style.borderColor = hexToRgba(accentColor, 0.2);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)`;
                  e.currentTarget.style.borderColor = glassBorder;
                }}
              >
                {/* Stat value */}
                <div
                  className='text-6xl md:text-7xl font-black tracking-tight leading-none mb-4'
                  style={{ color: accentColor }}
                >
                  <EditableArrayText tag="span" value={stat.prefix} nodeId={id} arrayProp="stats" index={index} field="prefix" className='text-4xl md:text-5xl font-bold opacity-70' />
                  <EditableArrayText tag="span" value={stat.value} nodeId={id} arrayProp="stats" index={index} field="value" />
                  <EditableArrayText tag="span" value={stat.suffix} nodeId={id} arrayProp="stats" index={index} field="suffix" className='text-3xl md:text-4xl font-bold opacity-60' />
                </div>

                {/* Animated gradient line */}
                <div
                  className='w-16 h-[3px] rounded-full mb-5'
                  style={{
                    background: `linear-gradient(90deg, ${shiftColor(accentColor, 30)}, ${accentColor}, ${shiftColor(accentColor, -30)})`,
                    backgroundSize: '200% 100%',
                    animation: 'statsGradientSlide 3s ease infinite',
                    animationDelay: `${index * 0.4}s`,
                  }}
                />

                {/* Label */}
                <EditableArrayText tag="p" value={stat.label} nodeId={id} arrayProp="stats" index={index} field="label"
                  className='text-[11px] md:text-xs font-semibold uppercase tracking-[0.2em] leading-relaxed'
                  style={{ color: subtitleColor }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const clientDefaults = getPersonalizedDefaults(null);

StatsCounter.craft = {
  displayName: 'StatsCounter',
  props: {
    stats: [
      { value: '500', label: 'Vehículos vendidos', prefix: '', suffix: '+' },
      { value: '98', label: 'Satisfacción del cliente', prefix: '', suffix: '%' },
      { value: '10', label: 'Años de experiencia', prefix: '', suffix: '+' },
      { value: '24', label: 'Tiempo de respuesta', prefix: '', suffix: 'h' },
    ],
    bgColor: '#ffffff',
    textColor: '#111827',
    columns: 4,
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
  },
};
