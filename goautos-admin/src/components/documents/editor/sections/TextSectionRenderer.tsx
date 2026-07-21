import React from 'react';
import EditableTextArea from '../EditableTextArea';

interface TextSectionRendererProps {
  value: string;
  fieldKey: string;
  onFieldChange: (key: string, value: string) => void;
  isOverridden: boolean;
  fontSize?: number;
  className?: string;
}

const TextSectionRenderer: React.FC<TextSectionRendererProps> = ({
  value,
  fieldKey,
  onFieldChange,
  isOverridden,
  fontSize,
  className,
}) => {
  return (
    <EditableTextArea
      value={value}
      fieldKey={fieldKey}
      onSave={onFieldChange}
      isOverridden={isOverridden}
      fontSize={fontSize}
      className={className || 'text-[#475569] leading-relaxed text-justify'}
    />
  );
};

export default TextSectionRenderer;
