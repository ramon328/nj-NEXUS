import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService } from '@/services/subscriptionService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2, Lock, ArrowRight, Check, Calendar,
  Shield, CheckCircle2, Sparkles, CreditCard
} from 'lucide-react';

/* ---------- Luhn Algorithm ---------- */
const validateLuhn = (n: string) => {
  const d = n.replace(/\s/g, '');
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0, even = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let x = parseInt(d[i], 10);
    if (even) { x *= 2; if (x > 9) x -= 9; }
    sum += x; even = !even;
  }
  return sum % 10 === 0;
};

/* ---------- Helpers ---------- */
const formatCardNumber = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})/g, '$1 ').trim();
const getBrand = (num: string): 'visa' | 'mc' | 'amex' | 'unknown' => {
  const n = num.replace(/\s/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mc';
  if (/^3[47]/.test(n)) return 'amex';
  return 'unknown';
};

/* ---------- Premium Card Preview ---------- */
const CardPreview: React.FC<{
  number: string;
  name: string;
  month: string;
  year: string;
  cvv: string;
  brand: string;
  flipped: boolean;
}> = ({ number, name, month, year, cvv, brand, flipped }) => {
  const displayNumber = number || '•••• •••• •••• ••••';
  const displayName = name || 'TU NOMBRE';
  const displayExp = `${month || 'MM'}/${year || 'YY'}`;
  const displayCvv = cvv || '•••';

  const brandConfig = {
    visa: {
      label: 'VISA',
      gradient: 'from-zinc-800 via-zinc-700 to-zinc-900',
    },
    mc: {
      label: 'mastercard',
      gradient: 'from-zinc-800 via-zinc-700 to-zinc-900',
    },
    amex: {
      label: 'AMEX',
      gradient: 'from-zinc-800 via-zinc-700 to-zinc-900',
    },
    unknown: {
      label: '',
      gradient: 'from-zinc-800 via-zinc-700 to-zinc-900',
    }
  };

  const config = brandConfig[brand];

  return (
    <div className="relative w-full max-w-[340px] mx-auto" style={{ perspective: '1200px' }}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full aspect-[1.586/1]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${config.gradient} p-5 flex flex-col justify-between overflow-hidden`}
          style={{
            backfaceVisibility: 'hidden',
            boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.1) inset'
          }}
        >
          {/* Glossy shine effect - top highlight */}
          <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 via-white/5 to-transparent pointer-events-none rounded-t-2xl" />
          {/* Subtle edge highlights */}
          <div className="absolute top-0 left-0 right-0 h-px bg-white/30 rounded-t-2xl" />
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/5 to-transparent" />

          {/* Top row */}
          <div className="flex justify-between items-start relative z-10">
            {/* Chip - Silver metallic */}
            <div className="w-11 h-8 rounded-md bg-gradient-to-br from-gray-300 via-gray-100 to-gray-400 shadow-lg relative overflow-hidden border border-white/20">
              <div className="absolute inset-0.5 rounded bg-gradient-to-br from-gray-200 to-gray-300" />
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-400/60" />
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-400/60" />
            </div>
            {brand !== 'unknown' && (
              <span className="text-white/90 font-bold text-lg tracking-[0.2em]">
                {config.label}
              </span>
            )}
          </div>

          {/* Number */}
          <div className="relative z-10 my-3">
            <div className="text-white text-base sm:text-lg tracking-[0.2em] font-mono font-medium text-center whitespace-nowrap">
              {displayNumber}
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex justify-between items-end relative z-10">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Titular</div>
              <div className="text-white/90 text-sm font-medium truncate tracking-wide">{displayName}</div>
            </div>
            <div className="text-right ml-4">
              <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Válida hasta</div>
              <div className="text-white/90 text-sm font-medium tracking-wider">{displayExp}</div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-b ${config.gradient} overflow-hidden`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.35)'
          }}
        >
          {/* Glossy effect on back too */}
          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/15 to-transparent pointer-events-none rounded-t-2xl" />
          {/* Magnetic stripe */}
          <div className="h-12 bg-black/90 mt-6" />

          {/* Signature + CVV */}
          <div className="px-5 mt-5">
            <div className="flex items-stretch gap-3">
              <div className="flex-1 h-10 bg-white/90 rounded-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,#d1d5db,#d1d5db_1px,transparent_1px,transparent_4px)]" />
              </div>
              <div className="w-14 h-10 bg-white rounded-sm flex items-center justify-center">
                <span className="text-zinc-800 font-mono text-base font-bold tracking-widest">{displayCvv}</span>
              </div>
            </div>
            <div className="text-[9px] text-white/40 mt-2 text-right tracking-wider">CVV</div>
          </div>

          <div className="absolute bottom-4 left-5 right-5 text-[8px] text-white/20 leading-relaxed">
            Tarjeta de crédito/débito
          </div>
        </div>
      </motion.div>
    </div>
  );
};

