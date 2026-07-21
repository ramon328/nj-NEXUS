import React from 'react';
import { useNode, useEditor } from '@craftjs/core';

interface ButtonProps {
  text?: string;
  link?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fontSize?: number;
  bgColor?: string;
  textColor?: string;
  borderRadius?: number;
  fullWidth?: boolean | string;
  align?: 'left' | 'center' | 'right';
}

export const Button = ({
  text = 'Click aquí',
  link = '#',
  variant = 'primary',
  size = 'md',
  fontSize = 16,
  bgColor = '#3b82f6',
  textColor = '#ffffff',
  borderRadius = 8,
  fullWidth = false,
  align = 'left',
}: ButtonProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  // Acepta booleano nuevo o el string 'true'/'false' que guardaban versiones viejas.
  const isFullWidth = fullWidth === true || fullWidth === 'true';

  // "size" controla SOLO el relleno (padding). El tamaño del texto es aparte (fontSize).
  const paddingClasses = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3',
    lg: 'px-8 py-4',
  };

  const getStyles = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      borderRadius: `${borderRadius}px`,
      fontSize: `${fontSize}px`,
      transition: 'all 0.2s ease',
      cursor: isEnabled ? 'move' : 'pointer',
      display: isFullWidth ? 'block' : 'inline-block',
      width: isFullWidth ? '100%' : 'auto',
      textAlign: 'center',
      fontWeight: 600,
      textDecoration: 'none',
      border: '2px solid transparent',
    };

    switch (variant) {
      case 'secondary':
        return { ...base, backgroundColor: `${bgColor}15`, color: bgColor };
      case 'outline':
        return { ...base, backgroundColor: 'transparent', color: bgColor, borderColor: bgColor };
      case 'ghost':
        return { ...base, backgroundColor: 'transparent', color: bgColor };
      case 'primary':
      default:
        return { ...base, backgroundColor: bgColor, color: textColor };
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isEnabled) {
      e.preventDefault();
      return;
    }
    if (link && link !== '#') {
      if (link.startsWith('http')) {
        window.open(link, '_blank');
      } else {
        window.location.href = link;
      }
    }
  };

  return (
    <div
      ref={connectors.connect}
      style={{
        width: '100%',
        textAlign: align,
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
        padding: '2px',
      }}
    >
      <button
        className={`${paddingClasses[size]} hover:opacity-90 hover:shadow-md`}
        style={getStyles()}
        onClick={handleClick}
      >
        {text}
      </button>
    </div>
  );
};

(Button as any).craft = {
  displayName: 'Button',
  props: {
    text: 'Click aquí',
    link: '#',
    variant: 'primary',
    size: 'md',
    fontSize: 16,
    bgColor: '#3b82f6',
    textColor: '#ffffff',
    borderRadius: 8,
    fullWidth: false,
    align: 'left',
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
