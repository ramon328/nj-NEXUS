import React from 'react';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';
import { Client } from '@/types/client';

interface DemoBannerProps {
  client: Client;
}

const DemoBanner: React.FC<DemoBannerProps> = ({ client }) => {
  const createdDate = new Date(client.created_at);
  const now = new Date();
  const diffInDays = Math.floor(
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysLeft = Math.max(0, 3 - diffInDays);
  const isDemoExpired = diffInDays >= 3;

  const handleContact = () => {
    const message = isDemoExpired
      ? 'Hola, mi período de prueba ha expirado y me gustaría activar mi cuenta.'
      : 'Hola, estoy probando GoAuto y me gustaría obtener más información.';
    window.location.href = `https://wa.me/56989904038?text=${encodeURIComponent(
      message
    )}`;
  };

  if (isDemoExpired) {
    return (
      <div className='bg-red-500 text-white p-4'>
        <div className='container mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5' />
            <span>
              Tu período de prueba ha expirado. Contacta con GoAuto para
              continuar usando la plataforma.
            </span>
          </div>
          <Button variant='secondary' onClick={handleContact}>
            Contactar a GoAuto
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-blue-500 text-white p-4'>
      <div className='container mx-auto flex items-center justify-between'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5' />
            <span>
              Estás en modo demo. Te quedan {daysLeft} día
              {daysLeft !== 1 ? 's' : ''} de prueba.
            </span>
          </div>
          <span className='text-sm'>
            Tu web pública estará disponible en:{' '}
            <a
              href={`https://${client.domain}`}
              target='_blank'
              rel='noopener noreferrer'
              className='font-bold hover:text-white/90 underline'
            >
              {client.domain}
            </a>
          </span>
        </div>
        <Button variant='secondary' onClick={handleContact}>
          Contactar a GoAuto
        </Button>
      </div>
    </div>
  );
};

export default DemoBanner;
