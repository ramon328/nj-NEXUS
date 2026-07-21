import React from 'react';

interface SignatoryProps {
  name: string;
  subtitle?: string;
  extraInfo?: string;
}

interface DocumentSignaturesProps {
  leftSignatory: SignatoryProps;
  rightSignatory: SignatoryProps;
  signatureWidth?: number;
  className?: string;
}

const DocumentSignatures: React.FC<DocumentSignaturesProps> = ({
  leftSignatory,
  rightSignatory,
  signatureWidth = 250,
  className = '',
}) => {
  return (
    <div
      className={`pb-20 grid grid-cols-2 gap-16 mt-12 print:mt-8 print:gap-12 print:pb-16 text-center ${className}`}
    >
      <div>
        <div
          className='border-t border-black pt-2 mx-auto'
          style={{ width: `${signatureWidth}px` }}
        >
          <p className='font-semibold text-sm print:text-xs'>
            {leftSignatory.subtitle || ''}
          </p>
          <p className='text-sm print:text-xs'>{leftSignatory.name || ''}</p>
          {leftSignatory.extraInfo && (
            <p className='text-sm print:text-xs'>{leftSignatory.extraInfo}</p>
          )}
        </div>
      </div>
      <div>
        <div
          className='border-t border-black pt-2 mx-auto'
          style={{ width: `${signatureWidth}px` }}
        >
          <p className='font-semibold text-sm print:text-xs'>
            {rightSignatory.name}
          </p>
          <p className='text-sm print:text-xs'>
            {rightSignatory.subtitle || ''}
          </p>
          {rightSignatory.extraInfo && (
            <p className='text-sm print:text-xs'>{rightSignatory.extraInfo}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentSignatures;
