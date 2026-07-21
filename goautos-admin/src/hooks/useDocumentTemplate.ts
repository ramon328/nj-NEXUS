import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentTemplate, TemplateType, ExtraPageConfig, PDFLayoutConfig } from '@/types/document-template';

export const useDocumentTemplate = (templateType: TemplateType) => {
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { clientId } = useAuth();

  const getDefaultTermsAndConditions = (type: TemplateType): string => {
    switch (type) {
      case 'sale':
        return 'Por el presente instrumento, el comprador se responsabiliza de cualquier siniestro, accidente, daño e indemnización de perjuicios que pudiere producirse a terceros, en su persona física o en sus bienes, con motivos del uso de la nota de venta individualizado más adelante, o cualquier otra persona que lo causarse, con o sin su consentimiento. Igual responsabilidad adquiere por las sanciones, penas o multas por infracciones del tránsito y autopistas concesionadas o de los reglamentos municipales. Esta nota de venta no es cancelable ni válida como factura y está sujeta a confirmación de la empresa. Cancelación con documentos. Se hará efectiva la entrega sólo una vez hecho efectivo el cobro. Todo vehículo usado se entiende recibido a entrega satisfacción por el cliente, sin ulterior responsabilidad para el desistimiento de la compra por parte del cliente, facturará a la empresa para la no devolución del dinero dejado en garantía. Toda la compra de la nota de venta con crédito directo, queda sujeto a constitución de prenda o prohibición de venta, cuyos gastos de tramite de alzamiento serán de cargo y responsabilidad del comprador. La empresa no se responsabiliza sobre implicancias que tenga sobre el vehículo tanto en lo mecánico o eléctrico.';

      case 'purchase':
        return 'Por el presente instrumento, el vendedor declara que el vehículo es de su propiedad y está libre de gravámenes, prohibiciones, embargos y litigios. Además, certifica que todos los documentos presentados son auténticos y vigentes. El vendedor se hace responsable de cualquier deuda, multa o gravamen que pese sobre el vehículo hasta la fecha de la transacción. Se compromete a realizar todos los trámites necesarios para la transferencia de propiedad.';

      case 'consignment':
        return `OBLIGACIONES DEL CONSIGNADOR:
• Costear todos los gastos de reparación del vehículo dejado en consignación, siempre que este los necesite y con el fin de ser vendido aun mejor precio en el mercado. Dichos gastos serán debidamente informados por el consignatario al consignador, y una vez que este apruebe dichos gastos en forma expresa, estos serán realizados por el primero.
• Pagar los gastos de publicación del vehículo, monto que corresponde a $250.000, en caso de retirar el auto antes de su venta.
• Pagar el precio cobrado por el consignatario para la gestión de la venta del vehículo.
• Entregar el vehículo dado en consignación para su venta con toda la documentación requerida por la legislación vigente.
• Entregar el vehículo en perfectas condiciones mecánicas de uso, para ser puesto a la venta en forma inmediata. En caso de que no fuera así, o surgiera algún desperfecto mecánico luego de haber recibido el vehículo, se contactará a su propietario para informarle diagnóstico mecánico y valor de reparación de tal desperfecto.

OBLIGACIONES DEL CONSIGNATARIO:
• Realizar todas las gestiones necesarias para la venta del vehículo.
• Mantener el vehículo entregado en consignación limpio y en condiciones para la venta tal como fue recibido.
• Revisar de manera exhaustiva el vehículo y comprobar en las condiciones en que está siendo entregado, con el fin de dar tal información al Consignador.

COMISIÓN Y CONDICIONES:
La comisión cobrada por el consignatario es de un 6,00% del total del precio de venta del vehículo dado en consignación con un mínimo de $1.000.000, monto que podrá ser descontado directamente por este una vez producida la venta. El pago será efectivo dentro de los 7 días siguientes a la fecha de venta.

El consignador autoriza que su vehículo se muestre en las diferentes sucursales de la empresa.

A continuación se establece la siguiente observación técnica al vehículo: NINGUNA. Por el cual se fija como plazo de devolución en INDEFINIDO en caso de no ser solucionadas las observaciones señaladas.

AUTORIZACIONES Y CLÁUSULAS LEGALES:
En este acto autorizo a la empresa, para que en mi representación, venda el vehículo dejado en consignación, individualizado anteriormente en las condiciones establecidas también en este contrato y autorizo el traslado del vehículo a otra sucursal o taller mecánico en caso de ser necesario para su venta.

Las partes fijan domicilio en Santiago y someten desde ya cualquier controversia al conocimiento de los tribunales de justicia.

Se deja constancia que cualquier gravamen o prenda que afecte el vehículo, es de exclusiva responsabilidad del vendedor mandante, quedando libre de toda obligación el mandatario.

La forma no se responsabiliza por los daños derivados de casos fortuitos o de fuerza mayor NO contemplados en el seguro que ocurran dentro del local del mandante. Así como por las modificaciones sufridas en los parabrisas a causa de cambios de temperatura.

El mandante asegura y afirma que el kilometraje del vehículo ya estipulado anteriormente no ha sido adulterado y es original.

El mandante se compromete a no publicar el vehículo en ningún medio durante la permanencia de este en las dependencias de la empresa.

El mandante declara expresamente conocer y aceptar las condiciones de seguridad que mantiene la empresa.

La empresa se hace responsable de cualquier daño que se le haga al vehículo en consignación, además se deja constancia que el dueño entrega toda la documentación del vehículo al día.

TÉRMINOS ADICIONALES:
El presente contrato tendrá una duración de 60 días corridos, contados desde la fecha de su suscripción. 

RESPONSABILIDADES:
El consignatario se hará responsable del vehículo, respondiendo hasta por culpa leve en el cuidado del mismo. En caso de que el vehículo sufra daños mientras está bajo la custodia del consignatario, éste deberá responder por los mismos, salvo que se deban a fuerza mayor o caso fortuito debidamente comprobados.`;

      case 'reservation':
        return `Esta reserva no es cancelable ni válida como factura y está sujeta a confirmación de la empresa.

Cancelación con documentos. Se hará efectiva la entrega sólo una vez hecho efectivo el cobro.
Todo reserva usado se entiende recibido a entrega satisfacción por el cliente, sin ulterior responsabilidad para el desistimiento de la compra por parte del cliente, facturará a la empresa para la no devolución del dinero dejado en garantía.

Toda la compra de la reserva con crédito directo, queda sujeto a constitución de prenda o prohibición de venta, cuyos gastos de tramite de alzamiento serán de cargo y responsabilidad del comprador.

La empresa no se responsabiliza sobre implicancias que tenga sobre el reserva tanto en lo mecánico o eléctrico.`;

      case 'quotation':
        return `Esta cotización no es válida como reserva.

Esta cotización es válida hasta la fecha de expiración indicada o hasta agotar stock.`;

      default:
        return '';
    }
  };

  // Fetch template for the specific type
  useEffect(() => {
    if (clientId) {
      fetchTemplate();
    }
  }, [clientId, templateType]);

  const fetchTemplate = async () => {
    if (!clientId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('client_id', clientId)
        .eq('template_type', templateType)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setTemplate(data as DocumentTemplate);
      } else {
        // Create default template if none exists
        const defaultTemplate: DocumentTemplate = {
          client_id: clientId,
          template_type: templateType,
          terms_and_conditions: getDefaultTermsAndConditions(templateType),
        };

        const { data: newTemplate, error: createError } = await supabase
          .from('document_templates')
          .insert(defaultTemplate)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        setTemplate(newTemplate as DocumentTemplate);
      }
    } catch (err: any) {
      console.error(`Error fetching ${templateType} template:`, err);
      setError(err);

      // Set default template in state even if DB operation failed
      setTemplate({
        client_id: clientId,
        template_type: templateType,
        terms_and_conditions: getDefaultTermsAndConditions(templateType),
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (
    terms_and_conditions: string,
    extra_page_config?: ExtraPageConfig
  ) => {
    if (!clientId) return false;

    // Asegurarse de que no se guarde un valor vacío
    if (!terms_and_conditions || terms_and_conditions.trim() === '') {
      console.error('Error: Intentando guardar términos y condiciones vacíos');
      toast({
        title: 'Error',
        description: 'No se pueden guardar términos y condiciones vacíos',
        variant: 'destructive',
      });
      return false;
    }

    console.log('Guardando términos y condiciones:', terms_and_conditions);
    console.log('Extra page config:', extra_page_config);
    console.log('ID del template:', template?.id);
    console.log('Client ID:', clientId);
    console.log('Template type:', templateType);

    try {
      // Now save terms and extra_page_config in SEPARATE columns
      const updateData: any = {
        terms_and_conditions: terms_and_conditions, // Plain text only
        extra_page_config: extra_page_config || { enabled: false, files: [] }, // Separate column
        updated_at: new Date().toISOString(),
      };

      console.log('Saving separated data - terms:', terms_and_conditions);
      console.log('Saving separated data - extra_page_config:', updateData.extra_page_config);

      if (template?.id) {
        // Update existing template
        console.log('Actualizando template existente');
        const { error } = await supabase
          .from('document_templates')
          .update(updateData)
          .eq('id', template.id);

        console.log('Respuesta update, error:', error);

        if (error) {
          throw error;
        }
      } else {
        // Create new template if somehow it doesn't exist
        console.log('Creando nuevo template');
        const { data: insertedTemplate, error } = await supabase
          .from('document_templates')
          .insert({
            client_id: clientId,
            template_type: templateType,
            ...updateData,
          })
          .select()
          .single();

        console.log('Respuesta insert, error:', error);

        if (error) {
          throw error;
        }

        // Guardar el ID del template recién creado para evitar inserts duplicados
        if (insertedTemplate) {
          setTemplate(insertedTemplate as any);
          return true;
        }
      }

      // Update local state
      setTemplate((prev) => {
        if (prev) {
          return {
            ...prev,
            ...updateData,
          };
        } else {
          return {
            client_id: clientId,
            template_type: templateType,
            ...updateData,
          };
        }
      });

      console.log('Estado actualizado');

      toast({
        title: 'Éxito',
        description: 'Plantilla actualizada correctamente',
      });

      return true;
    } catch (err: any) {
      console.error('Error updating template:', err);
      setError(err);

      toast({
        title: 'Error',
        description: 'No se pudo actualizar la plantilla: ' + err.message,
        variant: 'destructive',
      });

      return false;
    }
  };

  // Helper function to extract extra page config from template
  const getExtraPageConfig = (): ExtraPageConfig => {
    // First, check if there's a separate extra_page_config column (new format)
    if (template && 'extra_page_config' in template && template.extra_page_config) {
      console.log('Loaded extra_page_config from separate column:', template.extra_page_config);
      return template.extra_page_config as ExtraPageConfig;
    }

    // Fallback: try to extract from terms_and_conditions (old format)
    if (!template?.terms_and_conditions) {
      return {
        enabled: false,
        files: [],
      };
    }

    try {
      // Try to parse as JSON (old combined format)
      const parsed = JSON.parse(template.terms_and_conditions);
      if (parsed.extra_page_config) {
        console.log('Loaded extra_page_config from terms_and_conditions (old format):', parsed.extra_page_config);
        return parsed.extra_page_config as ExtraPageConfig;
      }
      // Old format or plain text, no config
      return {
        enabled: false,
        files: [],
      };
    } catch (error) {
      // Not JSON, plain text format (old data)
      return {
        enabled: false,
        files: [],
      };
    }
  };

  // Helper function to extract terms from template
  const getTermsText = (): string => {
    if (!template?.terms_and_conditions) {
      return getDefaultTermsAndConditions(templateType);
    }

    try {
      // Try to parse as JSON (old combined format)
      const parsed = JSON.parse(template.terms_and_conditions);
      if (parsed.terms) {
        // Extract just the terms from the old combined format
        return parsed.terms;
      }
      // Fallback to full content if no 'terms' key
      return template.terms_and_conditions;
    } catch (error) {
      // Not JSON, return as-is (this is the normal case now)
      return template.terms_and_conditions;
    }
  };

  // Helper to get saved layout config from template
  const getLayoutConfig = (): Partial<PDFLayoutConfig> => {
    if (template && 'layout_config' in template && template.layout_config) {
      return template.layout_config as Partial<PDFLayoutConfig>;
    }
    return {};
  };

  // Save layout config as the default for this template type
  const saveLayoutConfig = async (config: PDFLayoutConfig): Promise<boolean> => {
    if (!clientId) return false;

    try {
      const updateData: any = {
        layout_config: config,
        updated_at: new Date().toISOString(),
      };

      if (template?.id) {
        const { error } = await supabase
          .from('document_templates')
          .update(updateData)
          .eq('id', template.id);

        if (error) throw error;
      } else {
        const { data: insertedTemplate, error } = await supabase
          .from('document_templates')
          .insert({
            client_id: clientId,
            template_type: templateType,
            terms_and_conditions: getDefaultTermsAndConditions(templateType),
            ...updateData,
          })
          .select()
          .single();

        if (error) throw error;

        if (insertedTemplate) {
          setTemplate(insertedTemplate as any);
          toast({ title: 'Éxito', description: 'Configuración de secciones guardada como plantilla' });
          return true;
        }
      }

      setTemplate((prev) => prev ? { ...prev, layout_config: config } : prev);

      toast({ title: 'Éxito', description: 'Configuración de secciones guardada como plantilla' });

      return true;
    } catch (err: any) {
      console.error('Error saving layout config:', err);

      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuración: ' + err.message,
        variant: 'destructive',
      });

      return false;
    }
  };

  return {
    template,
    loading,
    error,
    fetchTemplate,
    updateTemplate,
    getExtraPageConfig,
    getTermsText,
    getLayoutConfig,
    saveLayoutConfig,
  };
};

export default useDocumentTemplate;
