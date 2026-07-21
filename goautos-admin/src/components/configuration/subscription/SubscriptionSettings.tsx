import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CreditCard,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  MessageCircle,
  Mail,
  AlertTriangle,
  Sparkles,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { subscriptionService } from '@/services/subscriptionService';

// Alineada con las columnas REALES de la tabla subscriptions en prod (ver
// migración 20260630120000): la fecha del próximo cobro es next_payment_date
// (current_period_end NUNCA existió → mostraba "Invalid Date").
interface Subscription {
  id: number;
  status: 'active' | 'cancelled' | 'past_due' | 'trial' | 'trialing' | 'inactive';
  next_payment_date: string | null;
  trial_ends_at: string | null;
  card_last_four?: string | null;
  plan_type?: string | null;
  reason?: string | null;
  amount?: number | null;
  preapproval_id?: string | null;
  created_at: string;
}

const SubscriptionSettings: React.FC = () => {
  const { t } = useTranslation('subscription');
  const { clientId } = useAuth();
  const [, navigate] = useLocation();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState(1);
  const [cancelReason, setCancelReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchSubscription();
    }
  }, [clientId]);

  const fetchSubscription = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const trialStyle = { icon: Sparkles, className: 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-md shadow-purple-500/25' };
    const statusConfig = {
      active: { icon: CheckCircle2, className: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
      trialing: trialStyle,
      trial: trialStyle,
      past_due: { icon: AlertCircle, className: 'bg-red-500 text-white' },
      cancelled: { icon: XCircle, className: 'bg-gray-500 text-white' },
      inactive: { icon: XCircle, className: 'bg-gray-400 text-white' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    const Icon = config.icon;

    // La key i18n de past_due es "pastDue" (camelCase) — con la key cruda el
    // badge mostraba "past_due" literal.
    const i18nKey = status === 'past_due' ? 'pastDue' : status;

    return (
      <span className={`${config.className} inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap`}>
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        {t(`status.${i18nKey}`)}
      </span>
    );
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleCancelSubscription = async () => {
    if (confirmText.toUpperCase() !== 'CANCELAR' && confirmText.toUpperCase() !== 'CANCEL') {
      return;
    }

    setIsCancelling(true);
    try {
      await subscriptionService.cancelSubscription(
        clientId,
        cancelReason,
        cancelReason === 'other' ? otherReason : undefined
      );

      toast.success(t('messages.cancelled'), {
        description: t('messages.cancelledDescription')
      });

      setIsCancelDialogOpen(false);
      setCancelStep(1);
      setCancelReason('');
      setOtherReason('');
      setConfirmText('');
      fetchSubscription();
    } catch (error) {
      toast.error(t('messages.error'));
    } finally {
      setIsCancelling(false);
    }
  };

  const openCancelDialog = () => {
    setCancelStep(1);
    setCancelReason('');
    setOtherReason('');
    setConfirmText('');
    setIsCancelDialogOpen(true);
  };

  const cancelReasons = [
    'tooExpensive',
    'notUsing',
    'missingFeatures',
    'technicalIssues',
    'foundAlternative',
    'closingBusiness',
    'temporaryPause',
    'other'
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No subscription - show activate prompt
  if (!subscription || subscription.status === 'inactive' || subscription.status === 'cancelled') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {t('settings.title')}
          </CardTitle>
          <CardDescription>{t('settings.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              {t('settings.noActiveSubscription')}
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              {t('settings.activateDescription')}
            </p>
            <Button
              onClick={() => navigate('/subscribe')}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {t('settings.activateNow')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active subscription view
  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('settings.title')}
              </CardTitle>
              <CardDescription>{t('settings.description')}</CardDescription>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(subscription.status)}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wide">
                {t('settings.planDetails')}
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">{t('status.currentPlan')}</span>
                  {/* Plan real de la suscripción (ej "Plan BROKIE"); el i18n fijo queda de último recurso */}
                  <span className="font-medium">{subscription.plan_type || subscription.reason || t('plan.title')}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">{t('status.billingCycle')}</span>
                  <span className="font-medium">
                    {subscription.plan_type === 'annual' ? t('status.annual') : t('status.monthly')}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">
                    {subscription.plan_type === 'annual' ? t('status.annualAmount') : t('status.monthlyAmount')}
                  </span>
                  <span className="font-semibold text-lg">
                    {subscription.amount ? formatCurrency(subscription.amount) : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-sm text-slate-500 uppercase tracking-wide">
                {t('settings.paymentInfo')}
              </h4>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">{t('status.memberSince')}</span>
                  <span className="font-medium">{formatDate(subscription.created_at)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-600">{t('status.nextPayment')}</span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{formatDate(subscription.next_payment_date)}</span>
                  </div>
                </div>

                {(subscription.status === 'trial' || subscription.status === 'trialing') && (() => {
                  // El fin del trial vive en trial_ends_at; el primer cobro en next_payment_date.
                  const trialEnd = subscription.trial_ends_at || subscription.next_payment_date;
                  if (!trialEnd) return null;
                  const daysLeft = Math.max(0, Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                  return (
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">{t('status.trialPeriod')}</span>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{daysLeft} {t('status.daysRemaining')}</span>
                      </div>
                    </div>
                  );
                })()}

                {subscription.card_last_four && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-600">{t('status.paymentMethod')}</span>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      {/* card_brand no existe en la tabla; solo tenemos los últimos 4 */}
                      <span className="font-medium">•••• {subscription.card_last_four}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t">
            {subscription.preapproval_id ? (
              // Suscripción real de MercadoPago: la tarjeta se gestiona ALLÁ (el
              // checkout /subscribe crearía OTRA suscripción y cobraría de nuevo).
              <div className="space-y-1.5">
                <a
                  href="https://www.mercadopago.cl/subscriptions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  <CreditCard className="h-4 w-4" />
                  {t('settings.manageInMp')}
                </a>
                <p className="text-xs text-slate-400">{t('settings.manageInMpHint')}</p>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/subscribe')}
                className="w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {t('status.updatePayment')}
              </Button>
            )}
          </div>

          {/* Hidden cancel link */}
          <p className="text-[11px] text-slate-400 mt-4">
            {t('status.needHelp')}{' '}
            <button
              type="button"
              onClick={openCancelDialog}
              className="text-slate-400 hover:text-slate-500 underline transition-colors"
            >
              {t('status.cancel').toLowerCase()}
            </button>
          </p>
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog - Multi-step */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all ${
                  step === cancelStep
                    ? 'w-8 bg-blue-600'
                    : step < cancelStep
                    ? 'w-2 bg-blue-600'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Simple confirmation */}
          {cancelStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  {t('cancel.step1.title')}
                </DialogTitle>
                <DialogDescription>
                  ¿Estás seguro que deseas cancelar tu suscripción? 😔 Lamentamos que quieras irte.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                  No, mantener suscripción
                </Button>
                <Button onClick={() => setCancelStep(2)} variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                  Sí, continuar
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Select Reason */}
          {cancelStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  {t('cancel.step1.title')}
                </DialogTitle>
                <DialogDescription>
                  {t('cancel.step1.description')}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <Label className="text-sm font-medium mb-3 block">
                  {t('cancel.step1.selectReason')}
                </Label>
                <RadioGroup value={cancelReason} onValueChange={setCancelReason}>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {cancelReasons.map((reason) => (
                      <div key={reason} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50 cursor-pointer">
                        <RadioGroupItem value={reason} id={reason} />
                        <Label htmlFor={reason} className="flex-1 cursor-pointer text-sm">
                          {t(`cancel.step1.reasons.${reason}`)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>

                {cancelReason === 'other' && (
                  <Textarea
                    className="mt-3"
                    placeholder={t('cancel.step1.otherPlaceholder')}
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                  />
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCancelStep(1)}>
                  {t('cancel.step3.goBack')}
                </Button>
                <Button
                  onClick={() => setCancelStep(3)}
                  disabled={!cancelReason || (cancelReason === 'other' && !otherReason)}
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-slate-400"
                >
                  {t('cancel.step1.continue')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}

          {/* Step 3: ¿Podemos solucionarlo? */}
          {cancelStep === 3 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                  ¿Podemos solucionarlo?
                </DialogTitle>
                <DialogDescription>
                  Antes de cancelar, queremos ayudarte. Podemos ofrecerte:
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 space-y-2">
                <div className="flex items-center gap-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-emerald-900">
                    {t('cancel.step2.offers.discount')}
                  </p>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                  <Clock className="h-5 w-5 text-blue-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-blue-900">
                    {t('cancel.step2.offers.pause')}
                  </p>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                  <MessageCircle className="h-5 w-5 text-purple-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-purple-900">
                    {t('cancel.step2.offers.support')}
                  </p>
                </div>
                <div className="flex items-center gap-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                  <Sparkles className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <p className="text-sm font-medium text-amber-900">
                    {t('cancel.step2.offers.features')}
                  </p>
                </div>

                <div className="pt-3">
                  <Button
                    className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white"
                    onClick={() => window.open('https://wa.me/56989904038?text=Hola,%20estoy%20considerando%20cancelar%20mi%20suscripcion%20y%20me%20gustaria%20hablar%20con%20un%20ejecutivo', '_blank')}
                  >
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    ¡Conversemos!
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center gap-3 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => setCancelStep(2)}>
                  {t('cancel.step3.goBack')}
                </Button>
                <button
                  type="button"
                  onClick={() => setCancelStep(4)}
                  className="text-xs text-slate-400 hover:text-slate-500 transition-colors"
                >
                  Omitir y continuar
                </button>
              </div>
            </>
          )}

          {/* Step 4: Confirm Cancellation */}
          {cancelStep === 4 && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  {t('cancel.step3.title')}
                </DialogTitle>
                <DialogDescription>
                  {t('cancel.step3.description')}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2 p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-700">{t('cancel.step3.consequences.website')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                    <p className="text-sm text-red-700">{t('cancel.step3.consequences.features')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                    <p className="text-sm text-amber-700">{t('cancel.step3.consequences.data')}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <p className="text-sm text-emerald-700">{t('cancel.step3.consequences.reactivate')}</p>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t('cancel.step3.confirmText')}
                  </Label>
                  <Input
                    placeholder={t('cancel.step3.confirmPlaceholder')}
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button variant="outline" onClick={() => setCancelStep(3)}>
                  {t('cancel.step3.goBack')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={isCancelling || (confirmText.toUpperCase() !== 'CANCELAR' && confirmText.toUpperCase() !== 'CANCEL')}
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('cancel.step3.cancelling')}
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      {t('cancel.step3.cancelSubscription')}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionSettings;
