import React from 'react';
import CloseBusinessDealNote from '@/components/documents/CloseBusinessDealNote';

interface CloseDealDocumentTemplateProps {
  client: any;
  legalInfo?: any;
  editableText: {
    terminos_condiciones: string;
  };
  handleTextChange: (type: string, value: string) => void;
}

const CloseDealDocumentTemplate: React.FC<CloseDealDocumentTemplateProps> = ({
  client,
  legalInfo,
  editableText,
  handleTextChange,
}) => {
  return (
    <div className='space-y-6'>
      <CloseBusinessDealNote
        isEditable={true}
        client={client}
        legalInfo={legalInfo}
        editableText={editableText}
        handleTextChange={handleTextChange}
        notes='Observaciones de ejemplo para la vista previa.'
        documentNumber='001'
        documentDate={new Date().toLocaleDateString('es-CL')}
        dealDetails={{
          finalSalePrice: 15000000,
          dealershipCommission: 1500000,
          paymentMethod: 'transferencia',
        }}
      />
    </div>
  );
};

export default CloseDealDocumentTemplate;
