import React from 'react';
import { useNode } from '@craftjs/core';

interface DividerProps {
  color?: string;
  thickness?: number;
  marginY?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  width?: string;
}

export const Divider = ({
  color = '#e5e7eb',
  thickness = 1,
  marginY = 16,
  style = 'solid',
  width = '100%',
}: DividerProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <div
      ref={connectors.connect}
      style={{
        padding: '4px 0',
        border: selected ? '1px dashed #1e88e5' : '1px solid transparent',
      }}
    >
      <hr
        style={{
          border: 'none',
          borderTop: `${thickness}px ${style} ${color}`,
          margin: `${marginY}px auto`,
          width,
        }}
      />
    </div>
  );
};

(Divider as any).craft = {
  displayName: 'Divider',
  props: {
    color: '#e5e7eb',
    thickness: 1,
    marginY: 16,
    style: 'solid',
    width: '100%',
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
