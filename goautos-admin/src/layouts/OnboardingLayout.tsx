// src/layouts/OnboardingLayout.tsx
import React, { useMemo } from 'react';
import { useLocation } from 'wouter';

import { PRIMARY_COLOR as APP_PRIMARY } from '@/lib/colors';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  /** Opcional: Forzar mostrar botón volver aun sin query param */
  showBack?: boolean;
  /** Opcional: ruta personalizada para volver */
  backTo?: string;
}

/**
 * Layout especial para onboarding in-app o pantallas auxiliares del flujo.
 * - Fondo con orbes y animaciones suaves (coherente con el onboarding principal).
 * - Top bar sticky con logo.
 * - Si detecta ?onboarding=true muestra botón "Volver al onboarding".
 */
const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children, showBack, backTo }) => {
  const [loc, navigate] = useLocation();

  const isOnboardingUrl = useMemo(() => {
    try {
      const q = new URLSearchParams(loc.split('?')[1] || '');
      return q.get('onboarding') === 'true';
    } catch { return false; }
  }, [loc]);

  const shouldShowBack = showBack ?? isOnboardingUrl;
  const backHref = backTo || '/in-app-onboarding';

  return (
    <div className="relative min-h-screen">
      {/* Fondo suave con orbes (coherente) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ background: `radial-gradient(closest-side, ${APP_PRIMARY}, transparent 70%)`, animation: 'float 9s ease-in-out infinite alternate' }}
        />
        <div
          className="absolute -bottom-16 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-10"
          style={{ background: `radial-gradient(closest-side, ${APP_PRIMARY}33, transparent 70%)`, animation: 'float2 11s ease-in-out infinite alternate' }}
        />
        <style>{`
          @keyframes float { from { transform: translateY(0) } to { transform: translateY(20px) } }
          @keyframes float2 { from { transform: translateY(0) } to { transform: translateY(-24px) } }
        `}</style>
      </div>

      {/* Top bar sticky con logo + volver */}
      <div className="sticky top-0 z-40 backdrop-blur bg-white/75 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/lovable-uploads/goauto-logo-black.png"
              alt="GoAuto"
              className="h-10 md:h-16 shrink-0"
            />
            <span className="text-sm text-slate-500 hidden sm:inline">Onboarding</span>
          </div>

          {shouldShowBack && (
            <button
              onClick={() => navigate(backHref)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: APP_PRIMARY }} />
              Volver al onboarding
            </button>
          )}
        </div>
      </div>

      {/* Contenido principal centrado */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default OnboardingLayout;
