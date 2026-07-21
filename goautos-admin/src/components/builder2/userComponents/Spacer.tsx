import React from 'react';
import { useNode, useEditor } from '@craftjs/core';

interface SpacerProps {
  height?: number;
}

export const Spacer = ({ height = 40 }: SpacerProps) => {
  const { connectors, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  const { isEnabled } = useEditor((state) => ({
    isEnabled: state.options.enabled,
  }));

  return (
    <div
      ref={connectors.connect}
      style={{
        height: `${height}px`,
        width: '100%',
        position: 'relative',
        border: selected
          ? '1px dashed #1e88e5'
          : isEnabled
          ? '1px dashed #d1d5db'
          : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isEnabled && (
        <span
          style={{
            fontSize: '11px',
            color: '#9ca3af',
            backgroundColor: '#f9fafb',
            padding: '2px 8px',
            borderRadius: '4px',
            userSelect: 'none',
          }}
        >
          {height}px
        </span>
      )}
    </div>
  );
};

(Spacer as any).craft = {
  displayName: 'Spacer',
  props: {
    height: 40,
  },
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
