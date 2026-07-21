import React from 'react';

interface TermsSectionProps {
  clientName: string | null;
}

const TermsSection = ({ clientName }: TermsSectionProps) => {
  return (
    <div className='text-sm text-gray-600 space-y-4 mb-6'>
      <p>
        Por el presente instrumento, el comprador se responsabiliza de cualquier
        siniestro, accidente, daño e indemnización de perjuicios que pudiere
        producirse a terceros, en su persona física o en sus bienes, con motivos
        del uso de la nota de venta individualizado más adelante, o cualquier
        otra persona que lo causarse, con o sin su consentimiento. Igual
        responsabilidad adquiere por las sanciones, penas o multas por
        infracciones del tránsito y autopistas concesionadas o de los
        reglamentos municipales.
      </p>
      <p>
        Esta nota de venta no es cancelable ni válida como factura y está sujeta
        a confirmación de la empresa.
      </p>
      <p>
        Cancelación con documentos. Se hará efectiva la entrega sólo una vez
        hecho efectivo el cobro.{clientName ? ` ${clientName}.` : ''}
      </p>
      <p>
        Todo vehículo usado se entiende recibido a entrega satisfacción por el
        cliente, sin ulterior responsabilidad para el desistimiento de la compra
        por parte del cliente, facturará a la empresa para la no devolución del
        dinero dejado en garantía.
      </p>
      <p>
        Toda la compra de la nota de venta con crédito directo, queda sujeto a
        constitución de prenda o prohibición de venta, cuyos gastos de tramite
        de alzamiento serán de cargo y responsabilidad del comprador.
      </p>
      <p>
        La empresa no se responsabiliza sobre implicancias que tenga sobre el
        vehículo tanto en lo mecánico o eléctrico.
      </p>
    </div>
  );
};

export default TermsSection;
