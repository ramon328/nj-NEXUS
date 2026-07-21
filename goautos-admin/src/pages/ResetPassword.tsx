import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword: React.FC = () => {
  const { loading } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isValidSession, setIsValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [, navigate] = useLocation();

  // Get updatePassword from useAuthOperations
  const { updatePassword } = useAuth() as any;

  // Check if we have a valid recovery session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          setIsValidSession(true);
        } else {
          setErrorMessage('El enlace de recuperación es inválido o ha expirado.');
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setErrorMessage('Ocurrió un error al verificar la sesión.');
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[A-Z]/.test(password)) {
      return 'La contraseña debe contener al menos una mayúscula';
    }
    if (!/[a-z]/.test(password)) {
      return 'La contraseña debe contener al menos una minúscula';
    }
    if (!/[0-9]/.test(password)) {
      return 'La contraseña debe contener al menos un número';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Validate password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }

    const { error } = await updatePassword(newPassword);

    if (!error) {
      // Wait a moment to show success message, then navigate to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    }
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const toggleConfirmPasswordVisibility = () => setShowConfirmPassword(!showConfirmPassword);

  // Loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80')] bg-cover bg-center bg-blend-soft-light">
        <div className='w-full max-w-[400px] p-6'>
          <div className='bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl'>
            <div className='flex flex-col items-center space-y-4'>
              <svg className='animate-spin h-8 w-8 text-primary' viewBox='0 0 24 24'>
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
              <p className='text-slate-600'>Verificando sesión...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Invalid session state
  if (!isValidSession) {
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
                <h1 className='text-2xl font-semibold text-slate-900 mb-2'>
                  Enlace inválido
                </h1>
                <p className='text-slate-600 text-sm'>
                  {errorMessage}
                </p>
              </div>
            </div>

            <Button
              onClick={() => navigate('/forgot-password')}
              className='w-full'
            >
              Solicitar nuevo enlace
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
                Restablecer contraseña
              </h1>
              <p className='text-slate-600 text-sm'>
                Ingresa tu nueva contraseña
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-2'>
              <Label
                htmlFor='newPassword'
                className='text-sm font-medium text-slate-700'
              >
                Nueva contraseña
              </Label>
              <div className='relative'>
                <Input
                  id='newPassword'
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className='pl-10 pr-10 bg-white border-slate-200'
                  required
                />
                <KeyRound className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
                <button
                  type='button'
                  onClick={togglePasswordVisibility}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors'
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
              <p className='text-xs text-slate-500'>
                Mínimo 8 caracteres, incluir mayúscula, minúscula y número
              </p>
            </div>

            <div className='space-y-2'>
              <Label
                htmlFor='confirmPassword'
                className='text-sm font-medium text-slate-700'
              >
                Confirmar contraseña
              </Label>
              <div className='relative'>
                <Input
                  id='confirmPassword'
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className='pl-10 pr-10 bg-white border-slate-200'
                  required
                />
                <KeyRound className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
                <button
                  type='button'
                  onClick={toggleConfirmPasswordVisibility}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors'
                >
                  {showConfirmPassword ? (
                    <EyeOff className='h-4 w-4' />
                  ) : (
                    <Eye className='h-4 w-4' />
                  )}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div
                className='bg-red-50 text-red-600 px-4 py-3 rounded-md text-sm'
                role='alert'
              >
                {errorMessage}
              </div>
            )}

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
                  Restableciendo...
                </span>
              ) : (
                'Restablecer contraseña'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