/* ======================= MAIN PAGE ======================= */
const Subscribe: React.FC = () => {
  const [, navigate] = useLocation();
  const { user, clientId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [isPaymentUpdate, setIsPaymentUpdate] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);

  // Controlled form state
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [cvvFocused, setCvvFocused] = useState(false);

  // Derived values
  const brand = getBrand(cardNumber);
  const formattedNumber = formatCardNumber(cardNumber);

  // Pricing (210.000 + IVA 19%)
  const basePrice = 210000;
  const monthlyPrice = Math.round(basePrice * 1.19); // 249.900
  const annualWithoutDiscount = monthlyPrice * 12; // 2.998.800
  const annualPrice = 2499000; // Precio fijo anual
  const annualSavings = annualWithoutDiscount - annualPrice; // 499.800
  const finalPrice = annual ? annualPrice : monthlyPrice;

  // Validation
  const isCardValid = validateLuhn(cardNumber);
  const isHolderValid = cardHolder.length >= 3;
  const isExpValid = /^(0[1-9]|1[0-2])$/.test(expMonth) && /^\d{2}$/.test(expYear);
  const isCvvValid = cvv.length >= 3;
  const isFormValid = isCardValid && isHolderValid && isExpValid && isCvvValid;

  // Check if client already has a subscription (payment update case)
  useEffect(() => {
    const checkExistingSubscription = async () => {
      if (!clientId) {
        setIsCheckingSubscription(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('id, status, preapproval_id')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error checking subscription:', error);
        } else if (data) {
          // Candado anti doble-cobro: si ya hay una suscripción VIGENTE enlazada
          // (flujo de pago automático MercadoPago), acá no hay nada que pagar.
          const isCurrentlyPaying = ['active', 'trial', 'trialing', 'authorized'].includes(data.status);
          if (isCurrentlyPaying) {
            toast({
              title: 'Tu suscripción ya está activa',
              description: 'No necesitas pagar de nuevo. Puedes ver tu plan en Configuración → Suscripción.',
            });
            navigate('/', { replace: true });
            return;
          }
          // Flujo NUEVO (suscripción MercadoPago con preapproval): la reactivación
          // de un moroso/cancelado NO pasa por este checkout — crearía una SEGUNDA
          // preapproval sin cancelar la anterior (doble cobro) y con el precio
          // hardcodeado de esta página (distinto a su plan). Se reactiva con un
          // link nuevo del ejecutivo (CRM). Los clientes legados (sin preapproval)
          // conservan este checkout como siempre.
          const isNewFlow = Boolean(data.preapproval_id);
          const isLapsed = ['past_due', 'cancelled'].includes(data.status);
          if (isNewFlow && isLapsed) {
            toast({
              title: 'Tu suscripción necesita reactivarse',
              description: 'Contacta a tu ejecutivo de GoAuto y te enviaremos un nuevo link de pago con tu plan.',
            });
            navigate('/subscription-required', { replace: true });
            return;
          }
          // If there's any previous subscription (even cancelled), this is an update
          // Only give trial to truly new customers who never had a subscription
          const hasHadSubscription = ['active', 'trial', 'past_due', 'trialing', 'cancelled'].includes(data.status);
          setIsPaymentUpdate(hasHadSubscription);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
      } finally {
        setIsCheckingSubscription(false);
      }
    };

    checkExistingSubscription();
  }, [clientId, navigate]);

  useEffect(() => {
    if (!isCheckingSubscription) {
      document.getElementById('card_number')?.focus();
    }
  }, [isCheckingSubscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !clientId || !user?.email) {
      toast({ title: 'Error', description: 'Completa todos los campos correctamente', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
      await subscriptionService.createSubscription({
        card_number: cardNumber.replace(/\s/g, ''),
        cardholder: cardHolder,
        expiration_month: expMonth,
        expiration_year: String(currentCentury + parseInt(expYear, 10)),
        security_code: cvv,
        payer_email: user.email,
        client_id: clientId,
        transaction_amount: finalPrice,
        is_payment_update: isPaymentUpdate,
      });
      toast({
        title: isPaymentUpdate ? 'Método de pago actualizado' : 'Suscripción activada',
        description: isPaymentUpdate
          ? 'Tu suscripción ha sido reactivada y el cobro se realizará de inmediato.'
          : '7 días gratis. Cobraremos después del periodo.'
      });
      navigate('/', { replace: true });
    } catch (error) {
      toast({ title: 'Error', description: 'No pudimos activar tu suscripción. Revisa los datos de tu tarjeta e intenta de nuevo.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    'Sitio web publicado y personalizado',
    'Inventario ilimitado con fotos HD',
    'Leads + Meta + Email integrados',
    'Gestión de ventas y financiamiento',
    'Documentos y contratos automáticos',
    'Soporte prioritario 24/7'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50 flex flex-col">
      {/* Header */}
      <header className="relative z-10 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/lovable-uploads/GOAUTO.LOGO.29.09.25.NEGRO.png" alt="GoAuto" className="h-7" />
            <div className="h-5 w-px bg-slate-300 hidden sm:block" />
            <span className="text-sm text-slate-500 hidden sm:inline">
              {isPaymentUpdate ? 'Actualizar método de pago' : 'Activar suscripción'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Lock className="h-4 w-4 text-emerald-500" />
            <span>Pago seguro</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="grid lg:grid-cols-[1.1fr_1fr]">

              {/* Left: Plan Info */}
              <div className="relative p-8 lg:p-10 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <div className="relative">
                  {/* Toggle */}
                  <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 shadow-inner mb-8">
                    <button
                      type="button"
                      onClick={() => setAnnual(false)}
                      className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 ${
                        !annual
                          ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Mensual
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnual(true)}
                      className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 ${
                        annual
                          ? 'bg-white text-slate-900 shadow-lg shadow-slate-200/50'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Anual
                      <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold">
                        −${Math.round(annualSavings / 1000)}k
                      </span>
                    </button>
                  </div>

                  {/* Free Trial Badge / Payment Update Badge */}
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white shadow-lg mb-6 ${
                      isPaymentUpdate
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/30'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-500/30'
                    }`}
                  >
                    {isPaymentUpdate ? (
                      <>
                        <CreditCard className="h-4 w-4" />
                        <span className="font-bold text-sm">Actualizar método de pago</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span className="font-bold text-sm">7 días gratis para probar</span>
                      </>
                    )}
                  </motion.div>

                  {/* Price */}
                  <div className="mb-8">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={annual ? 'annual' : 'monthly'}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {annual && (
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xl text-slate-400 line-through font-medium">
                              ${annualWithoutDiscount.toLocaleString('es-CL')}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold shadow-sm">
                              Ahorra ${annualSavings.toLocaleString('es-CL')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-black text-slate-900 tracking-tight">
                            ${finalPrice.toLocaleString('es-CL')}
                          </span>
                          <span className="text-xl text-slate-400 font-medium">{annual ? '/año' : '/mes'}</span>
                        </div>
                        <p className="text-slate-500 mt-2">
                          {annual ? '12 meses con descuento aplicado' : `$${basePrice.toLocaleString('es-CL')} + IVA (19%)`}
                        </p>
                        {isPaymentUpdate && (
                          <p className="text-amber-600 mt-2 text-sm font-medium">
                            El cobro se realizará de inmediato
                          </p>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {features.map((feature, idx) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex items-center gap-3 group"
                      >
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                          <Check className="h-3.5 w-3.5 text-white stroke-[3]" />
                        </div>
                        <span className="text-slate-600 text-sm font-medium">{feature}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Trust badges */}
                  <div className="flex items-center gap-6 pt-6 border-t border-slate-200/60">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Shield className="h-5 w-5 text-emerald-500" />
                      <span className="text-xs font-medium">Datos cifrados</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      <span className="text-xs font-medium">Cancela cuando quieras</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Payment Form */}
              <div className="p-8 lg:p-10 bg-white">
                {/* Card Preview */}
                <div className="mb-8">
                  <CardPreview
                    number={formattedNumber}
                    name={cardHolder}
                    month={expMonth}
                    year={expYear}
                    cvv={cvv}
                    brand={brand}
                    flipped={cvvFocused}
                  />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Card Number */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-700">Número de tarjeta</label>
                      <AnimatePresence>
                        {isCardValid && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input
                        id="card_number"
                        value={formattedNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="1234 5678 9012 3456"
                        className="h-12 pl-12 text-lg tracking-widest font-mono border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        inputMode="numeric"
                        autoComplete="cc-number"
                      />
                    </div>
                  </div>

                  {/* Cardholder */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-slate-700">Nombre del titular</label>
                      <AnimatePresence>
                        {isHolderValid && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <Input
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                      placeholder="COMO APARECE EN LA TARJETA"
                      className="h-12 text-base uppercase tracking-wide border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      autoComplete="cc-name"
                    />
                  </div>

                  {/* Expiry + CVV */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">Vencimiento</label>
                        <AnimatePresence>
                          {isExpValid && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          value={expMonth}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 2);
                            setExpMonth(v);
                            if (v.length === 2) document.getElementById('exp_year')?.focus();
                          }}
                          placeholder="MM"
                          className="h-12 w-16 text-center text-lg font-mono border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                          inputMode="numeric"
                          autoComplete="cc-exp-month"
                        />
                        <span className="text-slate-300 text-xl">/</span>
                        <Input
                          id="exp_year"
                          value={expYear}
                          onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          placeholder="YY"
                          className="h-12 w-16 text-center text-lg font-mono border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                          inputMode="numeric"
                          autoComplete="cc-exp-year"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-semibold text-slate-700">CVV</label>
                        <AnimatePresence>
                          {isCvvValid && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <Input
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        onFocus={() => setCvvFocused(true)}
                        onBlur={() => setCvvFocused(false)}
                        placeholder="•••"
                        className="h-12 text-lg font-mono text-center tracking-widest border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        type="password"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button
                      type="submit"
                      disabled={!isFormValid || isSubmitting || isCheckingSubscription}
                      className={`w-full h-14 text-base font-bold shadow-xl disabled:opacity-50 disabled:shadow-none transition-all duration-300 ${
                        isPaymentUpdate
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/30'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/30'
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Procesando pago...
                        </>
                      ) : isCheckingSubscription ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Cargando...
                        </>
                      ) : isPaymentUpdate ? (
                        <>
                          Actualizar y pagar ahora
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      ) : (
                        <>
                          Activar suscripción
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </motion.div>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Procesado de forma segura por <span className="font-semibold text-slate-500">Mercado Pago</span></span>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>

          {/* Help */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center"
          >
            <button
              type="button"
              onClick={() => window.open('https://wa.me/56937177677?text=Hola,%20necesito%20ayuda%20con%20GoAuto', '_blank')}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              ¿Necesitas ayuda? <span className="underline">Contáctanos por WhatsApp</span>
            </button>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Subscribe;
