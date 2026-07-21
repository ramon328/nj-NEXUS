
import React from 'react';

interface SignaturesSectionProps {
  companyName: string;
  sellerName: string;
}

const SignaturesSection: React.FC<SignaturesSectionProps> = ({ 
  companyName, 
  sellerName 
}) => {
  const formattedTotal = "14.990.000"; // This would normally be calculated

  return (
    <div className="mt-10">
      <div className="border border-gray-200 rounded-lg p-4 mb-10 text-center">
        <p>
          Acepto la suma indicada (${formattedTotal}) en TRANSFERENCIA MASIVA a mi entera satisfacción y sin ningún tipo de reparo posterior.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-10 mt-16">
        <div className="text-center">
          <div className="border-t border-gray-400 mt-8 pt-2">
            {companyName}
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 mt-8 pt-2">
            {sellerName}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignaturesSection;
