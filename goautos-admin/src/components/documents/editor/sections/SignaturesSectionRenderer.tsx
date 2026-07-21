import React from 'react';
import { SignatureSlot } from '@/types/document-editor';

interface SignaturesSectionRendererProps {
  signatures: SignatureSlot[];
  overrides: Record<string, string | number>;
  marginTop?: number;
}

const SignaturesSectionRenderer: React.FC<SignaturesSectionRendererProps> = ({
  signatures,
  overrides,
  marginTop = 18,
}) => {
  const get = (key: string | undefined, original: string | undefined): string => {
    if (key && overrides[key] !== undefined) return String(overrides[key]);
    return original ?? '';
  };

  return (
    <div
      className="flex justify-between border-t border-[#cbd5e1] pt-4"
      style={{ marginTop }}
    >
      {signatures.map((sig, idx) => (
        <div key={idx} className="w-[45%] text-center">
          <div className="h-[35px] border-b border-[#94a3b8] mb-1.5" />
          <div className="text-[9pt] font-bold text-[#0f172a] mb-0.5">
            {get(sig.nameKey, sig.name)}
          </div>
          <div className="text-[8pt] text-[#64748b] mb-0.5">{sig.role}</div>
          {sig.id && (
            <div className="text-[7.5pt] text-[#94a3b8]">
              {get(sig.idKey, sig.id)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default SignaturesSectionRenderer;
