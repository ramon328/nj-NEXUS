import React from 'react';
import { useNode } from '@craftjs/core';
import { DeleteButton } from '../DeleteButton';
import { EditableText } from '../EditableText';

export type TextAlignType = 'left' | 'center' | 'right' | 'justify';

interface TextProps {
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  textAlign?: TextAlignType;
  color?: string;
  background?: string;
  padding?: number;
  margin?: number;
}

export const Text = ({
  text = 'Edit me',
  fontSize = 16,
  fontWeight = 'normal',
  textAlign = 'left' as TextAlignType,
  color = '#000000',
  background = 'transparent',
  padding = 10,
  margin = 5,
}: TextProps) => {
  const { connectors, selected, id } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <div
      ref={connectors.connect}
      style={{
        padding: `${padding}px`,
        margin: `${margin}px 0`,
        background,
        borderRadius: '4px',
        border: selected ? '2px dashed #666666' : '1px dashed transparent',
        position: 'relative',
        transform: 'translateZ(0)',
      }}
    >
      {/* Botón de eliminar */}
      {selected && <DeleteButton nodeId={id} />}
      {/* Inline editing: el usuario escribe directo sobre el canvas */}
      <EditableText
        tag="p"
        value={text}
        nodeId={id}
        propName="text"
        style={{
          margin: 0,
          fontSize: `${fontSize}px`,
          fontWeight,
          textAlign,
          color,
        }}
      />
    </div>
  );
};

Text.craft = {
  displayName: 'Text',
  props: {
    text: 'Edit me',
    fontSize: 16,
    fontWeight: 'normal',
    textAlign: 'left',
    color: '#000000',
    background: 'transparent',
    padding: 10,
    margin: 5,
  },
};
