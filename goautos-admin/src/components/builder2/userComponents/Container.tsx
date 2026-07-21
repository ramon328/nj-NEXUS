import React, { ReactNode } from 'react';
import { useNode } from '@craftjs/core';
import { DeleteButton } from '../DeleteButton';

type ContentAlign = 'stretch' | 'left' | 'center' | 'right';

interface ContainerProps {
  children?: ReactNode;
  background?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  shadow?: boolean;
  contentAlign?: ContentAlign;
  fullWidth?: boolean;
}

const ALIGN_MAP: Record<Exclude<ContentAlign, 'stretch'>, string> = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
};

export const Container = ({
  children,
  background = '#f5f5f5',
  padding = 20,
  margin = 0,
  borderRadius = 4,
  shadow = false,
  contentAlign = 'stretch',
  fullWidth = false,
}: ContainerProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  // Solo activamos flex cuando el usuario elige una alineación, para no alterar
  // el render de los contenedores existentes (que asumen flujo de bloque).
  const alignStyle =
    contentAlign && contentAlign !== 'stretch'
      ? { display: 'flex', flexDirection: 'column' as const, alignItems: ALIGN_MAP[contentAlign] }
      : {};

  // "Ancho completo": el contenido pega a los bordes laterales (sin padding
  // horizontal ni esquinas redondeadas). El padding vertical se conserva.
  const horizontalPadding = fullWidth ? 0 : padding;

  return (
    <div
      ref={connectors.connect}
      style={{
        paddingTop: `${padding}px`,
        paddingBottom: `${padding}px`,
        paddingLeft: `${horizontalPadding}px`,
        paddingRight: `${horizontalPadding}px`,
        background,
        minHeight: '80px',
        margin: `${margin}px 0`,
        borderRadius: fullWidth ? '0px' : `${borderRadius}px`,
        boxShadow: shadow ? '0 3px 6px rgba(0,0,0,0.1)' : 'none',
        position: 'relative',
        border: selected ? '2px dashed #666666' : '1px solid transparent',
        ...alignStyle,
      }}
    >
      {/* Botón de eliminar */}
      {selected && <DeleteButton nodeId={id} />}
      {children}
    </div>
  );
};

Container.craft = {
  displayName: 'Container',
  props: {
    background: '#f5f5f5',
    padding: 20,
    margin: 0,
    borderRadius: 4,
    shadow: false,
    contentAlign: 'stretch',
    fullWidth: false,
  },
  rules: { canDrop: () => true },
};
