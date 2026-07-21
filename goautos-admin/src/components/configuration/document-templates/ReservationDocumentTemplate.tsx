import React, { useEffect } from 'react';
import { Client } from '@/types/client';
import ReservationNote from '@/components/documents/ReservationNote';
import useDocumentTemplate from '@/hooks/useDocumentTemplate';

interface ReservationDocumentTemplateProps {
  client: Client | null;
  legalInfo?: any;
  editableText: {
    terminos_condiciones: string;
  };
  handleTextChange: (type: string, value: string) => void;
}

const ReservationDocumentTemplate: React.FC<
  ReservationDocumentTemplateProps
> = ({ client, legalInfo, editableText, handleTextChange }) => {
  const { template, loading } = useDocumentTemplate('reservation');

  useEffect(() => {
    if (!loading && template) {
      handleTextChange('terminos_condiciones', template.terms_and_conditions);
    }
  }, [template, loading]);

  useEffect(() => {
    if (!editableText.terminos_condiciones) {
      handleTextChange(
        'terminos_condiciones',
        `Esta reserva no es cancelable ni válida como factura y está sujeta a confirmación de la empresa.

Cancelación con documentos. Se hará efectiva la entrega sólo una vez hecho efectivo el cobro.
Todo reserva usado se entiende recibido a entrega satisfacción por el cliente, sin ulterior responsabilidad para el desistimiento de la compra por parte del cliente, facturará a la empresa para la no devolución del dinero dejado en garantía.

Toda la compra de la reserva con crédito directo, queda sujeto a constitución de prenda o prohibición de venta, cuyos gastos de tramite de alzamiento serán de cargo y responsabilidad del comprador.

La empresa no se responsabiliza sobre implicancias que tenga sobre el reserva tanto en lo mecánico o eléctrico.`
      );
    }
  }, []);

  return (
    <ReservationNote
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

export default ReservationDocumentTemplate;
