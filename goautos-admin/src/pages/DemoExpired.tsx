import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const DemoExpired: React.FC = () => {
  const { signOut } = useAuth();

  const handleContact = () => {
    const message =
      'Hola, mi período de prueba ha expirado y me gustaría activar mi cuenta.';
    window.location.href = `https://wa.me/56989904038?text=${encodeURIComponent(
      message
    )}`;
  };

  return (
    <div className='min-h-screen w-full flex items-center justify-center bg-slate-50'>
      <div className='w-full max-w-[600px] p-6'>
        <div className='bg-white rounded-2xl p-8 shadow-xl text-center'>
          <div className='flex justify-center mb-6'>
            <img
              src='/lovable-uploads/GOAUTO.LOGO.29.09.25.AZUL.png'
              alt='GoAuto Logo'
              className='h-12'
            />
          </div>

          <AlertTriangle className='h-16 w-16 text-red-500 mx-auto mb-6' />

          <h1 className='text-2xl font-semibold text-slate-900 mb-4'>
            Tu período de prueba ha expirado
          </h1>

          <p className='text-slate-600 mb-8'>
            Has alcanzado el límite de tu período de prueba gratuito. Para
            continuar usando GoAuto, por favor contacta con nuestro equipo para
            activar tu cuenta.
          </p>

          <div className='space-y-4'>
            <Button className='w-full' onClick={handleContact}>
              Contactar a GoAuto
            </Button>

            <Button
              variant='outline'
              className='w-full'
              onClick={() => signOut()}
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoExpired;
