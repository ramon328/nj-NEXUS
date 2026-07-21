import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

type OnboardingData = {
  userProfile: {
    firstName: string;
    lastName: string;
    email: string;
  };
  companyInfo: {
    name: string;
    logoUrl: string;
    primaryColor: string;
    email: string;
    phone: string;
  };
  location: {
    lat: number;
    lng: number;
    address: string;
    phone: string;
    email: string;
  };
  password: {
    password: string;
  };
};

interface SummaryStepProps {
  onSubmit: () => void;
  data: OnboardingData;
  onBack?: () => void;
}

export const SummaryStep: React.FC<SummaryStepProps> = ({
  onSubmit,
  data,
  onBack,
}) => {
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await onSubmit();
    } finally {
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className='flex flex-col items-center justify-center space-y-4 py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-blue-500' />
        <p className='text-lg font-medium text-slate-900'>
          Creando tu cuenta...
        </p>
        <p className='text-sm text-slate-600'>Esto tomará solo unos segundos</p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center space-x-4 mb-8'>
        <div className='flex items-center justify-center w-12 h-12 border border-gray-300 rounded-full flex-shrink-0'>
          <svg
            className='w-6 h-6 text-gray-700'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
        </div>
        <div className='flex-1'>
          <h2 className='text-2xl font-semibold text-slate-900 mb-2'>
            Resumen del registro
          </h2>
          <p className='text-slate-600'>Mira toda tu información</p>
        </div>
      </div>

      {/* Summary */}
      <div className='space-y-6'>
        <p className='text-sm text-slate-600 mb-6'>
          Revisa la información ingresada antes de finalizar el registro
        </p>

        {/* User Profile Section */}
        <div className='bg-gray-50 rounded-lg p-4'>
          <h3 className='text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2'>
            <svg
              className='w-5 h-5 text-blue-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
              />
            </svg>
            Perfil de Usuario
          </h3>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div>
              <span className='font-medium text-slate-700'>Nombre:</span>
              <p className='text-slate-600'>{data.userProfile.firstName}</p>
            </div>
            <div>
              <span className='font-medium text-slate-700'>Apellido:</span>
              <p className='text-slate-600'>{data.userProfile.lastName}</p>
            </div>
            <div className='col-span-2'>
              <span className='font-medium text-slate-700'>Email:</span>
              <p className='text-slate-600'>{data.userProfile.email}</p>
            </div>
          </div>
        </div>

        {/* Company Info Section */}
        <div className='bg-gray-50 rounded-lg p-4'>
          <h3 className='text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2'>
            <svg
              className='w-5 h-5 text-blue-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
              />
            </svg>
            Información de la Automotora
          </h3>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div className='col-span-2'>
              <span className='font-medium text-slate-700'>Nombre:</span>
              <p className='text-slate-600'>{data.companyInfo.name}</p>
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-medium text-slate-700'>
                Color Principal:
              </span>
              <div className='flex items-center gap-2'>
                <div
                  className='w-4 h-4 rounded border'
                  style={{ backgroundColor: data.companyInfo.primaryColor }}
                />
                <p className='text-slate-600'>
                  {data.companyInfo.primaryColor}
                </p>
              </div>
            </div>
            <div>
              <span className='font-medium text-slate-700'>Email:</span>
              <p className='text-slate-600'>{data.companyInfo.email}</p>
            </div>
            <div>
              <span className='font-medium text-slate-700'>Teléfono:</span>
              <p className='text-slate-600'>{data.companyInfo.phone}</p>
            </div>
          </div>
        </div>

        {/* Location Section */}
        <div className='bg-gray-50 rounded-lg p-4'>
          <h3 className='text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2'>
            <svg
              className='w-5 h-5 text-blue-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z'
              />
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 11a3 3 0 11-6 0 3 3 0 016 0z'
              />
            </svg>
            Ubicación
          </h3>
          <div className='space-y-3 text-sm'>
            <div>
              <span className='font-medium text-slate-700'>Dirección:</span>
              <p className='text-slate-600'>{data.location.address}</p>
            </div>
            {(data.location.phone || data.location.email) && (
              <div className='grid grid-cols-2 gap-4'>
                {data.location.phone && (
                  <div>
                    <span className='font-medium text-slate-700'>
                      Teléfono:
                    </span>
                    <p className='text-slate-600'>{data.location.phone}</p>
                  </div>
                )}
                {data.location.email && (
                  <div>
                    <span className='font-medium text-slate-700'>Email:</span>
                    <p className='text-slate-600'>{data.location.email}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Password Section */}
        <div className='bg-gray-50 rounded-lg p-4'>
          <h3 className='text-lg font-semibold text-slate-900 mb-3 flex items-center gap-2'>
            <svg
              className='w-5 h-5 text-blue-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
              />
            </svg>
            Contraseña
          </h3>
          <div className='text-sm'>
            <span className='font-medium text-slate-700'>Contraseña:</span>
            <p className='text-slate-600'>••••••••</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <form onSubmit={handleSubmit}>
        <div className='flex justify-between pt-6'>
          <Button
            type='button'
            variant='ghost'
            onClick={onBack}
            disabled={isCreating}
            className='flex items-center gap-2 text-slate-600 hover:text-slate-900'
          >
            <svg
              className='w-4 h-4'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M15 19l-7-7 7-7'
              />
            </svg>
            Anterior
          </Button>

          <Button
            type='submit'
            disabled={isCreating}
            className='bg-primary hover:bg-primary/90 text-white px-8 py-2 rounded-lg flex items-center gap-2'
          >
            {isCreating ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                Creando cuenta...
              </>
            ) : (
              <>
                Crear cuenta
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};
