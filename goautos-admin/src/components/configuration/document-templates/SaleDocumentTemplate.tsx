import React, { useEffect, useState } from 'react';
import { Client } from '@/types/client';
import SaleNote from '@/components/documents/SaleNote';
import ExtraPageEditor from '@/components/configuration/document-templates/ExtraPageEditor';
import useDocumentTemplate from '@/hooks/useDocumentTemplate';
import { ExtraPageConfig } from '@/types/document-template';

interface SaleDocumentTemplateProps {
  client: Client | null;
  legalInfo?: any;
  editableText: {
    terms?: string;
    notes?: string;
    terminos_condiciones?: string;
    extra_page_config?: ExtraPageConfig;
  };
  handleTextChange: (type: string, value: string | ExtraPageConfig) => void;
}

const SaleDocumentTemplate: React.FC<SaleDocumentTemplateProps> = ({
  client,
  legalInfo,
  editableText,
  handleTextChange,
}) => {
  const { getExtraPageConfig, getTermsText, template } = useDocumentTemplate('sale');
  const [extraPageConfig, setExtraPageConfig] = useState<ExtraPageConfig>({
    enabled: false,
    files: [],
  });

  // Load extra page config on mount
  useEffect(() => {
    console.log('SaleDocumentTemplate: Loading config from template...');
    const config = getExtraPageConfig();
    console.log('Loaded config:', config);
    setExtraPageConfig(config);
    if (!editableText.extra_page_config) {
      handleTextChange('extra_page_config', config);
    }
  }, [template]);

  useEffect(() => {
    // Inicializar valores predeterminados si están vacíos
    if (!editableText.terms && !editableText.terminos_condiciones) {
      handleTextChange(
        editableText.terminos_condiciones ? 'terminos_condiciones' : 'terms',
        `Por el presente instrumento, el comprador se responsabiliza de cualquier siniestro, accidente, daño e indemnización de perjuicios que pudiere producirse a terceros, en su persona física o en sus bienes, con motivos del uso de la nota de venta individualizado más adelante, o cualquier otra persona que lo causarse, con o sin su consentimiento. Igual responsabilidad adquiere por las sanciones, penas o multas por infracciones del tránsito y autopistas concesionadas o de los reglamentos municipales. Esta nota de venta no es cancelable ni válida como factura y está sujeta a confirmación de la empresa.
Cancelación con documentos. Se hará efectiva la entrega sólo una vez hecho efectivo el cobro.Todo vehículo usado se entiende recibido a entrega satisfacción por el cliente, sin ulterior responsabilidad para el desistimiento de la compra por parte del cliente, facturará a la empresa para la no devolución del dinero dejado en garantía.
Toda la compra de la nota de venta con crédito directo, queda sujeto a constitución de prenda o prohibición de venta, cuyos gastos de tramite de alzamiento serán de cargo y responsabilidad del comprador.
La empresa no se responsabiliza sobre implicancias que tenga sobre el vehículo tanto en lo mecánico o eléctrico.`
      );
    }

    // Inicializar notas si están vacías
    if (!editableText.notes) {
      handleTextChange(
        'notes',
        `La entrega del vehículo se hará efectiva una vez verificados los pagos y completados los trámites necesarios.`
      );
    }
  }, [client]);

  return (
    <div className="space-y-6">
      <SaleNote
        isEditable={true}
        client={client}
        legalInfo={legalInfo}
        editableText={editableText}
        handleTextChange={handleTextChange}
      />

      {/* Extra Page Configuration */}
      <ExtraPageEditor
        config={extraPageConfig}
        templateType="sale"
        onChange={(config) => {
          setExtraPageConfig(config);
          handleTextChange('extra_page_config', config);
        }}
      />
    </div>
  );
};

export default SaleDocumentTemplate;
