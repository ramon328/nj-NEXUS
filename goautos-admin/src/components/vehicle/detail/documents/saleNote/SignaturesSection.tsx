
import React from 'react';

interface SignaturesSectionProps {
  clientName: string | null;
  customerName: string | null;
}

const SignaturesSection = ({ clientName, customerName }: SignaturesSectionProps) => {
  return (
    <div className="grid grid-cols-2 gap-8 mt-12 text-center">
      <div>
        <div className="border-t border-gray-400 pt-2 mx-auto" style={{width: "250px"}}>
          {clientName || 'Empresa'}
        </div>
      </div>
      <div>
        <div className="border-t border-gray-400 pt-2 mx-auto" style={{width: "250px"}}>
          {customerName || 'Cliente'}
        </div>
      </div>
    </div>
  );
};

export default SignaturesSection;
