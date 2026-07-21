import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type TemplateType =
  | 'sale'
  | 'purchase'
  | 'consignment'
  | 'reservation'
  | 'quotation';

interface TemplateBase {
  header_text?: string;
  footer_text?: string;
  logo_position: 'left' | 'center' | 'right';
  show_signature_lines: boolean;
  custom_css?: string;
  include_company_details: boolean;
  include_legal_text: boolean;
  notes?: string;
}

export interface SaleTemplate extends TemplateBase {
  show_price_breakdown: boolean;
  show_payment_details: boolean;
  terms_and_conditions?: string;
  warranty_text?: string;
}

export interface PurchaseTemplate extends TemplateBase {
  show_seller_details: boolean;
  show_purchase_conditions: boolean;
  purchase_terms?: string;
  seller_responsibilities?: string;
}

export interface ConsignmentTemplate extends TemplateBase {
  show_pricing_details: boolean;
  show_commission_structure: boolean;
  consignment_terms?: string;
  responsibilities_text?: string;
}

export interface ReservationTemplate extends TemplateBase {
  show_expiration_details: boolean;
  show_payment_instructions: boolean;
  reservation_terms?: string;
  cancellation_policy?: string;
}

export interface QuotationTemplate extends TemplateBase {
  show_validity_period: boolean;
  show_payment_options: boolean;
  quotation_terms?: string;
  validity_text?: string;
}

export interface DocumentTemplates {
  id?: number;
  client_id: number;
  sale_template?: SaleTemplate;
  purchase_template?: PurchaseTemplate;
  consignment_template?: ConsignmentTemplate;
  reservation_template?: ReservationTemplate;
  quotation_template?: QuotationTemplate;
  created_at?: string;
  updated_at?: string;
}

