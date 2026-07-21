import React from 'react';
import { useNode } from '@craftjs/core';
import { DeleteButton } from '../DeleteButton';

interface ImageProps {
  src?: string;
  alt?: string;
  width?: string;
  height?: string;
  padding?: number;
  margin?: number;
  borderRadius?: number;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  align?: 'left' | 'center' | 'right';
}

export const Image = ({
  src = 'https://via.placeholder.com/300x200',
  alt = 'Image',
  width = '100%',
  height = 'auto',
  padding = 0,
  margin = 0,
  borderRadius = 4,
  objectFit = 'cover',
  align = 'left',
}: ImageProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  // Alinea la imagen cuando su ancho es menor a 100%
  const marginLeft = align === 'left' ? '0' : 'auto';
  const marginRight = align === 'right' ? '0' : 'auto';

  return (
    <div
      ref={connectors.connect}
      style={{
        padding: `${padding}px`,
        margin: `${margin}px 0`,
        borderRadius: `${borderRadius}px`,
        border: selected ? '2px dashed #666666' : 'none',
        position: 'relative',
        transform: 'translateZ(0)',
      }}
    >
      {/* Botón de eliminar */}
      {selected && <DeleteButton nodeId={id} />}
      <img
        src={src}
        alt={alt}
        style={{
          width,
          height,
          display: 'block',
          marginLeft,
          marginRight,
          borderRadius: `${borderRadius}px`,
          objectFit,
        }}
      />
    </div>
  );
};

Image.craft = {
  displayName: 'Image',
  props: {
    src: 'https://via.placeholder.com/300x200',
    alt: 'Image',
    width: '100%',
    height: 'auto',
    padding: 0,
    margin: 0,
    borderRadius: 4,
    objectFit: 'cover',
    align: 'left',
  },
};
