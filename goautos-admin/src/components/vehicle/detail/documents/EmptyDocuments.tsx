
import React from 'react';
import { FileText } from 'lucide-react';

interface EmptyDocumentsProps {
  message?: string;
}

const EmptyDocuments: React.FC<EmptyDocumentsProps> = ({ 
  message = "No hay documentos cargados." 
}) => {
  return (
    <div className="text-center py-8 border rounded-lg">
      <FileText className="mx-auto h-6 w-6 text-muted-foreground mb-2" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default EmptyDocuments;
