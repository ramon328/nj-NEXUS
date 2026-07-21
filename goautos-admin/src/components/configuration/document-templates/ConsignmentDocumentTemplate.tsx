import React, { useEffect } from 'react';
import { Client } from '@/types/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import ConsignmentNote from '@/components/documents/ConsignmentNote';
import useDocumentTemplate from '@/hooks/useDocumentTemplate';

interface LegalInfo {
  id?: number;
  company_name: string;
  rut: string;
  legal_representative: string;
  legal_address: string;
  client_id?: number;
}

interface ConsignmentDocumentTemplateProps {
  client: Client | null;
  legalInfo?: LegalInfo | null;
  editableText: {
    terminos_condiciones: string;
  };
  handleTextChange: (type: string, value: string) => void;
}

const ConsignmentDocumentTemplate: React.FC<
  ConsignmentDocumentTemplateProps
> = ({ client, legalInfo, editableText, handleTextChange }) => {
  const { template, loading } = useDocumentTemplate('consignment');

  useEffect(() => {
    if (!loading && template) {
      handleTextChange('terminos_condiciones', template.terms_and_conditions);
    }
  }, [template, loading]);

  // Establecer valores predeterminados si no están presentes
  useEffect(() => {
    if (!editableText.terminos_condiciones) {
      const defaultText = `
OBLIGACIONES DEL CONSIGNADOR:
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

      handleTextChange('terminos_condiciones', defaultText);
    }
  }, [client, legalInfo]);

  const LegalInfoAlert = () => {
    if (legalInfo) return null;

    return (
      <Alert className='mb-4 bg-amber-50 border-amber-300'>
        <AlertTriangle className='h-4 w-4 text-amber-500' />
        <AlertTitle>Información legal incompleta</AlertTitle>
        <AlertDescription>
          Para que este documento se genere correctamente, por favor complete la
          información legal en la sección de Configuración &gt; Información
          Legal.
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div>
      <LegalInfoAlert />

      <ConsignmentNote
        isEditable={true}
        client={client}
        legalInfo={legalInfo}
        editableText={{
          terminos_condiciones: editableText.terminos_condiciones,
        }}
        handleTextChange={handleTextChange}
      />
    </div>
  );
};

export default ConsignmentDocumentTemplate;
