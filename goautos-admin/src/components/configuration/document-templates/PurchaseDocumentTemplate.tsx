import React, { useEffect } from 'react';
import { Client } from '@/types/client';
import PurchaseNote from '@/components/documents/PurchaseNote';

interface PurchaseDocumentTemplateProps {
  client: Client | null;
  editableText: {
    terms?: string;
    notes?: string;
    conditions?: string;
    paymentMethod?: string;
    terminos_condiciones?: string;
  };
  handleTextChange: (type: string, value: string) => void;
}

const PurchaseDocumentTemplate: React.FC<PurchaseDocumentTemplateProps> = ({
  client,
  editableText,
  handleTextChange,
}) => {
  useEffect(() => {
    // Inicializar valores predeterminados si están vacíos
    if (!editableText.terms && !editableText.terminos_condiciones) {
      handleTextChange(
        editableText.terminos_condiciones ? 'terminos_condiciones' : 'terms',
        `1. El vehículo se adquiere en las condiciones en que se encuentra, las cuales son conocidas y aceptadas por la empresa compradora.
2. El vendedor garantiza que el vehículo está libre de gravámenes y prohibiciones.
3. Todos los gastos de transferencia correrán por cuenta de la empresa compradora.
4. El vendedor se compromete a entregar toda la documentación necesaria para realizar la transferencia.
5. La empresa compradora se reserva el derecho de realizar una inspección técnica completa del vehículo antes de la compra definitiva.`
      );
    }

    if (!editableText.notes) {
      handleTextChange(
        'notes',
        `- El vehículo será inspeccionado por nuestro equipo técnico.
- Se realizará un peritaje completo para verificar su estado.
- El precio final puede ajustarse según el resultado de la evaluación técnica.
- La compra se formalizará una vez completada la inspección satisfactoria.`
      );
    }

    if (!editableText.conditions) {
      handleTextChange(
        'conditions',
        `La empresa compradora no se hace responsable por defectos ocultos que pudieran manifestarse con posterioridad a la compra, que no hayan sido detectables mediante una inspección visual y/o mecánica regular.

El vendedor declara que el vehículo se encuentra al día en sus permisos de circulación, revisión técnica y que no mantiene multas, infracciones o deudas de ningún tipo.

El kilometraje informado por el vendedor se considera como referencial, sin que esto constituya una garantía absoluta de su exactitud.`
      );
    }

    if (!editableText.paymentMethod) {
      handleTextChange('paymentMethod', `Transferencia bancaria`);
    }
  }, []);

  return (
    <PurchaseNote
      isEditable={true}
      client={client}
      editableText={editableText}
      handleTextChange={handleTextChange}
    />
  );
};

export default PurchaseDocumentTemplate;
