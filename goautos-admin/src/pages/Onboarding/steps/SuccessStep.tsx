import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { PRIMARY_COLOR } from '@/lib/colors';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { generatePassword } from '@/utils/password';
import {
  createClient,
  createDefaultVehicleStates,
} from '@/components/clients/ClientService';
import { createDomain } from '@/integrations/vercel/client';

type OnboardingData = {
  client: {
    name: string;
    logoUrl: string;
    primaryColor: string;
    email: string;
    phone: string;
  };
  dealerships: Array<{
    location: {
      lat: number;
      lng: number;
      address: string;
    };
    phone: string;
    email: string;
  }>;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

interface SuccessStepProps {
  onboardingData: OnboardingData;
  onFinish: () => void;
  onBack?: () => void;
}

// Función para enviar mensaje divertido a Slack (usando Supabase Edge Function)
const sendSlackNotification = async (onboardingData: OnboardingData) => {
  try {
    const response = await fetch(
      'https://miuiujntdjrjhhcysiba.supabase.co/functions/v1/slack-notification',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ onboardingData }),
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log(
        '🔩 ¡Notificación de NUEVA TUERCA enviada a Slack exitosamente!',
        result
      );
    } else {
      const error = await response.json();
      console.error('❌ Error enviando notificación a Slack:', error);
    }
  } catch (error) {
    console.error('❌ Error enviando notificación a Slack:', error);
  }
};

