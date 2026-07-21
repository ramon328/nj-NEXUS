
import React from 'react';

interface StatusBadgeProps {
  status: string;
  color?: string | null;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  if (!hex || !hex.startsWith('#')) return null;
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  return { r, g, b };
};

// Oscurece un color para usarlo como texto (mejor legibilidad)
const darkenColor = (r: number, g: number, b: number, factor = 0.35): string => {
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
};

const StatusBadge = ({ status, color }: StatusBadgeProps) => {
  const baseClass = "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-nowrap text-xs font-semibold border";

  if (color) {
    const rgb = hexToRgb(color);
    if (rgb) {
      const { r, g, b } = rgb;
      return (
        <span
          className={baseClass}
          style={{
            backgroundColor: `rgba(${r}, ${g}, ${b}, 0.1)`,
            color: darkenColor(r, g, b),
            borderColor: `rgba(${r}, ${g}, ${b}, 0.3)`,
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {status}
        </span>
      );
    }
  }

  // Colores de respaldo si no hay color personalizado
  const fallbackDot: Record<string, string> = {
    'Disponible': 'bg-green-500',
    'Reservado': 'bg-yellow-500',
    'Vendido': 'bg-emerald-500',
  };
  const fallbackColors: Record<string, string> = {
    'Disponible': 'bg-green-50 text-green-700 border-green-200',
    'Reservado': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Vendido': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const colorClasses = fallbackColors[status] || 'bg-blue-50 text-blue-700 border-blue-200';
  const dotClass = fallbackDot[status] || 'bg-blue-500';

  return (
    <span className={`${baseClass} ${colorClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
      {status}
    </span>
  );
};

export default StatusBadge;
