// src/pages/Onboarding/OnboardingFlow.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Loader2, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createDefaultVehicleStates } from '@/components/clients/ClientService';

// Supabase Edge Functions config
const SUPABASE_URL = 'https://miuiujntdjrjhhcysiba.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1pdWl1am50ZGpyamhoY3lzaWJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUwODEzNjcsImV4cCI6MjA1MDY1NzM2N30.CqgUmrnmGSLDc6tg2aCHdD7tB-q9YL2utHPzXSIo6gI';
const edgeFunctionHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY,
};
import { createDomain } from '@/integrations/vercel/client';
import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';

import { UserProfileStep, type UserProfileData } from './steps/UserProfileStep';
import { CompanyInfoStep, type CompanyInfoData } from './steps/CompanyInfoStep';
import { LocationStep, type LocationData } from './steps/LocationStep';
import { PasswordStepNew, type PasswordData } from './steps/PasswordStepNew';
import { SummaryStepNew } from './steps/SummaryStepNew';
import { VerticalTimeline } from './components/VerticalTimeline';
import posthog from '@/utils/posthog';

type OnboardingData = {
  userProfile: UserProfileData;
  companyInfo: CompanyInfoData;
  location: LocationData;
  password: PasswordData;
};

const STORAGE_KEY = 'goauto:onboarding-data:v9';
const STEP_KEY = 'goauto:onboarding-step:v9';
const SAVED_SNAPSHOT_KEY = 'goauto:onboarding-saved-snapshots:v9';
const TOTAL_STEPS = 5;

import { PRIMARY_COLOR as APP_PRIMARY } from '@/lib/colors';

const DEFAULT_DATA: OnboardingData = {
  userProfile: { firstName: '', lastName: '', email: '' },
  companyInfo: { name: '', phone: '', email: '', countryCode: '+56' },
  location: {
    lat: -33.4022,
    lng: -70.5792,
    address: 'Las Condes, Región Metropolitana, Chile',
  },
  password: { password: '', confirmPassword: '' },
};

const safeEmail = (email: string) => (email || '').trim().toLowerCase();
const slugifyDomain = (name: string) =>
  (name || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '')
    .slice(0, 32);

function emailValid(e: string) {
  return /^\S+@\S+\.\S+$/.test((e || '').trim());
}

/** Normaliza móviles con código de país a E.164. */
function normalizePhoneToE164(countryCode: string, phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');

  // Si el código de país es +56 (Chile), validamos que sea un móvil
  if (countryCode === '+56') {
    if (digits.length === 9 && digits.startsWith('9')) {
      return `+569${digits.slice(1)}`;
    }
    if (digits.length === 8) {
      return `+569${digits}`;
    }
    return null;
  }

  // Para otros países, simplemente concatenamos
  if (digits.length >= 7 && digits.length <= 15) {
    return `${countryCode}${digits}`;
  }

  return null;
}

function validatePasswordRequirements(password: string) {
  return (
    password.length >= 8 &&
    /[0-9]/.test(password)
  );
}

function validateStep(step: number, data: OnboardingData) {
  switch (step) {
    case 1: {
      const { firstName, lastName, email } = data.userProfile;
      if (firstName.trim().length < 2) return 'El nombre debe tener al menos 2 caracteres';
      if (lastName.trim().length < 2) return 'El apellido debe tener al menos 2 caracteres';
      if (!emailValid(email)) return 'El correo electrónico no es válido';
      return null;
    }
    case 2: {
      const { name, phone, email, countryCode } = data.companyInfo;
      if (name.trim().length < 3) return 'El nombre de la automotora debe tener al menos 3 caracteres';
      if (!normalizePhoneToE164(countryCode, phone)) return 'El teléfono no es válido';
      if (!emailValid(email)) return 'El correo electrónico no es válido';
      return null;
    }
    case 3: {
      const { lat, lng, address } = data.location;
      if (!address.trim() || address.trim().length < 5) return 'La dirección es requerida';
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return 'Ubicación inválida';
      if (lat === 0 && lng === 0) return 'Selecciona una ubicación válida';
      return null;
    }
    case 4: {
      const { password, confirmPassword } = data.password;
      if (!validatePasswordRequirements(password)) {
        return 'La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial';
      }
      if (password !== confirmPassword) return 'Las contraseñas no coinciden';
      return null;
    }
    case 5: {
      // Summary step - just validate all previous steps
      for (let s = 1; s <= 4; s++) {
        const err = validateStep(s, data);
        if (err) return err;
      }
      return null;
    }
    default:
      return 'Paso inválido';
  }
}

