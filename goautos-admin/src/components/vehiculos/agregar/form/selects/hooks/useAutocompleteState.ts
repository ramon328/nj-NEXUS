
import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';

export interface AutocompleteStateProps {
  name: string;
  form: UseFormReturn<any>;
  onChange?: (value: string) => void;
}

export const useAutocompleteState = ({ name, form, onChange }: AutocompleteStateProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingModelId, setPendingModelId] = useState<string | null>(null);

  // Effect to update the field value when pendingModelId is set
  useEffect(() => {
    if (pendingModelId && onChange) {
      console.log("Applying pending model ID:", pendingModelId);
      
      // Use a small delay to ensure the form control updates properly
      setTimeout(() => {
        onChange(pendingModelId);
        form.setValue(name, pendingModelId);
        
        // Open the popover briefly to show the selection
        setOpen(true);
        setTimeout(() => setOpen(false), 500);
        
        setPendingModelId(null);
      }, 200);
    }
  }, [pendingModelId, onChange, form, name]);

  return {
    open,
    setOpen,
    searchTerm,
    setSearchTerm,
    dialogOpen,
    setDialogOpen,
    pendingModelId,
    setPendingModelId,
  };
};
