import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { AddFirstVehicleStep } from './steps/AddFirstVehicleStep';
import { CreateWebsiteStep } from './steps/CreateWebsiteStep';
import { Loader2, CheckCircle, Car, Globe, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import posthog from '@/utils/posthog';

type Status = 'adding_first_vehicle' | 'creating_website' | 'complete';

import { PRIMARY_COLOR as APP_PRIMARY } from '@/lib/colors';
const STEPS = [
  { id: 1, status: 'adding_first_vehicle' as Status, title: 'Agregar vehículo', icon: Car },
  { id: 2, status: 'creating_website' as Status, title: 'Crear sitio web', icon: Globe },
  { id: 3, status: 'complete' as Status, title: 'Completado', icon: CheckCircle },
];

const stepIndexFromStatus = (s: Status) => STEPS.findIndex(x => x.status === s) + 1;

const InAppOnboarding: React.FC = () => {
  const { user, client, signOut } = useAuth();
  const [locationPath, navigate] = useLocation();
  const { t } = useTranslation('inAppOnboarding');

  // Los clientes que llegan por el flujo de pago automático YA pagaron antes de
  // entrar: al terminar el onboarding van al dashboard. /subscribe queda solo
  // para cuentas sin suscripción vigente (flujo antiguo / reactivación).
  const hasPaidSubscription =
    client?.subscription_status === 'trial' || client?.subscription_status === 'active';
  const finishRoute = hasPaidSubscription ? '/' : '/subscribe';

  const {
    currentStatus,
    isLoading,
    checkIfHasVehicles,
    checkIfHasWebsite,
    updateStatus,
  } = useOnboardingStatus();

  const [initialized, setInitialized] = useState(false);

  // ⚡️ Override local para respuesta instantánea de UI
  const [overrideStatus, setOverrideStatus] = useState<Status | null>(null);
  const displayedStatus: Status = (overrideStatus ?? currentStatus ?? 'adding_first_vehicle') as Status;

  // === Flags por querystring (opcional): ?jump=... y ?noauto=1 para no autoprogresar
  const { jumpTarget, noAutoFlag } = useMemo(() => {
    let jump: Status | null = null;
    let noauto = false;
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const qp = new URLSearchParams(search);
      const raw = qp.get('jump');
      if (raw === 'adding_first_vehicle' || raw === 'creating_website' || raw === 'complete') {
        jump = raw;
      }
      noauto = qp.get('noauto') === '1';
    } catch {
      // ignore
    }
    return { jumpTarget: jump, noAutoFlag: noauto };
  }, [locationPath]);

  // 🚦 Supresor local del autoprogreso (cuando el usuario quiere "seguir agregando")
  const [suppressAuto, setSuppressAuto] = useState<boolean>(false);

  // ⚡️ Si venimos con ?jump=..., forzamos UI y persistimos estado sin esperar revalidaciones
  useEffect(() => {
    if (!user || !client) return;
    if (!jumpTarget) return;

    setOverrideStatus(jumpTarget);
    // Si llega con ?noauto=1 y jump a vehicles, activamos supresión
    if (jumpTarget === 'adding_first_vehicle' && noAutoFlag) {
      setSuppressAuto(true);
    }
    updateStatus(jumpTarget).catch(() => { /* ignora errores transitorios */ });
    setInitialized(true);
  }, [jumpTarget, noAutoFlag, user, client, updateStatus]);

  // Autoprogreso (se salta si hay jump/noauto/suppressAuto)
  useEffect(() => {
    if (jumpTarget) return; // prioridad al salto explícito
    if (noAutoFlag) { setInitialized(true); return; } // respeta ?noauto=1
    if (suppressAuto) { setInitialized(true); return; } // respeta supresión local
    if (isLoading) return;
    if (!user) { navigate('/login'); return; }
    if (!client) return;

    (async () => {
      if (currentStatus === 'complete') {
        navigate(finishRoute);
        return;
      }
      if (currentStatus === 'adding_first_vehicle') {
        const has = await checkIfHasVehicles().catch(() => false);
        
        if (has) await updateStatus('creating_website');
      } else if (currentStatus === 'creating_website') {
        const has = await checkIfHasWebsite().catch(() => false);
        if (has) {
          await updateStatus('complete');
          navigate(finishRoute);
          return;
        }
      }
      setInitialized(true);
    })();
  }, [
    isLoading,
    user,
    client,
    currentStatus,
    checkIfHasVehicles,
    checkIfHasWebsite,
    updateStatus,
    navigate,
    jumpTarget,
    noAutoFlag,
    suppressAuto,
    finishRoute,
  ]);

  // Si el servidor ya alcanzó el mismo estado que el override, limpiamos override
  useEffect(() => {
    if (!overrideStatus) return;
    if (overrideStatus === currentStatus) setOverrideStatus(null);
  }, [overrideStatus, currentStatus]);

  const stepIdx = useMemo(() => stepIndexFromStatus(displayedStatus), [displayedStatus]);
  const progressPct = useMemo(
    () => Math.min(100, Math.round(((stepIdx - 1) / (STEPS.length - 1)) * 100)),
    [stepIdx]
  );

  // ===== Atajos: Enter intenta avanzar, Esc vuelve (usando override para instantáneo)
  const tryAdvance = useCallback(async () => {
    // Al avanzar manualmente reanudamos el autoprogreso
    if (suppressAuto) setSuppressAuto(false);

    if (displayedStatus === 'adding_first_vehicle') {
      const has = await checkIfHasVehicles().catch(() => false);
      if (has) {
        posthog.capture({
          distinctId: user?.id || 'anonymous',
          event: 'onboarding_step_completed',
          properties: { step_number: 1, step_name: 'adding_first_vehicle' },
        });
        setOverrideStatus('creating_website'); // instantáneo
        await updateStatus('creating_website').catch(() => {});
      }
    } else if (displayedStatus === 'creating_website') {
      const has = await checkIfHasWebsite().catch(() => false);
      if (has) {
        posthog.capture({
          distinctId: user?.id || 'anonymous',
          event: 'onboarding_step_completed',
          properties: { step_number: 2, step_name: 'creating_website' },
        });
        posthog.capture({
          distinctId: user?.id || 'anonymous',
          event: 'onboarding_completed',
        });
        setOverrideStatus('complete'); // instantáneo
        await updateStatus('complete').catch(() => {});
        navigate(finishRoute);
      }
    }
  }, [displayedStatus, checkIfHasVehicles, checkIfHasWebsite, updateStatus, navigate, suppressAuto, user, finishRoute]);

  const handleEsc = useCallback(async () => {
    if (displayedStatus === 'creating_website') {
      // Si el usuario vuelve manualmente a vehículos, suprimimos autoprogreso
      setSuppressAuto(true);
      setOverrideStatus('adding_first_vehicle'); // instantáneo
      await updateStatus('adding_first_vehicle').catch(() => {});
    }
    // en 'adding_first_vehicle' no hacemos nada para no introducir “Salir”
  }, [displayedStatus, updateStatus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || (tgt as any)?.isContentEditable)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        void tryAdvance();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        void handleEsc();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tryAdvance, handleEsc]);

  if (isLoading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
        </div>
      </div>
    );
  }

  const TopBar = () => (
    <div className="sticky top-0 z-40 backdrop-blur bg-white/75 border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[88px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 min-w-0">
          <img src="/lovable-uploads/goauto-logo-black.png" alt="GoAuto" className="h-16 md:h-[72px] shrink-0" />
          <nav aria-label="Progreso" className="hidden md:flex items-center gap-2 min-w-0">
            {STEPS.map((s) => {
              const active = s.id === stepIdx;
              const done = s.id < stepIdx;
              const Icon = s.icon;

              const pillStyle: React.CSSProperties = active
                ? { backgroundColor: APP_PRIMARY, color: '#ffffff', borderColor: APP_PRIMARY }
                : done
                ? { backgroundColor: `${APP_PRIMARY}22`, color: '#0f172a', borderColor: `${APP_PRIMARY}33` }
                : { backgroundColor: '#ffffff', color: '#475569', borderColor: '#e2e8f0' };

              const dotStyle: React.CSSProperties = active
                ? { backgroundColor: '#ffffff', color: APP_PRIMARY }
                : done
                ? { backgroundColor: APP_PRIMARY, color: '#ffffff' }
                : { backgroundColor: '#e2e8f0', color: '#334155' };

              return (
                <div
                  key={s.id}
                  className="group inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full text-sm transition border"
                  style={pillStyle}
                  aria-current={active ? 'step' : undefined}
                >
                  <span className="h-6 w-6 rounded-full grid place-items-center transition" style={dotStyle}>
                    {done ? <CheckCircle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="hidden xl:inline truncate">{s.title}</span>
                  <span className={`ml-1 text-[10px] font-medium ${active ? 'opacity-90' : 'opacity-60'}`}>
                    {s.id}/{STEPS.length}
                  </span>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-40 sm:w-64 hidden sm:block">
            <div className="h-2 rounded bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded transition-[width] duration-300"
                style={{ width: `${progressPct}%`, backgroundColor: APP_PRIMARY }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:border-slate-300 transition shrink-0"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      {/* Fondo suave */}
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

      <TopBar />

      {/* Contenido */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-5 sm:p-6">
            {displayedStatus === 'adding_first_vehicle' && (
              <AddFirstVehicleStep
                onSkipInstant={() => {
                  // Al avanzar manual, reanudar autoprogreso
                  if (suppressAuto) setSuppressAuto(false);
                  posthog.capture({
                    distinctId: user?.id || 'anonymous',
                    event: 'onboarding_step_completed',
                    properties: { step_number: 1, step_name: 'adding_first_vehicle' },
                  });
                  setOverrideStatus('creating_website'); // UI instantánea
                  updateStatus('creating_website').catch(() => {});
                }}
              />
            )}

            {displayedStatus === 'creating_website' && (
              <CreateWebsiteStep
                onBackToVehiclesInstant={() => {
                  // El usuario quiere seguir agregando → suprimimos autoprogreso
                  setSuppressAuto(true);
                  setOverrideStatus('adding_first_vehicle'); // UI instantánea
                  updateStatus('adding_first_vehicle').catch(() => {});
                  // (Opcional) si prefieres via URL:
                  // navigate('/onboarding?jump=adding_first_vehicle&noauto=1');
                }}
                onCompleteInstant={() => {
                  posthog.capture({
                    distinctId: user?.id || 'anonymous',
                    event: 'onboarding_step_completed',
                    properties: { step_number: 2, step_name: 'creating_website' },
                  });
                  posthog.capture({
                    distinctId: user?.id || 'anonymous',
                    event: 'onboarding_completed',
                  });
                  setOverrideStatus('complete');
                  updateStatus('complete').catch(() => {});
                  navigate(finishRoute);
                }}
              />
            )}

            {displayedStatus === 'complete' && (
              <div className="flex flex-col items-center justify-center text-center py-14">
                <CheckCircle className="h-12 w-12 text-emerald-500 mb-3" />
                <h2 className="text-2xl font-semibold text-slate-900 mb-1">{t('done.title', '¡Listo!')}</h2>
                <p className="text-slate-600">{t('done.subtitle', 'Tu onboarding está completo')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InAppOnboarding;
