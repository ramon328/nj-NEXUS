import React, { useState, lazy, Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';

// Lazy load the LocationPicker component
const LocationPicker = lazy(() => import('@/components/map/LocationPicker'));

type Location = {
  lat: number;
  lng: number;
  address: string;
};

type DealershipData = {
  dealerships: Array<{
    location: Location;
    phone: string;
    email: string;
  }>;
};

const DEFAULT_LOCATION: Location = {
  lat: -33.4022,
  lng: -70.5792,
  address: 'Las Condes, Región Metropolitana, Chile',
};

interface DealershipStepProps {
  onSubmit: (data: DealershipData) => void;
  initialData: DealershipData;
  onBack?: () => void;
}

export const DealershipStep: React.FC<DealershipStepProps> = ({
  onSubmit,
  initialData,
  onBack,
}) => {
  const { t } = useTranslation('auth');
  const [dealerships, setDealerships] = useState<DealershipData['dealerships']>(
    () => {
      if (initialData.dealerships.length > 0) {
        return initialData.dealerships.map((dealership) => ({
          ...dealership,
          location: {
            lat: dealership.location.lat || DEFAULT_LOCATION.lat,
            lng: dealership.location.lng || DEFAULT_LOCATION.lng,
            address: dealership.location.address || DEFAULT_LOCATION.address,
          },
        }));
      }
      return [
        {
          location: { ...DEFAULT_LOCATION },
          phone: '',
          email: '',
        },
      ];
    }
  );

  // Efecto para asegurar que las ubicaciones no se pierdan
  useEffect(() => {
    setDealerships((current) =>
      current.map((dealership) => ({
        ...dealership,
        location: {
          lat: dealership.location.lat || DEFAULT_LOCATION.lat,
          lng: dealership.location.lng || DEFAULT_LOCATION.lng,
          address: dealership.location.address || DEFAULT_LOCATION.address,
        },
      }))
    );
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validar que todas las ubicaciones sean válidas
    const isValid = dealerships.every(
      (d) => d.location.lat !== 0 && d.location.lng !== 0
    );

    if (!isValid) {
      toast({
        title: t('onboarding.dealerships.toasts.validationTitle'),
        description: t('onboarding.dealerships.toasts.validationDesc'),
        variant: 'destructive',
      });
      return;
    }
    onSubmit({ dealerships });
  };

  const handleLocationChange = (index: number, location: Location) => {
    console.log('Location changed for index', index, location);
    setDealerships((current) =>
      current.map((dealership, i) =>
        i === index
          ? {
              ...dealership,
              location: {
                lat: location.lat || dealership.location.lat,
                lng: location.lng || dealership.location.lng,
                address: location.address || dealership.location.address,
              },
            }
          : dealership
      )
    );
  };

  const handleInputChange = (
    index: number,
    field: 'phone' | 'email',
    value: string
  ) => {
    setDealerships((current) =>
      current.map((dealership, i) =>
        i === index
          ? {
              ...dealership,
              [field]: value,
            }
          : dealership
      )
    );
  };

  const addDealership = () => {
    setDealerships((current) => [
      ...current,
      {
        location: { ...DEFAULT_LOCATION },
        phone: '',
        email: '',
      },
    ]);
  };

  const removeDealership = (index: number) => {
    if (dealerships.length > 1) {
      setDealerships((current) => current.filter((_, i) => i !== index));
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='text-center mb-6'>
        <h2 className='text-2xl font-semibold text-slate-900'>{t('onboarding.dealerships.title')}</h2>
        <p className='text-slate-600 mt-2'>
          {t('onboarding.dealerships.subtitle')}
        </p>
      </div>

      <div className='space-y-8'>
        {dealerships.map((dealership, index) => (
          <div key={index} className='relative border rounded-lg p-6 bg-white'>
            {dealerships.length > 1 && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute right-2 top-2 text-red-500 hover:text-red-700'
                onClick={() => removeDealership(index)}
              >
                <Trash2 className='h-5 w-5' />
              </Button>
            )}

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Suspense
                    fallback={
                      <div className='w-full h-[300px] rounded-md border flex items-center justify-center'>
                        <Loader2 className='h-8 w-8 animate-spin text-gray-400' />
                      </div>
                    }
                  >
                    <LocationPicker
                      initialLocation={dealership.location}
                      onLocationChange={(location) =>
                        handleLocationChange(index, location)
                      }
                    />
                  </Suspense>
                </div>
              </div>

              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor={`phone-${index}`}>
                    {t('onboarding.dealerships.fields.phone')}
                  </Label>
                  <Input
                    id={`phone-${index}`}
                    type='tel'
                    value={dealership.phone}
                    onChange={(e) =>
                      handleInputChange(index, 'phone', e.target.value)
                    }
                    placeholder={t('onboarding.client.placeholders.phone')}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor={`email-${index}`}>{t('onboarding.dealerships.fields.email')}</Label>
                  <Input
                    id={`email-${index}`}
                    type='email'
                    value={dealership.email}
                    onChange={(e) =>
                      handleInputChange(index, 'email', e.target.value)
                    }
                    placeholder={t('onboarding.client.placeholders.email')}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='flex flex-col gap-4'>
        <Button
          type='button'
          variant='outline'
          className='w-full'
          onClick={addDealership}
        >
          <Plus className='h-4 w-4 mr-2' />
          {t('onboarding.dealerships.buttons.add')}
        </Button>

        <div className='flex gap-4'>
          {onBack && (
            <Button
              type='button'
              variant='outline'
              onClick={onBack}
              className='flex-1'
            >
            {t('onboarding.dealerships.buttons.back')}
          </Button>
        )}
          <Button type='submit' className='flex-1'>
            {t('onboarding.dealerships.buttons.continue')}
          </Button>
        </div>
      </div>
    </form>
  );
};