function fireSideCannons() {
  const end = Date.now() + 2500;
  const colors = ['#a786ff', '#fd8bbc', '#eca184', '#f8deb1'];
  (function frame() {
    if (Date.now() > end) return;
    confetti({ particleCount: 3, angle: 60, spread: 60, startVelocity: 55, origin: { x: 0, y: 0.5 }, colors });
    confetti({ particleCount: 3, angle: 120, spread: 60, startVelocity: 55, origin: { x: 1, y: 0.5 }, colors });
    requestAnimationFrame(frame);
  })();
}

/** Serializa solo el contenido del step para comparar "dirty/saved" */
function serializeStep(step: number, data: OnboardingData): string {
  switch (step) {
    case 1: return JSON.stringify(data.userProfile ?? {});
    case 2: return JSON.stringify(data.companyInfo ?? {});
    case 3: return JSON.stringify(data.location ?? {});
    case 4: return JSON.stringify(data.password ?? {});
    case 5: return JSON.stringify(data ?? {});
    default: return '';
  }
}

const OnboardingFlow: React.FC = () => {
  const [, navigate] = useLocation();

  const [data, setData] = useState<OnboardingData>(() => {
    try { const raw = sessionStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : DEFAULT_DATA; }
    catch { return DEFAULT_DATA; }
  });

  const [step, setStep] = useState<number>(() => {
    try {
      const raw = sessionStorage.getItem(STEP_KEY);
      const s = raw ? parseInt(raw, 10) : 1;
      return Number.isFinite(s) && s >= 1 && s <= TOTAL_STEPS ? s : 1;
    } catch { return 1; }
  });

  const [isCreating, setIsCreating] = useState(false);
  const [locked, setLocked] = useState(false);

  // ===== Indicador de guardado POR PASO =====
  const [savedSnapshotByStep, setSavedSnapshotByStep] = useState<Record<number, string>>(() => {
    try {
      const raw = sessionStorage.getItem(SAVED_SNAPSHOT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    const initial: Record<number, string> = {
      1: serializeStep(1, data),
      2: serializeStep(2, data),
      3: serializeStep(3, data),
      4: serializeStep(4, data),
      5: serializeStep(5, data),
    };
    try { sessionStorage.setItem(SAVED_SNAPSHOT_KEY, JSON.stringify(initial)); } catch {}
    return initial;
  });

  const [isSaving, setIsSaving] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const serializedCurrent = useMemo(() => serializeStep(step, data), [step, data]);
  const savedCurrent = savedSnapshotByStep[step] ?? '';
  const isDirty = serializedCurrent !== savedCurrent;

  const stepError = validateStep(step, data);
  const stepValid = !stepError;

  // autosave debounce
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);

    const s1 = serializeStep(1, data);
    const s2 = serializeStep(2, data);
    const s3 = serializeStep(3, data);
    const s4 = serializeStep(4, data);
    const s5 = serializeStep(5, data);
    const somethingDirty =
      s1 !== savedSnapshotByStep[1] ||
      s2 !== savedSnapshotByStep[2] ||
      s3 !== savedSnapshotByStep[3] ||
      s4 !== savedSnapshotByStep[4] ||
      s5 !== savedSnapshotByStep[5];

    if (!somethingDirty) {
      setIsSaving(false);
      return;
    }

    setIsSaving(true);
    saveTimer.current = window.setTimeout(() => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        const nextSnapshots: Record<number, string> = { 1: s1, 2: s2, 3: s3, 4: s4, 5: s5 };
        setSavedSnapshotByStep(nextSnapshots);
        sessionStorage.setItem(SAVED_SNAPSHOT_KEY, JSON.stringify(nextSnapshots));
      } finally {
        setIsSaving(false);
      }
    }, 350);

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [data, savedSnapshotByStep]);

  useEffect(() => { try { sessionStorage.setItem(STEP_KEY, String(step)); } catch {} }, [step]);

  const uiBrand = APP_PRIMARY;

  const progressPct = useMemo(() =>
    Math.min(100, Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100)), [step]);

  const domainPreview = slugifyDomain(data.companyInfo.name);

  const timelineSteps = useMemo(() => [
    { id: 1, title: 'Perfil de usuario', subtitle: 'Proporciona algunos datos personales', icon: 'user' as const },
    { id: 2, title: 'Información de tu automotora', subtitle: 'Cuéntanos sobre tu negocio', icon: 'building' as const },
    { id: 3, title: 'Ubicación de tu automotora', subtitle: 'Detalla dónde se ubica', icon: 'map' as const },
    { id: 4, title: 'Crea tu contraseña', subtitle: 'Protege tu cuenta', icon: 'lock' as const },
    { id: 5, title: 'Resumen del registro', subtitle: 'Mira toda la información', icon: 'check' as const },
  ], []);

  const [shakeKey, setShakeKey] = useState(0);

  const goBack = useCallback(() => setStep((s) => Math.max(1, s - 1)), []);

  const checkClientNameUnique = useCallback(async (name: string) => {
    if (!name.trim()) return false;
    const { data: existing, error } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', name)
      .maybeSingle();
    if (error && error.code !== 'PGRST116') {
      toast({ title: 'No se pudo validar el nombre', description: 'Intenta nuevamente.', variant: 'destructive' });
      return false;
    }
    return !existing;
  }, []);

  const tryLock = () => { if (locked) return false; setLocked(true); return true; };
  const unlock = () => setLocked(false);

  const finalSubmit = async () => {
    if (!tryLock()) return;
    setIsCreating(true);

    try {
      // Validate all steps
      for (let s = 1; s <= TOTAL_STEPS; s++) {
        const err = validateStep(s, data);
        if (err) throw new Error(err);
      }

      // Normalize phone
      const phoneE164 = normalizePhoneToE164(data.companyInfo.countryCode, data.companyInfo.phone);
      if (!phoneE164) throw new Error('Número de teléfono inválido.');

      // Check unique name
      const unique = await checkClientNameUnique(data.companyInfo.name);
      if (!unique) throw new Error('El nombre de automotora ya está registrado.');

      // Create client
      const clientData = {
        name: data.companyInfo.name,
        logo: null,
        theme: {
          light: { primary: APP_PRIMARY, secondary: '#ffffff' },
          dark: { primary: APP_PRIMARY, secondary: '#ffffff' },
        },
        contact: { email: safeEmail(data.companyInfo.email), phone: phoneE164 },
        has_dark_mode: false,
        onboarding_status: 'adding_first_vehicle',
      };

      const { data: clientResult, error: clientError } = await supabase
        .from('clients').insert(clientData).select().single();
      if (clientError) throw new Error('Error creando cliente: ' + clientError.message);

      await createDefaultVehicleStates(clientResult.id);

      // Create domain
      const domain = domainPreview || slugifyDomain(data.companyInfo.name);
      await createDomain(domain);
      const { error: domainUpdateError } = await supabase
        .from('clients').update({ domain: `${domain}.goauto.cl` }).eq('id', clientResult.id);
      if (domainUpdateError) throw new Error('Error guardando dominio: ' + domainUpdateError.message);

      // Create dealership
      const dealershipData = {
        client_id: clientResult.id,
        name: `${data.companyInfo.name} - Sucursal Principal`,
        address: data.location.address,
        location: { lat: data.location.lat, lng: data.location.lng, address: data.location.address },
        phone: phoneE164,
        email: safeEmail(data.companyInfo.email),
      };
      const { error: dealershipsError } = await supabase.from('dealerships').insert([dealershipData]);
      if (dealershipsError) throw new Error('Error creando sucursal: ' + dealershipsError.message);

      // Get the Administrador role_id that was auto-created by the trigger
      const { data: adminRole } = await supabase
        .from('roles')
        .select('id')
        .eq('client_id', clientResult.id)
        .eq('name', 'Administrador')
        .eq('is_system_role', true)
        .maybeSingle();

      // Create user account
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create_user`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({
          email: safeEmail(data.userProfile.email),
          password: data.password.password,
          first_name: data.userProfile.firstName,
          last_name: data.userProfile.lastName,
          rol: 'admin',
          client_id: clientResult.id,
          role_id: adminRole?.id || null,
        }),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({} as any));
        // Rollback: delete client and related data if user creation fails
        await supabase.from('dealerships').delete().eq('client_id', clientResult.id);
        await supabase.from('clients_vehicles_states').delete().eq('client_id', clientResult.id);
        await supabase.from('clients').delete().eq('id', clientResult.id);
        throw new Error('Error creando usuario: ' + (errJson?.message || res.statusText));
      }

      // Send welcome email (non-blocking)
      fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify({
          to: safeEmail(data.userProfile.email),
          subject: '¡Bienvenido a GoAutos!',
          content: `
            <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 16px;">
                <img src="https://portal.goauto.cl/lovable-uploads/GOAUTO.LOGO.29.09.25.AZUL.png" alt="GoAuto" style="height: 60px;" />
              </div>
              <div style="background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
                <h1 style="margin:0 0 12px; font-size: 22px; color:#111; text-align:center;">¡Bienvenido a GoAutos!</h1>
                <p style="margin:0; color:#444; line-height:1.6; text-align:center;">
                  Tu cuenta ha sido creada exitosamente. Ya puedes acceder al portal con tus credenciales.
                </p>
                <div style="text-align:center; margin-top: 22px;">
                  <a href="https://portal.goauto.cl" style="background:${APP_PRIMARY}; color:#fff; padding:12px 22px; text-decoration:none; border-radius:10px; font-weight:600;">
                    Acceder al Portal
                  </a>
                </div>
              </div>
              <p style="text-align:center; color:#777; font-size:12px; margin-top:14px;">© ${new Date().getFullYear()} GoAutos</p>
            </div>
          `,
        }),
      }).catch(() => {});

      // Slack notification (non-blocking)
      // Transform data to the format expected by the edge function
      const slackPayload = {
        onboardingData: {
          client: {
            name: data.companyInfo.name,
            logoUrl: '',
            primaryColor: APP_PRIMARY,
            email: safeEmail(data.companyInfo.email),
            phone: phoneE164,
          },
          dealerships: [{
            location: {
              lat: data.location.lat,
              lng: data.location.lng,
              address: data.location.address,
            },
            phone: phoneE164,
            email: safeEmail(data.companyInfo.email),
          }],
          user: {
            firstName: data.userProfile.firstName,
            lastName: data.userProfile.lastName,
            email: safeEmail(data.userProfile.email),
          },
        },
      };
      fetch(`${SUPABASE_URL}/functions/v1/slack-notification`, {
        method: 'POST',
        headers: edgeFunctionHeaders,
        body: JSON.stringify(slackPayload),
      }).catch(() => {});

      // Confetti
      fireSideCannons();

      // Login
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: safeEmail(data.userProfile.email),
        password: data.password.password,
      });

      if (loginError) {
        toast({ title: 'Cuenta creada exitosamente', description: 'Inicia sesión con tus credenciales' });
        setIsCreating(false);
        navigate('/login', { replace: true });
        return;
      }

      await new Promise((r) => setTimeout(r, 700));

      posthog.capture({
        distinctId: safeEmail(data.userProfile.email) || 'anonymous',
        event: 'onboarding_completed',
        properties: {
          company_name: data.companyInfo.name,
          email: safeEmail(data.userProfile.email),
        },
      });

      toast({ title: '¡Bienvenido a GoAutos!', description: 'Ahora crea tu primer vehículo y configura tu sitio web' });
      try {
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(STEP_KEY);
        sessionStorage.removeItem(SAVED_SNAPSHOT_KEY);
      } catch {}
      navigate('/in-app-onboarding', { replace: true });
      setTimeout(() => setIsCreating(false), 250);
    } catch (e) {
      console.error(e);
      setShakeKey((k) => k + 1);
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Error creando la cuenta',
        variant: 'destructive',
      });
      setIsCreating(false);
    } finally {
      unlock();
    }
  };

  const goNext = useCallback(async () => {
    const err = validateStep(step, data);
    if (err) {
      setShakeKey((k) => k + 1);
      toast({ title: 'Revisa los datos', description: err, variant: 'destructive' });
      return;
    }

    // Check unique name on step 2
    if (step === 2) {
      const ok = await checkClientNameUnique(data.companyInfo.name);
      if (!ok) {
        setShakeKey((k) => k + 1);
        toast({
          title: 'Nombre ya está en uso',
          description: 'Elige otro nombre de automotora para continuar.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (step < TOTAL_STEPS) {
      posthog.capture({
        distinctId: safeEmail(data.userProfile.email) || 'anonymous',
        event: 'onboarding_step_completed',
        properties: { step_number: step },
      });
      setStep((s) => s + 1);
      return;
    }

    // Final step - create account
    await finalSubmit();
  }, [step, data, checkClientNameUnique]);

  const onStepClick = (target: number) => {
    if (target === step) return;
    if (target < step) { setStep(target); return; }
    // Don't allow jumping forward
    for (let s = 1; s < target; s++) {
      const err = validateStep(s, data);
      if (err) {
        setShakeKey((k) => k + 1);
        toast({ title: 'No puedes saltar', description: `Completa el paso ${s} primero: ${err}`, variant: 'destructive' });
        return;
      }
    }
    setStep(target);
  };

  /** Animaciones */
  const stepAnim = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    exit:    { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.12, 0, 0.39, 0] as [number, number, number, number] } },
  };

  /** Atajos de teclado */
  useEffect(() => {
    const isTypingInField = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName.toLowerCase();
      const editable = el.isContentEditable;
      return editable || ['input', 'textarea', 'select', 'button'].includes(tag);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) {
        if ((e.key === 'Enter') && step === TOTAL_STEPS && !isCreating && !locked) {
          e.preventDefault();
          void goNext();
        }
        return;
      }
      if (isTypingInField(e.target)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (!isCreating && !locked) void goNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (step > 1) {
          goBack();
        } else {
          navigate('/login');
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goBack, isCreating, locked, step, navigate]);

  // UI para estado de guardado por paso
  const SaveBadge = () => {
    if (isSaving) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
          Guardando…
        </span>
      );
    }
    if (!stepValid) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
          <Clock className="h-3.5 w-3.5" />
          Pendiente
        </span>
      );
    }
    if (isDirty) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
          <Clock className="h-3.5 w-3.5" />
          Pendiente
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Guardado
      </span>
    );
  };

  return (
    <div className="relative min-h-screen">
      {/* Fondo suave */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full blur-3xl opacity-20"
             style={{ background: `radial-gradient(closest-side, ${uiBrand}, transparent 70%)`, animation: 'float 9s ease-in-out infinite alternate' }} />
        <div className="absolute -bottom-16 -right-24 h-[28rem] w-[28rem] rounded-full blur-3xl opacity-10"
             style={{ background: `radial-gradient(closest-side, ${uiBrand}33, transparent 70%)`, animation: 'float2 11s ease-in-out infinite alternate' }} />
        <style>{`
          @keyframes float { from { transform: translateY(0) } to { transform: translateY(20px) } }
          @keyframes float2 { from { transform: translateY(0) } to { transform: translateY(-24px) } }
          @keyframes shakeSoft { 0%,100%{ transform: translateX(0) } 25%{ transform: translateX(-6px) } 75%{ transform: translateX(6px) } }
          .animate-shake-soft { animation: shakeSoft .18s ease-in-out 0s 1; }
          .btn-ripple { position: relative; overflow: hidden; }
          .btn-ripple:after { content:''; position:absolute; inset:0; opacity:0; }
          .btn-ripple:active:after { opacity:.1; background:#000; }
        `}</style>
      </div>

      {/* Top bar con logo y progreso */}
      <div className="sticky top-0 z-40 backdrop-blur bg-white/75 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-[88px] flex items-center justify-between gap-4">
          <img src="/lovable-uploads/goauto-logo-black.png" alt="GoAuto" className="h-16 md:h-[72px] shrink-0" />

          {/* Progreso + estado de guardado */}
          <div className="flex items-center gap-3 w-64 sm:w-96">
            <div className="flex-1">
              <div className="h-2 rounded bg-slate-200 overflow-hidden">
                <div className="h-full rounded transition-[width] duration-300" style={{ width: `${progressPct}%`, backgroundColor: uiBrand }} />
              </div>
            </div>
            <div>
              <SaveBadge />
            </div>
          </div>
        </div>
      </div>

      {/* Contenido con vertical timeline */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 lg:py-10 pb-24 sm:pb-10">
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 lg:gap-8">
          {/* Left sidebar: Vertical Timeline */}
          <div className="hidden md:block md:sticky md:top-[104px] md:self-start">
            <div className="bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-5 sm:p-6">
              <VerticalTimeline
                currentStep={step}
                steps={timelineSteps}
                onStepClick={onStepClick}
              />
            </div>
          </div>

          {/* Right content: Step forms */}
          <div
            key={shakeKey}
            className={`bg-white/95 backdrop-blur rounded-2xl border border-slate-200 shadow-xl overflow-hidden ${shakeKey ? 'animate-shake-soft' : ''}`}
          >
            <div className="p-5 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-3xl">
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div key="step-1" initial={stepAnim.initial} animate={stepAnim.animate} exit={stepAnim.exit}>
                      <UserProfileStep
                        value={data.userProfile}
                        onChange={(patch) => setData((p) => ({ ...p, userProfile: { ...p.userProfile, ...patch } }))}
                      />
                    </motion.div>
                  )}
                  {step === 2 && (
                    <motion.div key="step-2" initial={stepAnim.initial} animate={stepAnim.animate} exit={stepAnim.exit}>
                      <CompanyInfoStep
                        value={data.companyInfo}
                        onChange={(patch) => setData((p) => ({ ...p, companyInfo: { ...p.companyInfo, ...patch } }))}
                      />
                    </motion.div>
                  )}
                  {step === 3 && (
                    <motion.div key="step-3" initial={stepAnim.initial} animate={stepAnim.animate} exit={stepAnim.exit}>
                      <LocationStep
                        value={data.location}
                        onChange={(patch) => setData((p) => ({ ...p, location: { ...p.location, ...patch } }))}
                      />
                    </motion.div>
                  )}
                  {step === 4 && (
                    <motion.div key="step-4" initial={stepAnim.initial} animate={stepAnim.animate} exit={stepAnim.exit}>
                      <PasswordStepNew
                        value={data.password}
                        onChange={(patch) => setData((p) => ({ ...p, password: { ...p.password, ...patch } }))}
                      />
                    </motion.div>
                  )}
                  {step === 5 && (
                    <motion.div key="step-5" initial={stepAnim.initial} animate={stepAnim.animate} exit={stepAnim.exit}>
                      <SummaryStepNew
                        userProfile={data.userProfile}
                        companyInfo={data.companyInfo}
                        location={data.location}
                        password={data.password}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation buttons */}
                <div className="mt-8 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() => (step > 1 ? goBack() : navigate('/login'))}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {step > 1 ? 'Anterior' : 'Salir'}
                  </Button>

                  {step < TOTAL_STEPS ? (
                    <Button
                      onClick={goNext}
                      disabled={!stepValid}
                      style={{ backgroundColor: uiBrand, borderColor: uiBrand }}
                      className="btn-ripple relative text-white hover:opacity-90"
                    >
                      Siguiente
                    </Button>
                  ) : (
                    <Button
                      onClick={goNext}
                      disabled={isCreating || locked || !!stepError}
                      style={{ backgroundColor: uiBrand, borderColor: uiBrand }}
                      className="btn-ripple relative text-white hover:opacity-90"
                    >
                      {isCreating ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creando…</>) : 'Crear cuenta'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div
        className="fixed bottom-0 inset-x-0 md:hidden z-50 border-t border-slate-200 bg-white/95 backdrop-blur"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: uiBrand }} />
              <span>Paso {step}/{TOTAL_STEPS}</span>
            </div>
            <div className="text-xs font-medium text-slate-900 pl-4">
              {timelineSteps.find(s => s.id === step)?.title || ''}
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => (step > 1 ? goBack() : navigate('/login'))}
              className="min-w-[108px]"
            >
              {step > 1 ? 'Anterior' : 'Salir'}
            </Button>

            {step < TOTAL_STEPS ? (
              <Button
                onClick={goNext}
                disabled={!stepValid}
                className="text-white hover:opacity-90 min-w-[108px]"
                style={{ backgroundColor: uiBrand, borderColor: uiBrand }}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={isCreating || locked || !!stepError}
                className="text-white hover:opacity-90 min-w-[128px]"
                style={{ backgroundColor: uiBrand, borderColor: uiBrand }}
              >
                {isCreating ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creando…</>) : 'Crear cuenta'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