export const SuccessStep: React.FC<SuccessStepProps> = ({
  onboardingData,
  onFinish,
  onBack,
}) => {
  const [, navigate] = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const [isCreated, setIsCreated] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const { t } = useTranslation('auth');

  const handleCreateAccount = async () => {
    setIsCreating(true);
    try {
      // 1. Create client with the logo URL (logo es opcional ahora)
      const clientData = {
        name: onboardingData.client.name,
        logo: onboardingData.client.logoUrl || null, // Puede ser null si no se proporcionó
        theme: {
          light: {
            primary: onboardingData.client.primaryColor,
            secondary: '#ffffff',
          },
          dark: {
            primary: onboardingData.client.primaryColor,
            secondary: '#ffffff',
          },
        },
        contact: {
          email: onboardingData.client.email,
          phone: onboardingData.client.phone,
        },
        has_demo: true,
        has_dark_mode: false,
        onboarding_status: 'adding_first_vehicle', // ¡IMPORTANTE! Estado inicial del onboarding
      };

      console.log('Final clientData being sent:', clientData);

      const { data: clientResult, error: clientError } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (clientError)
        throw new Error('Error creating client: ' + clientError.message);

      await createDefaultVehicleStates(clientResult.id);

      const formattedDomain = onboardingData.client.name
        .toLowerCase()
        .replace(/\s+/g, '');

      console.log('Formatted domain:', formattedDomain);

      // Create Vercel domain
      await createDomain(formattedDomain);

      // Update client with domain
      const { error: domainUpdateError } = await supabase
        .from('clients')
        .update({ domain: `${formattedDomain}.goauto.cl` })
        .eq('id', clientResult.id);

      if (domainUpdateError)
        throw new Error(
          'Error updating client domain: ' + domainUpdateError.message
        );

      // 3. Create dealerships
      const dealershipsData = onboardingData.dealerships.map((dealership, idx) => ({
        client_id: clientResult.id,
        name: idx === 0 ? `${onboardingData.client?.name || 'Sucursal'} - Principal` : `Sucursal ${idx + 1}`,
        address: dealership.location.address,
        location: dealership.location,
        phone: dealership.phone,
        email: dealership.email,
      }));

      const { error: dealershipsError } = await supabase
        .from('dealerships')
        .insert(dealershipsData);

      if (dealershipsError)
        throw new Error(
          'Error creating dealerships: ' + dealershipsError.message
        );

      // 4. Generate password and create user
      const password = generatePassword();
      setGeneratedPassword(password);

      // Get the Administrador role_id that was auto-created by the trigger
      const { data: adminRole } = await supabase
        .from('roles')
        .select('id')
        .eq('client_id', clientResult.id)
        .eq('name', 'Administrador')
        .eq('is_system_role', true)
        .maybeSingle();

      const response = await fetch(
        `https://miuiujntdjrjhhcysiba.supabase.co/functions/v1/create_user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: onboardingData.user.email,
            password,
            first_name: onboardingData.user.firstName,
            last_name: onboardingData.user.lastName,
            rol: 'admin',
            client_id: clientResult.id,
            role_id: adminRole?.id || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error('Error creating user: ' + error.message);
      }

      // 5. Send welcome email
      await fetch(
        'https://miuiujntdjrjhhcysiba.supabase.co/functions/v1/send-email',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: onboardingData.user.email,
            subject: '¡Bienvenido a GoAutos!',
            content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 15px;">
                <img src="https://portal.goauto.cl/lovable-uploads/GOAUTO.LOGO.29.09.25.AZUL.png" alt="GoAuto Logo" style="height: 60px;">
              </div>
              
              <div style="background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 20px; text-align: center;">
                  ¡Bienvenido a GoAutos!
                </h1>
                
                <p style="color: #444444; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                  Nos complace informarte que tu cuenta ha sido creada exitosamente. A continuación, encontrarás tus credenciales de acceso:
                </p>
                
                <div style="background-color: #f8f9fa; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                  <p style="margin: 0; color: #666666; font-size: 15px;">
                    <strong>Email:</strong> ${onboardingData.user.email}
                  </p>
                  <p style="margin: 10px 0 0 0; color: #666666; font-size: 15px;">
                    <strong>Contraseña temporal:</strong> ${password}
                  </p>
                </div>
                
                <p style="color: #444444; font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
                  Por razones de seguridad, te recomendamos cambiar tu contraseña al iniciar sesión por primera vez.
                </p>
                
                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://portal.goauto.cl" 
                     style="background-color: ${PRIMARY_COLOR}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Acceder al Portal
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; margin-top: 20px; color: #666666; font-size: 14px;">
                <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
                <p style="margin-top: 10px;">© ${new Date().getFullYear()} GoAutos. Todos los derechos reservados.</p>
              </div>
            </div>
            `,
          }),
        }
      );

      // 🔩 ¡Enviar notificación divertida a Slack!
      try {
        await sendSlackNotification(onboardingData);
      } catch (slackError) {
        console.error(
          'Error enviando notificación a Slack (no crítico):',
          slackError
        );
        // No hacemos throw aquí porque la notificación de Slack no es crítica
      }

      // 6. AUTO-LOGIN: Iniciar sesión automáticamente con las credenciales creadas
      try {
        const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
          email: onboardingData.user.email,
          password: password,
        });

        if (loginError) {
          console.error('Error al hacer auto-login:', loginError);
          // Si falla el auto-login, mostrar credenciales para login manual
          setIsCreated(true);
          setGeneratedPassword(password);
          toast({
            title: 'Cuenta creada exitosamente',
            description: 'Inicia sesión con las credenciales enviadas a tu email',
          });
          return;
        }

        // Auto-login exitoso! Redirigir al onboarding in-app
        toast({
          title: '¡Bienvenido a GoAutos!',
          description: 'Comencemos configurando tu automotora',
        });

        // Redirigir al onboarding in-app (paso 1: agregar vehículo)
        navigate('/in-app-onboarding');

      } catch (autoLoginError) {
        console.error('Error en auto-login:', autoLoginError);
        setIsCreated(true);
        setGeneratedPassword(password);
        toast({
          title: 'Cuenta creada exitosamente',
          description: 'Inicia sesión con las credenciales enviadas a tu email',
        });
      }
    } catch (error) {
      console.error('Error creating account:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error creando la cuenta',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <div className='flex flex-col items-center justify-center space-y-4 py-12'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='text-lg font-medium text-slate-900'>
          Creando tu cuenta...
        </p>
      </div>
    );
  }

  if (isCreated) {
    return (
      <div className='space-y-6'>
        <div className='text-center'>
          <div className='flex justify-center mb-4'>
            <CheckCircle2 className='h-16 w-16 text-green-500' />
          </div>
          <h2 className='text-2xl font-semibold text-slate-900'>
            {t('onboarding.success.createdTitle')}
          </h2>
          <p className='text-slate-600 mt-2'>
            {t('onboarding.success.createdSubtitle')}
          </p>
        </div>

        <div className='bg-slate-50 p-6 rounded-lg space-y-4'>
          <h3 className='font-medium text-slate-900'>{t('onboarding.success.credsTitle')}</h3>
          <div className='grid grid-cols-2 gap-2 text-sm'>
            <div className='text-slate-600'>{t('onboarding.success.email')}</div>
            <div className='text-slate-900'>{onboardingData.user.email}</div>
            <div className='text-slate-600'>{t('onboarding.success.tempPassword')}</div>
            <div className='text-slate-900 font-mono'>{generatedPassword}</div>
          </div>
        </div>

        <Button onClick={onFinish} className='w-full'>
          {t('onboarding.success.goToLogin')}
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='text-center'>
        <div className='flex justify-center mb-4'>
          <CheckCircle2 className='h-16 w-16 text-green-500' />
        </div>
        <h2 className='text-2xl font-semibold text-slate-900'>
          {t('onboarding.success.summaryTitle')}
        </h2>
        <p className='text-slate-600 mt-2'>
          {t('onboarding.success.summarySubtitle')}
        </p>
      </div>

      {/* Client Information */}
      <div className='space-y-4'>
        <h3 className='font-medium text-lg text-slate-900'>
          {t('onboarding.success.sections.client')}
        </h3>
        <div className='bg-slate-50 p-4 rounded-lg space-y-2'>
          <div className='grid grid-cols-2 gap-2 text-sm'>
            <div className='text-slate-600'>{t('onboarding.success.fields.name')}</div>
            <div className='text-slate-900'>{onboardingData.client.name}</div>

            <div className='text-slate-600'>{t('onboarding.success.fields.primaryColor')}</div>
            <div className='text-slate-900 flex items-center gap-2'>
              <div
                className='w-4 h-4 rounded'
                style={{ backgroundColor: onboardingData.client.primaryColor }}
              />
              {onboardingData.client.primaryColor}
            </div>

            <div className='text-slate-600'>{t('onboarding.success.fields.email')}</div>
            <div className='text-slate-900'>{onboardingData.client.email}</div>

            <div className='text-slate-600'>{t('onboarding.success.fields.phone')}</div>
            <div className='text-slate-900'>{onboardingData.client.phone}</div>
          </div>
        </div>
      </div>

      {/* Dealerships Information */}
      <div className='space-y-4'>
        <h3 className='font-medium text-lg text-slate-900'>{t('onboarding.success.sections.dealerships')}</h3>
        <div className='space-y-4'>
          {onboardingData.dealerships.map((dealership, index) => (
            <div key={index} className='bg-slate-50 p-4 rounded-lg space-y-2'>
              <div className='grid grid-cols-2 gap-2 text-sm'>
                <div className='text-slate-600'>{t('onboarding.success.fields.address')}</div>
                <div className='text-slate-900'>
                  {dealership.location.address}
                </div>

                <div className='text-slate-600'>{t('onboarding.success.fields.phone')}</div>
                <div className='text-slate-900'>{dealership.phone}</div>

                <div className='text-slate-600'>{t('onboarding.success.fields.email')}</div>
                <div className='text-slate-900'>{dealership.email}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* User Information */}
      <div className='space-y-4'>
        <h3 className='font-medium text-lg text-slate-900'>
          {t('onboarding.success.sections.user')}
        </h3>
        <div className='bg-slate-50 p-4 rounded-lg space-y-2'>
          <div className='grid grid-cols-2 gap-2 text-sm'>
            <div className='text-slate-600'>{t('onboarding.success.fields.name')}</div>
            <div className='text-slate-900'>
              {onboardingData.user.firstName} {onboardingData.user.lastName}
            </div>

            <div className='text-slate-600'>{t('onboarding.success.fields.email')}</div>
            <div className='text-slate-900'>{onboardingData.user.email}</div>
          </div>
        </div>
      </div>

      <Button onClick={handleCreateAccount} className='w-full'>
        {t('onboarding.success.buttons.createAccount')}
      </Button>
    </div>
  );
};
