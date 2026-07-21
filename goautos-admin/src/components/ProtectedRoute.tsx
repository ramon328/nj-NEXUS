import { useAuth } from '@/contexts/AuthContext';
import { usePageLoading } from '@/contexts/PageLoadingContext';
import { usePermissions } from '@/hooks/usePermissions';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { TermsAcceptanceDialog } from '@/components/terms/TermsAcceptanceDialog';

const FUN_FACTS = [
  'Un auto eléctrico chino alcanzó 500 km/h en 2025 — nuevo récord mundial',
  'Kitty O\'Neil llegó a 825 km/h en 1976 — récord femenino que nadie ha superado',
  'El Rimac Nevera acelera de 0 a 100 km/h en 1.7 segundos',
  'En 1953 un Jaguar alcanzó 277 km/h cuando la mayoría iba a 100',
  'La esposa de Karl Benz hizo famoso el auto: lo tomó sin avisar y manejó 104 km',
  'El primer auto eléctrico se creó en 1832 — casi 200 años antes que Tesla',
  'Tesla vale más que casi todas las otras marcas juntas: 1.4 billones de dólares',
  'En 1929 había 32 millones de autos. Hoy hay más de mil millones',
  'El Toyota Mirai se "carga" en 5 minutos y recorre 650 km',
  'Sony y Honda hicieron un auto que se maneja con control de PlayStation 5',
  'El control de crucero lo inventó un hombre ciego',
  'El Bugatti Tourbillon tiene 1,800 caballos y llega a 100 km/h en 2 segundos',
  'Las alcantarillas de Mónaco se sueldan antes del GP por la succión de los F1',
  'El auto promedio de 2025 tiene más poder que la computadora del Apollo 11',
  'El Rimac Nevera tiene 2,107 CV — más que 20 autos normales juntos',
  'El Porsche 911 iba a llamarse 901 pero Peugeot los demandó',
  'Los autos comparten el 80% de sus piezas entre modelos',
  'Mónaco es el circuito más lento de F1 a 160 km/h — Monza el más rápido a 260 km/h',
  'El auto más largo del mundo mide 30 metros — tiene piscina y helipuerto',
  'El primer auto solar cruzó Australia en 1987',
  'Para fabricar un BMW i8 se usan 884,120 km de fibra de carbono — 2.3 veces la distancia a la Luna',
  'Un Volvo P1800S recorrió 5.25 millones de km — dio la vuelta al mundo 131 veces',
  'MX-5 significa "Mazda Experiment 5"',
  'Elon Musk pagó 800,000 dólares por el Lotus submarino de James Bond',
  'El retrovisor lo inventó una piloto de carreras en 1911',
  'El Pontiac Aztek fue votado el auto más feo de la historia',
  'China tiene más marcas de autos que todos los países juntos',
  'El "olor a auto nuevo" es tóxico — son químicos evaporándose',
  'Los autos negros tienen 50% más accidentes — son menos visibles',
];

const getRandomFact = (exclude?: string) => {
  const pool = exclude ? FUN_FACTS.filter(f => f !== exclude) : FUN_FACTS;
  return pool[Math.floor(Math.random() * pool.length)];
};

