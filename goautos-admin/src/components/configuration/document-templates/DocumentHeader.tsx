import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Client } from '@/types/client';
import { Vehicle } from '@/types/vehicle';
import { LegalInfo } from '@/types/legalInfo';
import { formatRut } from '@/utils/rutFormatter';

interface DocumentHeaderProps {
  client: Client | null;
  vehicle?: Vehicle | null;
  documentType: string;
  documentNumber?: string;
  documentDate?: string;
  isEditable?: boolean;
  legalInfo?: LegalInfo | null; // NEW: legal_info específica a usar
}

const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  client,
  vehicle,
  documentType,
  documentNumber = '12345',
  documentDate,
  isEditable = false,
  legalInfo,
}) => {
  const { t } = useTranslation('vehicleDocuments');
  const [processedLogo, setProcessedLogo] = useState<string | null>(null);

  // Formato de fecha actual si no se proporciona una fecha específica
  const formattedDate = documentDate || new Date().toLocaleDateString();

  // Función para procesar SVG y convertirlo a base64 con dimensiones controladas
  const processSvgForPdf = async (svgUrl: string): Promise<string> => {
    try {
      const response = await fetch(svgUrl);
      const svgText = await response.text();

      // Crear un canvas para renderizar el SVG con dimensiones controladas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Dimensiones fijas para el PDF (80x24px)
      canvas.width = 80;
      canvas.height = 24;

      // Crear una imagen desde el SVG
      const img = new Image();
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);

      return new Promise((resolve, reject) => {
        img.onload = () => {
          // Limpiar el canvas
          ctx?.clearRect(0, 0, canvas.width, canvas.height);

          // Dibujar la imagen escalada al tamaño del canvas
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convertir a base64
          const dataURL = canvas.toDataURL('image/png');

          // Limpiar
          URL.revokeObjectURL(url);

          resolve(dataURL);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load SVG'));
        };

        img.src = url;
      });
    } catch (error) {
      console.error('Error processing SVG:', error);
      return svgUrl; // Fallback a la URL original
    }
  };

  // Procesar el logo cuando cambie
  useEffect(() => {
    if (client?.logo) {
      const logoUrl = client.logo;

      // Si es SVG, procesarlo especialmente
      if (logoUrl.toLowerCase().includes('.svg')) {
        processSvgForPdf(logoUrl)
          .then((processed) => {
            setProcessedLogo(processed);
          })
          .catch((error) => {
            console.error('Error processing SVG logo:', error);
            setProcessedLogo(logoUrl);
          });
      } else {
        // Para otros formatos, usar directamente
        setProcessedLogo(logoUrl);
      }
    }
  }, [client?.logo]);

  return (
    <div className='rounded-md p-2 mb-3 print:mb-2 print:p-1 bg-white'>
      {/* Top section with logo, company name and document info */}
      <div className='flex justify-between items-start mb-2 print:mb-1'>
        <div className='flex items-center gap-3'>
          <div className='w-20 h-6 flex items-center justify-center p-1 rounded-md bg-white'>
            {client?.logo ? (
              <img
                src={processedLogo || client.logo}
                alt={client.name}
                className='w-full h-full object-contain'
                style={{
                  maxWidth: '80px',
                  maxHeight: '24px',
                  width: 'auto',
                  height: 'auto',
                }}
                onError={(e) => {
                  console.error('Logo failed to load:', e);
                }}
              />
            ) : (
              <div className='w-full h-full flex items-center justify-center text-xs text-gray-400'>
                {t('header.logoPlaceholder')}
              </div>
            )}
          </div>
          <div>
            <h2 className='text-sm font-bold print:text-xs print:font-medium'>
              {isEditable
                ? vehicle?.brand?.name || vehicle?.brand_name || 'Marca'
                : legalInfo?.company_name ||
                  client?.name ||
                  'Tradecars'}
            </h2>
            <p className='text-xs text-gray-600'>
              RUT: {formatRut(legalInfo?.rut) || '-'}
            </p>
          </div>
        </div>

        <div className='text-right'>
          <h1 className='text-base font-semibold uppercase text-gray-800 print:text-xs print:font-normal'>
            {documentType}
          </h1>
          <p className='text-xs'>
            {t('header.number')} {documentNumber}
          </p>
          <p className='text-xs'>
            {t('header.date')} {formattedDate}
          </p>
        </div>
      </div>

      {/* Simple client info with title in bold followed by value */}
      {client && (
        <div className=''>
          <table className='w-full text-xs'>
            <tbody>
              <tr>
                <td className='p-1 w-1/6'>
                  <span className='font-bold'>{t('header.fields.rut')}</span>
                </td>
                <td className='p-1 w-1/3'>
                  {formatRut(legalInfo?.rut) || '-'}
                </td>
                <td className='p-1 w-1/6'>
                  <span className='font-bold'>{t('header.fields.phone')}</span>
                </td>
                <td className='p-1 w-1/3'>{client.contact?.phone || '-'}</td>
              </tr>
              <tr>
                <td className='p-1'>
                  <span className='font-bold'>{t('header.fields.email')}</span>
                </td>
                <td className='p-1'>{client.contact?.email || '-'}</td>
                <td className='p-1'>
                  <span className='font-bold'>{t('header.fields.web')}</span>
                </td>
                <td className='p-1'>{client.domain || '-'}</td>
              </tr>
              <tr>
                <td className='p-1'>
                  <span className='font-bold'>
                    {t('header.fields.address')}
                  </span>
                </td>
                <td className='p-1' colSpan={3}>
                  {legalInfo?.legal_address || '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DocumentHeader;
