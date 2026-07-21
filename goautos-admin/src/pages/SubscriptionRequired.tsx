import React from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Lock, Check, Loader2, ArrowRight, Sparkles, Zap, Shield } from 'lucide-react';

const SubscriptionRequired: React.FC = () => {
  const [, navigate] = useLocation();
  const { client, isLoading } = useAuth();

  // Si ya tiene suscripción activa, redirigir al dashboard
  React.useEffect(() => {
    if (!isLoading && client) {
      const hasActiveSubscription =
        client.subscription_status === 'trial' ||
        client.subscription_status === 'active';

      if (hasActiveSubscription) {
        navigate('/', { replace: true });
      }
    }
  }, [client, isLoading, navigate]);

  if (isLoading || !client) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const features = [
    {
      icon: Sparkles,
      title: 'Sitio web publicado',
      description: 'Tu catálogo online con diseño profesional',
    },
    {
      icon: Zap,
      title: 'Inventario ilimitado',
      description: 'Gestiona todos tus vehículos sin restricciones',
    },
    {
      icon: Shield,
      title: 'Sistema completo',
      description: 'Leads, ventas, financiamiento y documentos',
    },
  ];

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background elements - Aurora effect with light blue */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          {/* Logo */}
          <div className="text-center mb-12 animate-fade-in">
            <img
              src="/lovable-uploads/GOAUTO.LOGO.29.09.25.NEGRO.png"
              alt="GoAuto Logo"
              className="h-14 mx-auto mb-6 brightness-0 invert"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left side - Message */}
            <div className="text-white space-y-6 animate-slide-in-left">
              <div className="inline-flex items-center gap-2 bg-cyan-500/20 backdrop-blur-sm border border-cyan-400/30 rounded-full px-4 py-2 text-sm">
                <Lock className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-200">Acceso Premium Requerido</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                Desbloquea el{' '}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400 text-transparent bg-clip-text animate-gradient">
                  poder completo
                </span>{' '}
                de GoAutos
              </h1>

              <p className="text-xl text-gray-300 leading-relaxed">
                Gestiona tu automotora de forma profesional. Publica tu sitio web, administra tu inventario y cierra más ventas.
              </p>

              {/* Features */}
              <div className="space-y-4 pt-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-lg flex items-center justify-center">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                        <p className="text-sm text-gray-400">{feature.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right side - Pricing Card */}
            <div className="animate-slide-in-right">
              <Card className="relative overflow-hidden border-2 border-cyan-500/50 bg-gradient-to-br from-white via-cyan-50 to-sky-50 shadow-2xl">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-cyan-400 to-sky-400 rounded-full blur-3xl opacity-20"></div>

                <div className="relative p-8 space-y-6">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full px-4 py-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4" />
                    30 días GRATIS
                  </div>

                  {/* Price */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Plan Básico</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-bold bg-gradient-to-r from-cyan-600 to-sky-600 text-transparent bg-clip-text">
                        $238.000
                      </span>
                      <span className="text-2xl text-gray-600">/mes</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">$200.000 + IVA</p>
                  </div>

                  {/* Features list */}
                  <div className="space-y-3 py-4">
                    {[
                      'Sitio web publicado y personalizado',
                      'Inventario ilimitado de vehículos',
                      'Sistema de leads y clientes',
                      'Gestión de ventas y financiamiento',
                      'Documentos y contratos',
                      'Soporte prioritario',
                    ].map((feature, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-600 hover:from-cyan-700 hover:via-sky-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 group"
                    onClick={() => navigate('/subscribe')}
                  >
                    Comenzar ahora
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  {/* Trust badge */}
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 pt-2">
                    <Shield className="h-4 w-4" />
                    <span>Cancela cuando quieras. Sin permanencia.</span>
                  </div>
                </div>
              </Card>

              {/* Additional info */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-400">
                  ¿Necesitas ayuda?{' '}
                  <a href="mailto:soporte@goauto.cl" className="text-cyan-400 hover:text-cyan-300 underline">
                    Contáctanos
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(20px, 20px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        @keyframes slide-in-left {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.8s ease-out;
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.8s ease-out;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionRequired;
