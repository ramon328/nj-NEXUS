import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Info, Brain } from 'lucide-react';
import PreviewTable from './PreviewTable';

interface PreviewData {
  codigo: string;
  rut_comprador: string;
  nombre_comprador: string;
  email_comprador: string;
  rut_vendedor: string;
  nombre_vendedor: string;
  email_vendedor: string;
  marca: string;
  modelo: string;
  precio: string;
  ano: string;
  categoria?: string;
}

interface FilePreviewProps {
  file: File;
  previewData: PreviewData[];
  totalRecords: number;
  categorizedCount: number;
  onChangeFile: () => void;
}

const FilePreview = ({
  file,
  previewData,
  totalRecords,
  categorizedCount,
  onChangeFile,
}: FilePreviewProps) => {
  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <FileSpreadsheet className='h-6 w-6 text-gray-400' />
          <div>
            <p className='font-medium'>{file.name}</p>
            <p className='text-sm text-gray-500'>
              Mostrando primeros {previewData.length} de {totalRecords}{' '}
              registros
            </p>
            {categorizedCount > 0 && (
              <div className='flex items-center space-x-2 mt-1'>
                <Brain className='h-4 w-4 text-green-500' />
                <p className='text-xs text-green-600'>
                  ✓ {categorizedCount} de {totalRecords} vehículos categorizados
                  automáticamente
                </p>
              </div>
            )}
          </div>
        </div>
        <Button variant='ghost' onClick={onChangeFile}>
          Cambiar archivo
        </Button>
      </div>

      <PreviewTable data={previewData} />

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3'>
          <Info className='h-5 w-5 text-blue-500 mt-0.5' />
          <div className='text-sm text-blue-700'>
            <p className='font-semibold mb-2'>Columnas requeridas:</p>
            <ul className='list-disc list-inside text-xs space-y-1'>
              <li>Código</li>
              <li>Rut comprador</li>
              <li>Nombre completo comprador</li>
              <li>Correo del comprador firmante</li>
              <li>Rut vendedor</li>
              <li>Nombre completo vendedor</li>
              <li>Correo del vendedor firmante</li>
              <li>Marca</li>
              <li>Modelo</li>
              <li>Año</li>
              <li>Precio</li>
            </ul>
          </div>
        </div>

        <div className='bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3'>
          <Brain className='h-5 w-5 text-green-500 mt-0.5' />
          <div className='text-sm text-green-700'>
            <p className='font-semibold mb-2'>🤖 Categorización con IA:</p>
            <ul className='text-xs space-y-1'>
              <li>✓ {categorizedCount} vehículos categorizados</li>
              <li>✓ Basado en las categorías de tu base de datos</li>
              <li className='text-green-600 font-medium mt-2'>
                Los embeddings se generarán automáticamente después de la
                importación
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