const LoadingScreen = ({ className = '' }: { className?: string }) => {
  const [fact, setFact] = useState(() => getRandomFact());
  const [fadeKey, setFadeKey] = useState(0);

  const shuffle = useCallback(() => {
    setFact(prev => getRandomFact(prev));
    setFadeKey(k => k + 1);
  }, []);

  return (
    <div
      className={`flex flex-col items-center justify-center bg-white px-6 cursor-pointer select-none h-[calc(100dvh-48px-env(safe-area-inset-bottom,0px))] lg:h-[100dvh] ${className}`}
      onClick={shuffle}
    >
      <img
        src='/goauto-logo-negro.png'
        alt='GoAuto'
        className='h-14 mb-3'
        style={{ animation: 'logoPulse 2s ease-in-out infinite' }}
      />
      <p
        key={fadeKey}
        className='text-[22px] text-slate-500 text-center max-w-xl leading-relaxed'
        style={{ textWrap: 'balance', animation: 'fadeUp 0.4s ease-out' }}
      >
        {fact}
      </p>
      <p className='text-xs text-slate-300 mt-6' style={{ animation: 'fadeUp 1.2s ease-out' }}>
        Click para otro dato
      </p>
      <style>{`
        @keyframes logoPulse {
          0%, 100% { opacity: 0.4 }
          50% { opacity: 1 }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px) }
          to { opacity: 1; transform: translateY(0) }
        }
      `}</style>
    </div>
  );
};

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const SUBSCRIPTION_EXEMPT = ['/subscribe', '/subscription-required', '/in-app-onboarding'];
const ONBOARDING_ALLOWED = ['/in-app-onboarding', '/vehiculos/agregar', '/builder', '/subscribe', '/subscription-required'];
const PERMISSION_EXEMPT = ['/login', '/forgot-password', '/reset-password', '/onboarding', '/subscribe', '/subscription-required', '/in-app-onboarding', '/funcionalidades'];

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading, client, userRole, isTenantOverride } = useAuth();
  const { canAccessRoute, isSuperadmin } = usePermissions();
  const [location, navigate] = useLocation();
  const lastCheckedRef = useRef('');

  // Modal obligatorio de aceptación de TyC en el primer login del cliente.
  // Se omite para superadmin (Dropout) y cuando un superadmin está
  // suplantando a un tenant — la aceptación la hace el cliente real.
  const needsTermsAcceptance =
    !!user &&
    !!client &&
    !client.terms_accepted_at &&
    userRole !== 'superadmin' &&
    !isTenantOverride;

  useEffect(() => {
    if (isLoading) return;

    // Build a stable key to avoid re-running identical checks
    const checkKey = `${!!user}-${location}-${userRole}-${client?.onboarding_status}-${client?.subscription_status}`;
    if (checkKey === lastCheckedRef.current) return;
    lastCheckedRef.current = checkKey;

    // 1. Auth check
    if (!user) {
      navigate('/login');
      return;
    }

    if (!client) return;

    // 2. Subscription paywall — INDEPENDIENTE del onboarding_status. Antes se
    // gateaba con onboarding === 'complete', lo que dejaba dos huecos: un
    // cancelado con onboarding incompleto conservaba las rutas del wizard
    // (cargar vehículos, builder) para siempre, y ?onboarding=true saltaba el
    // redirect de onboarding SIN pasar nunca por el paywall → acceso total sin
    // suscripción. Verificado antes de cambiar: los 155 clientes actuales están
    // en trial/active, así que esto no afecta a nadie hoy — solo a futuros
    // cancelados por el ciclo de cobro.
    const isOnExemptRoute = SUBSCRIPTION_EXEMPT.some(r => location.startsWith(r));
    if (userRole !== 'superadmin' && !isOnExemptRoute) {
      const hasActive = client.subscription_status === 'trial' || client.subscription_status === 'active';
      if (!hasActive) {
        navigate('/subscription-required');
        return;
      }
    }

    // 3. Onboarding redirect
    const onboardingStatus = client.onboarding_status;
    const isOnAllowedRoute = ONBOARDING_ALLOWED.some(r => location.startsWith(r));
    const isInOnboardingMode = new URLSearchParams(window.location.search).get('onboarding') === 'true';

    if (onboardingStatus !== 'complete' && !isOnAllowedRoute && !isInOnboardingMode && userRole !== 'superadmin') {
      navigate('/in-app-onboarding');
      return;
    }
    if (onboardingStatus === 'complete' && location === '/in-app-onboarding') {
      navigate('/');
      return;
    }

    // 4. Permission check
    if (client.onboarding_status === 'complete' && !isSuperadmin) {
      const isExempt = PERMISSION_EXEMPT.some(r => location.startsWith(r));
      if (!isExempt && !canAccessRoute(location)) {
        navigate('/');
        return;
      }
    }
  }, [user, isLoading, client, location, userRole, isSuperadmin]);

  const { isPageLoading } = usePageLoading();
  const showLoadingScreen = isLoading || (user && isPageLoading);

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <>
      {showLoadingScreen && (
        <div className='fixed inset-0 z-50'>
          <LoadingScreen />
        </div>
      )}
      {children}
      <TermsAcceptanceDialog open={needsTermsAcceptance} />
    </>
  );
};

export default ProtectedRoute;
