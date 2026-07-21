import React from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { DeleteButton } from '../../DeleteButton';
import { EditableArrayText } from '../../EditableText';
import { getPersonalizedDefaults } from '@/utils/clientDefaults';
import { useAuth } from '@/contexts/AuthContext';

interface StatItem {
  value: string;
  suffix: string;
  label: string;
}

interface StatsModernoProps {
  stats?: StatItem[];
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
}

export const StatsModerno = ({
  stats = [
    { value: '500', suffix: '+', label: 'Vehículos vendidos' },
    { value: '2,000', suffix: '+', label: 'Clientes satisfechos' },
    { value: '15', suffix: '+', label: 'Años de experiencia' },
    { value: '4.9', suffix: '★', label: 'Rating en Google' },
  ],
  bgColor = '#ffffff',
  textColor = '#0f172a',
  accentColor = '#3b82f6',
}: StatsModernoProps) => {
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
        borderTop: `1px solid ${hexToRgba(textColor, 0.06)}`,
        borderBottom: `1px solid ${hexToRgba(textColor, 0.06)}`,
      }}
      className="w-full"
    >
      {selected && isEnabled && <DeleteButton nodeId={id} />}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="flex flex-wrap justify-center gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <div key={i} className="text-center min-w-[140px]">
              <div
                className="text-[2.5rem] sm:text-[3.5rem] font-semibold tracking-tight leading-none"
                style={{ color: textColor }}
              >
                <EditableArrayText tag="span" value={stat.value} nodeId={id} arrayProp="stats" index={i} field="value" />
                <EditableArrayText tag="span" value={stat.suffix} nodeId={id} arrayProp="stats" index={i} field="suffix" style={{ color: finalAccent }} />
              </div>
              <EditableArrayText
                tag="div"
                value={stat.label}
                nodeId={id}
                arrayProp="stats"
                index={i}
                field="label"
                className="text-[15px] mt-2"
                style={{ color: hexToRgba(textColor, 0.5) }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return `rgba(0,0,0,${alpha})`;
  const num = parseInt(clean, 16);
  return `rgba(${(num >> 16) & 0xff},${(num >> 8) & 0xff},${num & 0xff},${alpha})`;
}

StatsModerno.craft = {
  displayName: 'StatsModerno',
  props: {
    stats: [
      { value: '500', suffix: '+', label: 'Vehículos vendidos' },
      { value: '2,000', suffix: '+', label: 'Clientes satisfechos' },
      { value: '15', suffix: '+', label: 'Años de experiencia' },
      { value: '4.9', suffix: '★', label: 'Rating en Google' },
    ],
    bgColor: '#ffffff',
    textColor: '#0f172a',
    accentColor: '#3b82f6',
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => false,
  },
};
