import React from 'react';
import { Badge } from '@/components/ui/badge';

// Interfaz sin comuna
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

interface PreviewTableProps {
  data: PreviewData[];
}

const PreviewTable = ({ data }: PreviewTableProps) => {
  return (
    <div className='border rounded-lg max-h-[50vh] overflow-auto'>
      <table className='w-full text-sm '>
        <thead className='bg-gray-50 sticky top-0 z-10'>
          <tr>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              RUT Comprador
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              Nombre Comprador
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              Email Comprador
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              RUT Vendedor
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              Nombre Vendedor
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              Email Vendedor
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              Marca
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              Modelo
            </th>

            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              Año
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              🤖 Categoría
            </th>
            <th className='px-4 py-3 text-left font-medium text-gray-500'>
              Precio
            </th>
          </tr>
        </thead>
        <tbody className='divide-y'>
          {data.map((row, index) => (
            <tr key={index}>
              <td className='px-4 py-3'>{row.rut_comprador}</td>
              <td className='px-4 py-3'>{row.nombre_comprador}</td>
              <td className='px-4 py-3'>{row.email_comprador}</td>
              <td className='px-4 py-3'>{row.rut_vendedor}</td>
              <td className='px-4 py-3'>{row.nombre_vendedor}</td>
              <td className='px-4 py-3'>{row.email_vendedor}</td>
              <td className='px-4 py-3'>{row.marca}</td>
              <td className='px-4 py-3'>{row.modelo}</td>
              <td className='px-4 py-3'>{row.ano}</td>
              <td className='px-4 py-3'>
                {row.categoria && row.categoria !== 'Sin categorizar' ? (
                  <Badge variant='default' className='text-xs'>
                    {row.categoria}
                  </Badge>
                ) : (
                  <Badge variant='outline' className='text-xs'>
                    Sin categorizar
                  </Badge>
                )}
              </td>
              <td className='px-4 py-3'>{row.precio}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PreviewTable;