export const useDocumentTemplates = () => {
  const [templates, setTemplates] = useState<DocumentTemplates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { clientId } = useAuth();

  useEffect(() => {
    if (clientId) {
      fetchTemplates();
    }
  }, [clientId]);

  const fetchTemplates = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      // We need to use a different approach since the document_templates table doesn't exist yet
      // For now, we'll just create a default template

      // Mock templates for development until DB table is created
      const defaultTemplates: DocumentTemplates = {
        client_id: clientId,
        sale_template: getDefaultSaleTemplate(),
        purchase_template: getDefaultPurchaseTemplate(),
        consignment_template: getDefaultConsignmentTemplate(),
        reservation_template: getDefaultReservationTemplate(),
        quotation_template: getDefaultQuotationTemplate(),
      };

      setTemplates(defaultTemplates);
    } catch (err: any) {
      setError(err);
      console.error('Error fetching document templates:', err);

      // Create default templates if error
      setTemplates({
        client_id: clientId,
        sale_template: getDefaultSaleTemplate(),
        purchase_template: getDefaultPurchaseTemplate(),
        consignment_template: getDefaultConsignmentTemplate(),
        reservation_template: getDefaultReservationTemplate(),
        quotation_template: getDefaultQuotationTemplate(),
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (type: TemplateType, templateData: any) => {
    if (!clientId || !templates) return false;

    try {
      // For now, just update the local state since we don't have the database table yet
      setTemplates((prev) => {
        if (!prev)
          return {
            client_id: clientId,
            [`${type}_template`]: templateData,
          };

        return {
          ...prev,
          [`${type}_template`]: templateData,
        };
      });

      toast({
        title: 'Éxito',
        description: 'Plantilla actualizada correctamente',
      });

      return true;
    } catch (err: any) {
      setError(err);
      console.error('Error updating template:', err);

      toast({
        title: 'Error',
        description: 'No se pudo actualizar la plantilla',
        variant: 'destructive',
      });

      return false;
    }
  };

  // Default template generators
  const getDefaultSaleTemplate = (): SaleTemplate => ({
    header_text: 'NOTA DE VENTA',
    footer_text: 'Gracias por su compra',
    logo_position: 'left',
    show_signature_lines: true,
    include_company_details: true,
    include_legal_text: true,
    show_price_breakdown: true,
    show_payment_details: true,
    terms_and_conditions:
      'Por el presente instrumento, el comprador se responsabiliza de cualquier siniestro, accidente, daño e indemnización de perjuicios que pudiere producirse a terceros, en su persona física o en sus bienes, con motivos del uso de la nota de venta individualizado más adelante, o cualquier otra persona que lo causarse, con o sin su consentimiento. Igual responsabilidad adquiere por las sanciones, penas o multas por infracciones del tránsito y autopistas concesionadas o de los reglamentos municipales. Esta nota de venta no es cancelable ni válida como factura y está sujeta a confirmación de la empresa. Cancelación con documentos. Se hará efectiva la entrega sólo una vez hecho efectivo el cobro. Todo vehículo usado se entiende recibido a entrega satisfacción por el cliente, sin ulterior responsabilidad para el desistimiento de la compra por parte del cliente, facturará a la empresa para la no devolución del dinero dejado en garantía. Toda la compra de la nota de venta con crédito directo, queda sujeto a constitución de prenda o prohibición de venta, cuyos gastos de tramite de alzamiento serán de cargo y responsabilidad del comprador. La empresa no se responsabiliza sobre implicancias que tenga sobre el vehículo tanto en lo mecánico o eléctrico.',
    warranty_text:
      'La empresa no se responsabiliza sobre implicancias que tenga sobre el vehículo tanto en lo mecánico o eléctrico. Todo vehículo usado se entiende recibido a entera satisfacción por el cliente.',
    notes:
      'Esta nota de venta no es cancelable ni válida como factura y está sujeta a confirmación de la empresa. Cancelación con documentos: Se hará efectiva la entrega sólo una vez hecho efectivo el cobro.',
  });

  const getDefaultPurchaseTemplate = (): PurchaseTemplate => ({
    header_text: 'NOTA DE COMPRA',
    footer_text: 'Gracias por confiar en nosotros',
    logo_position: 'left',
    show_signature_lines: true,
    include_company_details: true,
    include_legal_text: true,
    show_seller_details: true,
    show_purchase_conditions: true,
    purchase_terms:
      'Por el presente instrumento, el vendedor declara que el vehículo es de su propiedad y está libre de gravámenes, prohibiciones, embargos y litigios. Además, certifica que todos los documentos presentados son auténticos y vigentes.',
    seller_responsibilities:
      'El vendedor se hace responsable de cualquier deuda, multa o gravamen que pese sobre el vehículo hasta la fecha de la transacción. Se compromete a realizar todos los trámites necesarios para la transferencia de propiedad.',
    notes:
      'Esta nota de compra es válida una vez verificados todos los documentos y realizada la inspección técnica del vehículo. El pago se realizará según las condiciones acordadas.',
  });

  const getDefaultConsignmentTemplate = (): ConsignmentTemplate => ({
    header_text: 'ACTA DE CONSIGNACIÓN',
    footer_text: 'Documento de consignación oficial',
    logo_position: 'left',
    show_signature_lines: true,
    include_company_details: true,
    include_legal_text: true,
    show_pricing_details: true,
    show_commission_structure: true,
    consignment_terms:
      'El propietario autoriza a la empresa para exhibir, promocionar y gestionar la venta del vehículo por un período de 60 días, renovable por acuerdo mutuo. La empresa no se hace responsable por daños o pérdidas durante el período de exhibición.',
    responsibilities_text:
      'El propietario certifica que el vehículo está libre de deudas, gravámenes y restricciones legales. Se compromete a mantener al día los documentos y permisos necesarios durante el período de consignación.',
    notes:
      'El precio de venta acordado podrá ser modificado únicamente con autorización escrita del propietario. La comisión por venta será calculada sobre el precio final de venta.',
  });

  const getDefaultReservationTemplate = (): ReservationTemplate => ({
    header_text: 'ACTA DE RESERVACIÓN',
    footer_text: 'Reserva sujeta a términos y condiciones',
    logo_position: 'left',
    show_signature_lines: true,
    include_company_details: true,
    include_legal_text: true,
    show_expiration_details: true,
    show_payment_instructions: true,
    reservation_terms:
      'La reserva tiene una validez de 5 días hábiles desde la fecha de emisión.',
    cancellation_policy:
      'La cancelación de la reserva está sujeta a las políticas de la empresa.',
    notes: 'Observaciones adicionales sobre la reserva.',
  });

  const getDefaultQuotationTemplate = (): QuotationTemplate => ({
    header_text: 'COTIZACIÓN',
    footer_text: 'Cotización válida por tiempo limitado',
    logo_position: 'left',
    show_signature_lines: true,
    include_company_details: true,
    include_legal_text: true,
    show_validity_period: true,
    show_payment_options: true,
    quotation_terms:
      'Los precios pueden variar según disponibilidad y condiciones del mercado.',
    validity_text:
      'Esta cotización es válida por 7 días desde la fecha de emisión.',
    notes: 'Observaciones adicionales sobre la cotización.',
  });

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    updateTemplate,
  };
};
