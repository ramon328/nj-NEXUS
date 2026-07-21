import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

type UserData = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

interface UserStepProps {
  onSubmit: (data: UserData) => void;
  initialData: UserData;
  onBack?: () => void;
}

export const UserStep: React.FC<UserStepProps> = ({
  onSubmit,
  initialData,
  onBack,
}) => {
  const { t } = useTranslation('auth');
  const [formData, setFormData] = React.useState<UserData>(initialData);
  const [isValidating, setIsValidating] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateUserEmail = async (email: string) => {
    // Si el email contiene un +, omitimos la validación
    if (email.includes('+')) {
      setEmailError(null);
      return true;
    }

    try {
      // Solo verificamos en la tabla users
      const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('email', email.toLowerCase())
        .maybeSingle(); // Usar maybeSingle en lugar de single para evitar errores cuando no hay resultados

      if (error) {
        console.error('Error validating email:', error);
        toast({
          title: t('onboarding.user.toasts.validateErrorTitle'),
          description: t('onboarding.user.toasts.validateEmailDesc'),
          variant: 'destructive',
        });
        return false;
      }

      if (data) {
        setEmailError(t('onboarding.user.toasts.emailUnavailableDesc'));
        return false;
      }

      setEmailError(null);
      return true;
    } catch (error) {
      console.error('Unexpected error validating email:', error);
      toast({
        title: t('onboarding.user.toasts.validateErrorTitle'),
        description: t('onboarding.user.toasts.unexpectedValidateDesc'),
        variant: 'destructive',
      });
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsValidating(true);

    try {
      const isEmailValid = await validateUserEmail(formData.email);

      if (!isEmailValid) {
        toast({
          title: t('onboarding.user.toasts.emailUnavailableTitle'),
          description: t('onboarding.user.toasts.emailUnavailableDesc'),
          variant: 'destructive',
        });
        return;
      }

      onSubmit(formData);
    } finally {
      setIsValidating(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear email error when user starts typing
    if (name === 'email') {
      setEmailError(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-6'>
      <div className='text-center mb-6'>
        <h2 className='text-2xl font-semibold text-slate-900'>
          {t('onboarding.user.title')}
        </h2>
        <p className='text-slate-600 mt-2'>
          {t('onboarding.user.subtitle')}
        </p>
      </div>

      <div className='space-y-4'>
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <Label htmlFor='firstName'>{t('onboarding.user.fields.firstName')}</Label>
            <Input
              id='firstName'
              name='firstName'
              value={formData.firstName}
              onChange={handleChange}
              placeholder={t('onboarding.user.placeholders.firstName')}
              required
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='lastName'>{t('onboarding.user.fields.lastName')}</Label>
            <Input
              id='lastName'
              name='lastName'
              value={formData.lastName}
              onChange={handleChange}
              placeholder={t('onboarding.user.placeholders.lastName')}
              required
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='email'>{t('onboarding.user.fields.email')}</Label>
          <Input
            id='email'
            name='email'
            type='email'
            value={formData.email}
            onChange={handleChange}
            placeholder={t('onboarding.user.placeholders.email')}
            required
            className={emailError ? 'border-red-500' : ''}
          />
          {emailError && (
            <p className='text-sm text-red-500 mt-1'>{emailError}</p>
          )}
          <p className='text-sm text-slate-500'>
            {t('onboarding.user.info')}
          </p>
        </div>

        <div className='space-y-2'>
          <Label htmlFor='password'>{t('onboarding.user.fields.password')}</Label>
          <Input
            id='password'
            name='password'
            type='password'
            value={formData.password}
            onChange={handleChange}
            placeholder={t('onboarding.user.placeholders.password')}
            required
            minLength={6}
          />
          <p className='text-sm text-slate-500'>
            {t('onboarding.user.passwordHelp')}
          </p>
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
          disabled={isValidating || !!emailError}
        >
          {isValidating
            ? t('onboarding.user.buttons.validating')
            : t('onboarding.user.buttons.submit')}
        </Button>
      </div>
    </form>
  );
};
