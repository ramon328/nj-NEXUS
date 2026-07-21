
import { useState, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { useTransactions } from '../../transactions/useTransactions';

export const useDocumentUpload = (vehicleId: number, onSuccess: () => void) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Guarda de re-entrancia: evita la doble inserción cuando el usuario hace doble
  // click (el botón quedaba habilitado hasta que isUploading cambiaba en el próximo render).
  const isSubmittingRef = useRef(false);

  const { uploadDocuments, addTransaction } = useTransactions({ id: vehicleId });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFiles(null);
  };

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;
    try {
      if (!title.trim()) {
        toast({
          title: "Error",
          description: "El título es obligatorio",
          variant: "destructive",
        });
        return;
      }

      if (!files || files.length === 0) {
        toast({
          title: "Error",
          description: "Debe seleccionar al menos un documento",
          variant: "destructive",
        });
        return;
      }

      isSubmittingRef.current = true;
      setIsUploading(true);

      // Upload files and get URLs
      const docUrls = await uploadDocuments(files);
      
      if (docUrls.length > 0) {
        // Add transaction (document record)
        const success = await addTransaction({
          title,
          description,
          type: 'document',
          amount: 0
        }, docUrls);
        
        if (success) {
          toast({
            title: "Éxito",
            description: "Documento agregado correctamente",
          });
          
          // Reset form
          resetForm();
          
          // Call success callback
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Error al agregar documento:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar el documento",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      isSubmittingRef.current = false;
    }
  };

  return {
    title,
    setTitle,
    description,
    setDescription,
    files,
    setFiles,
    isUploading,
    handleSubmit,
    resetForm
  };
};
