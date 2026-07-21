
import React from 'react';

interface TermsSectionProps {
  clientName?: string;
}

const TermsSection: React.FC<TermsSectionProps> = ({ clientName }) => {
  return (
    <div className="border rounded-lg p-4">
      <h4 className="font-semibold mb-2">6. Términos y Condiciones</h4>
      
      <ul className="list-disc pl-4 space-y-2 text-sm">
        <li>
          El propietario autoriza a {clientName || "la empresa"} a exhibir, 
          promocionar y vender el vehículo descrito.
        </li>
        <li>
          El periodo de consignación es de 30 días desde la fecha de este documento, 
          renovable automáticamente por periodos iguales.
        </li>
        <li>
          El propietario puede retirar el vehículo con un aviso previo de 7 días. En tal caso, 
          deberá pagar los costos asociados a la consignación.
        </li>
        <li>
          {clientName || "La empresa"} no se hace responsable por daños o deterioros normales 
          durante la exhibición del vehículo.
        </li>
        <li>
          Una vez vendido el vehículo, {clientName || "la empresa"} descontará su comisión 
          según lo acordado, entregando el saldo al propietario.
        </li>
      </ul>
    </div>
  );
};

export default TermsSection;
