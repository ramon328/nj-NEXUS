import React, { ReactNode } from 'react';
import { useNode, useEditor } from '@craftjs/core';
import { DeleteButton } from '../DeleteButton';

type Align = 'stretch' | 'start' | 'center' | 'end';

interface GridProps {
  children?: ReactNode;
  columns?: number;
  gap?: number;
  rowMinHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  background?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  justifyItems?: Align;
  alignItems?: Align;
}

// Grilla auto-flujo: defines columnas y los componentes que sueltas adentro
// (imágenes, texto, botones, etc.) se acomodan solos en orden. Las filas crecen
// automáticamente. Es un canvas de CraftJS (canDrop), igual que el Contenedor.
export const Grid = ({
  children,
  columns = 3,
  gap = 16,
  rowMinHeight = 100,
  maxWidth = 0,
  maxHeight = 0,
  background = 'transparent',
  padding = 16,
  margin = 0,
  borderRadius = 0,
  justifyItems = 'stretch',
  alignItems = 'stretch',
}: GridProps) => {
  const { connectors, selected, id, isEmpty } = useNode((node) => ({
    selected: node.events.selected,
    isEmpty: !node.data.nodes || node.data.nodes.length === 0,
  }));
  const { enabled } = useEditor((s) => ({ enabled: s.options.enabled }));

  const cols = Math.max(1, Math.min(12, Number(columns) || 1));

  // 0 = sin límite. Con ancho máximo, además centramos la grilla (margin auto
  // a los lados). Con alto máximo, dejamos scroll vertical si el contenido pasa.
  const maxW = Number(maxWidth) || 0;
  const maxH = Number(maxHeight) || 0;

  return (
    <div
      ref={connectors.connect}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridAutoRows: `minmax(${rowMinHeight}px, auto)`,
        gap: `${gap}px`,
        background,
        padding: `${padding}px`,
        margin: maxW > 0 ? `${margin}px auto` : `${margin}px 0`,
        ...(maxW > 0 ? { maxWidth: `${maxW}px`, width: '100%' } : {}),
        ...(maxH > 0 ? { maxHeight: `${maxH}px`, overflowY: 'auto' as const } : {}),
        borderRadius: `${borderRadius}px`,
        justifyItems,
        alignItems,
        minHeight: '80px',
        position: 'relative',
        border: selected ? '2px dashed #666666' : '1px solid transparent',
      }}
    >
      {selected && <DeleteButton nodeId={id} />}
      {children}
      {enabled && isEmpty && (
        <div
          style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: `${rowMinHeight}px`,
            color: '#9ca3af',
            fontSize: '13px',
            border: '2px dashed #d1d5db',
            borderRadius: '8px',
            pointerEvents: 'none',
            textAlign: 'center',
            padding: '12px',
          }}
        >
          Grilla de {cols} columna{cols > 1 ? 's' : ''} — arrastra aquí imágenes, texto o botones
        </div>
      )}
    </div>
  );
};

Grid.craft = {
  displayName: 'Grid',
  props: {
    columns: 3,
    gap: 16,
    rowMinHeight: 100,
    maxWidth: 0,
    maxHeight: 0,
    background: 'transparent',
    padding: 16,
    margin: 0,
    borderRadius: 0,
    justifyItems: 'stretch',
    alignItems: 'stretch',
  },
  rules: { canDrop: () => true },
};
