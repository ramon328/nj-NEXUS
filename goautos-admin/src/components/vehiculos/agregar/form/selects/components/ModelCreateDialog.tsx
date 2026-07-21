
import React from 'react';
import CreateItemDialog from '../../dialog/CreateItemDialog';

interface ModelCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemCreated: (id: string) => void;
  label: string;
  brandId: string | null;
  onModelCreated?: () => Promise<void>;
}

const ModelCreateDialog: React.FC<ModelCreateDialogProps> = ({
  open,
  onOpenChange,
  onItemCreated,
  label,
  brandId,
  onModelCreated
}) => {
  return (
    <CreateItemDialog
      open={open}
      onOpenChange={onOpenChange}
      onItemCreated={onItemCreated}
      itemType={label}
      brandId={brandId}
      isModelSelect={true}
      onModelCreated={onModelCreated}
    />
  );
};

export default ModelCreateDialog;
