
import React from 'react';

interface SignaturesSectionProps {
  customerName?: string;
  companyName?: string;
}

const SignaturesSection: React.FC<SignaturesSectionProps> = ({ 
  customerName = 'Cliente',
  companyName = 'Representante'
}) => {
  return (
    <div className="mt-8 pt-8 border-t border-gray-200">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="border-t border-black mt-16 w-48 mx-auto"></div>
          <p className="font-semibold mt-2">Firma {customerName}</p>
        </div>
        <div className="text-center">
          <div className="border-t border-black mt-16 w-48 mx-auto"></div>
          <p className="font-semibold mt-2">Firma {companyName}</p>
        </div>
      </div>
    </div>
  );
};

export default SignaturesSection;
