import React from 'react';
import { useNode } from '@craftjs/core';

interface HeadingProps {
  text?: string;
  level?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  color?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontWeight?: string;
}

export const Heading = ({
  text = 'Título de sección',
  level = 'h2',
  color = '#111827',
  textAlign = 'left',
  fontWeight = '700',
}: HeadingProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const sizeMap = {
    h1: 'text-4xl md:text-5xl',
    h2: 'text-3xl md:text-4xl',
    h3: 'text-2xl md:text-3xl',
    h4: 'text-xl md:text-2xl',
    h5: 'text-lg md:text-xl',
    h6: 'text-base md:text-lg',
  };

  const Tag = level;

  return (
    <div
      ref={connectors.connect}
      style={{
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
        padding: '4px',
      }}
    >
      <Tag
        className={`${sizeMap[level]} leading-tight`}
        style={{
          color,
          textAlign,
          fontWeight,
          margin: 0,
        }}
      >
        {text}
      </Tag>
    </div>
  );
};

(Heading as any).craft = {
  displayName: 'Heading',
  props: {
    text: 'Título de sección',
    level: 'h2',
    color: '#111827',
    textAlign: 'left',
    fontWeight: '700',
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
