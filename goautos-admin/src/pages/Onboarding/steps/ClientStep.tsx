import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

type ClientData = {
  name: string;
  logoUrl: string;
  primaryColor: string;
  email: string;
  phone: string;
};

interface ClientStepProps {
  onSubmit: (data: ClientData) => void;
  initialData: ClientData;
  onBack?: () => void;
}

export const ClientStep: React.FC<ClientStepProps> = ({
  onSubmit,
  initialData,
  onBack,
}) => {
  const { t } = useTranslation('auth');
  const [formData, setFormData] = React.useState<ClientData>(initialData);
  const [isValidating, setIsValidating] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const validateClientName = async (name: string) => {
    const { data, error } = await supabase
      .from('clients')
      .select('name')
      .ilike('name', name)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is the "no rows returned" error
      toast({
        title: t('onboarding.client.toasts.validateErrorTitle'),
        description: t('onboarding.client.toasts.validateErrorDesc'),
        variant: 'destructive',
      });
      return false;
    }

    if (data) {
      setNameError(t('onboarding.client.toasts.nameUnavailableDesc'));
      return false;
    }

    setNameError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);

    try {
      const isNameValid = await validateClientName(formData.name);

      if (!isNameValid) {
        toast({
          title: t('onboarding.client.toasts.nameUnavailableTitle'),
          description: t('onboarding.client.toasts.nameUnavailableDesc'),
          variant: 'destructive',
        });
        return;
      }

      onSubmit(formData);
    } finally {
      setIsValidating(false);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear name error when user starts typing
    if (name === 'name') {
      setNameError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='text-center mb-6'>
        <h2 className='text-2xl font-semibold text-slate-900'>
          {t('onboarding.client.title')}
        </h2>
        <p className='text-slate-600 mt-2'>
          {t('onboarding.client.subtitle')}
        </p>
      </div>

      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label htmlFor='name'>{t('onboarding.client.fields.name')}</Label>
          <Input
            id='name'
            name='name'
            value={formData.name}
            onChange={handleChange}
            placeholder={t('onboarding.client.placeholders.name')}
            required
            className={nameError ? 'border-red-500' : ''}
          />
          {nameError && (
            <p className='text-sm text-red-500 mt-1'>{nameError}</p>
          )}
          <p className='text-sm text-slate-500'>
            {t('onboarding.client.fields.nameHelp')}
          </p>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='primaryColor'>{t('onboarding.client.fields.primaryColor')}</Label>
          <div className='flex gap-2'>
            <Input
              id='primaryColor'
              name='primaryColor'
              type='color'
              value={formData.primaryColor}
              onChange={handleChange}
              className='w-12 h-12 p-1'
              required
            />
            <Input
              value={formData.primaryColor}
              onChange={handleChange}
              name='primaryColor'
              placeholder={t('onboarding.client.placeholders.primaryColor')}
              className='flex-1'
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='email'>{t('onboarding.client.fields.email')}</Label>
          <Input
            id='email'
            name='email'
            type='email'
            value={formData.email}
            onChange={handleChange}
            placeholder={t('onboarding.client.placeholders.email')}
            required
          />
        </div>

        <div className='space-y-2'>
          <Label htmlFor='phone'>{t('onboarding.client.fields.phone')}</Label>
          <Input
            id='phone'
            name='phone'
            type='tel'
            value={formData.phone}
            onChange={handleChange}
            placeholder={t('onboarding.client.placeholders.phone')}
            required
          />
        </div>
      </div>

      <div className='flex gap-4'>
        {onBack && (
          <Button
            type='button'
            variant='outline'
            onClick={onBack}
            className='flex-1'
          >
            {t('onboarding.user.buttons.back')}
          </Button>
        )}
        <Button
          type='submit'
          className='flex-1'
          disabled={isValidating || !!nameError}
        >
          {isValidating
            ? t('onboarding.client.buttons.validating')
            : t('onboarding.dealerships.buttons.continue')}
        </Button>
      </div>
    </form>
  );
};
