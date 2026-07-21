import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, ArrowLeft } from 'lucide-react';
import React, { useState } from 'react';
import { useLocation } from 'wouter';
import posthog from '@/utils/posthog';

const ForgotPassword: React.FC = () => {
  const { loading } = useAuth();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [, navigate] = useLocation();

  // Get resetPasswordRequest from useAuthOperations
  const { resetPasswordRequest } = useAuth() as any;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await resetPasswordRequest(email);

    if (!error) {
      posthog.capture({
        distinctId: 'anonymous',
        event: 'password_reset_requested',
        properties: { email },
      });
      setEmailSent(true);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80')] bg-cover bg-center bg-blend-soft-light">
        <div className='w-full max-w-[400px] p-6'>
          <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl'>
            <div className='flex flex-col items-center space-y-6 mb-8'>
              <img
                src='/lovable-uploads/GOAUTO.LOGO.29.09.25.AZUL.png'
                alt='GoAuto Logo'
                className='h-28'
              />
              <div className='text-center'>
                <div className='w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <Mail className='w-8 h-8 text-primary' />
                </div>
                <h1 className='text-2xl font-semibold text-slate-900 mb-2'>
                  ¡Correo enviado!
                </h1>
                <p className='text-slate-600 text-sm'>
                  Hemos enviado un enlace de recuperación a <strong>{email}</strong>
                </p>
                <p className='text-slate-500 text-xs mt-4'>
                  Revisa tu bandeja de entrada y haz click en el enlace para restablecer tu contraseña.
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/login')}
              variant='outline'
              className='w-full'
            >
              <ArrowLeft className='w-4 h-4 mr-2' />
              Volver al inicio de sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80')] bg-cover bg-center bg-blend-soft-light">
      <div className='w-full max-w-[400px] p-6'>
        <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl'>
          <div className='flex flex-col items-center space-y-6 mb-8'>
            <img
              src='/lovable-uploads/GOAUTO.LOGO.29.09.25.AZUL.png'
              alt='GoAuto Logo'
              className='h-28'
            />
            <div className='text-center'>
              <h1 className='text-2xl font-semibold text-slate-900 mb-1'>
                ¿Olvidaste tu contraseña?
              </h1>
              <p className='text-slate-600 text-sm'>
                Ingresa tu correo electrónico y te enviaremos un enlace para recuperarla
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-2'>
              <Label
                htmlFor='email'
                className='text-sm font-medium text-slate-700'
              >
                Correo electrónico
              </Label>
              <div className='relative'>
                <Input
                  id='email'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder='tu@email.com'
                  className='pl-10 bg-white border-slate-200'
                  required
                />
                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
              </div>
            </div>

            <Button
              disabled={loading}
              className='w-full bg-primary hover:bg-primary/90 text-white transition-all duration-200'
            >
              {loading ? (
                <span className='flex items-center gap-2'>
                  <svg className='animate-spin h-4 w-4' viewBox='0 0 24 24'>
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                      fill='none'
                    />
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    />
                  </svg>
                  Enviando...
                </span>
              ) : (
                'Enviar enlace de recuperación'
              )}
            </Button>
          </form>

          <div className='mt-6 text-center'>
            <button
              onClick={() => navigate('/login')}
              className='text-sm text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2 mx-auto'
            >
              <ArrowLeft className='w-4 h-4' />
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
