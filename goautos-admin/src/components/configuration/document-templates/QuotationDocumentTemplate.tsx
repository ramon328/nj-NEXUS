import React, { useEffect } from 'react';
import { Client } from '@/types/client';
import QuotationNote from '@/components/documents/QuotationNote';
import useDocumentTemplate from '@/hooks/useDocumentTemplate';

interface QuotationDocumentTemplateProps {
  client: Client | null;
  legalInfo?: any;
  editableText: {
    terminos_condiciones: string;
  };
  handleTextChange: (type: string, value: string) => void;
}

const QuotationDocumentTemplate: React.FC<QuotationDocumentTemplateProps> = ({
  client,
  legalInfo,
  editableText,
  handleTextChange,
}) => {
  const { template, loading } = useDocumentTemplate('quotation');

  useEffect(() => {
    if (!loading && template) {
      handleTextChange('terminos_condiciones', template.terms_and_conditions);
    }
  }, [template, loading]);

  useEffect(() => {
    if (!editableText.terminos_condiciones) {
      handleTextChange(
        'terminos_condiciones',
        `Esta cotización no es válida como reserva.

Esta cotización es válida hasta la fecha de expiración indicada o hasta agotar stock.`
      );
    }
  }, []);

  return (
    <QuotationNote
      isEditable={true}
      client={client}
      legalInfo={legalInfo}
      editableText={{
        terminos_condiciones: editableText.terminos_condiciones,
      }}
      handleTextChange={handleTextChange}
    />
  );
};

export default QuotationDocumentTemplate;
