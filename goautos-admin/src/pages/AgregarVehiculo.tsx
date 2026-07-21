import VehicleAcquisitionForm from '@/components/vehiculos/agregar/VehicleAcquisitionForm';
import VehicleBasicInfoForm from '@/components/vehiculos/agregar/VehicleBasicInfoForm';
import VehicleMediaForm from '@/components/vehiculos/agregar/VehicleMediaForm';
import VehicleSalesForm from '@/components/vehiculos/agregar/VehicleSalesForm';
import VehicleSummary from '@/components/vehiculos/agregar/VehicleSummary';
import GetVehicleInfoByPatent from '@/components/vehicle/GetVehicleInfoByPatent';
import { useToast } from '@/hooks/use-toast';
import { useVehicleCreation } from '@/hooks/useVehicleCreation';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import OnboardingLayout from '@/layouts/OnboardingLayout';
import { MappedVehicleData } from '@/types/getapi';
import { VehicleType, VEHICLE_TYPE_HIDDEN_FIELDS } from '@/types/vehicle';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Car, Images, Lock, Settings, ClipboardCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import posthog from '@/utils/posthog';

type TabKey =
  | 'autocompletar'
  | 'info-basica'
  | 'multimedia'
  | 'adquisicion'
  | 'ventas'
  | 'resumen';

interface AgregarVehiculoProps {
  embedded?: boolean;
  forceOnboarding?: boolean;
  onDone?: () => void;
  onCancel?: () => void;
}

const STEPS: { key: TabKey; labelKey: string; fallback: string; icon: React.ElementType }[] = [
  { key: 'info-basica', labelKey: 'addVehicle.tabs.basic', fallback: 'Info básica', icon: Car },
  { key: 'multimedia', labelKey: 'addVehicle.tabs.media', fallback: 'Multimedia', icon: Images },
  { key: 'adquisicion', labelKey: 'addVehicle.tabs.acquisition', fallback: 'Adquisición', icon: Lock },
  { key: 'ventas', labelKey: 'addVehicle.tabs.sales', fallback: 'Venta', icon: Settings },
  { key: 'resumen', labelKey: 'addVehicle.tabs.summary', fallback: 'Resumen', icon: ClipboardCheck },
];

const AgregarVehiculo: React.FC<AgregarVehiculoProps> = ({
  embedded = false,
  forceOnboarding = false,
  onDone,
  onCancel,
}) => {
  const { t } = useTranslation('common');
  const [activeTab, setActiveTab] = useState<TabKey>('autocompletar');
  const [previousTab, setPreviousTab] = useState<TabKey | ''>('');
  const [savingError, setSavingError] = useState<string | null>(null);
  const [prefilledData, setPrefilledData] = useState<MappedVehicleData | null>(null);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { client, user } = useAuth();
  const [autocompleteEpoch, setAutocompleteEpoch] = useState(0);
  const isSavingRef = useRef(false);

  const isOnboardingMode = useMemo(() => {
    if (forceOnboarding) return true;
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const params = new URLSearchParams(search);
      return params.get('onboarding') === 'true';
    } catch {
      return false;
    }
  }, [forceOnboarding, location]);

  // Read ?acquisitionType=consignment|purchase from the URL so the documents
  // page can route users here to start a new consignment/purchase document.
  const preselectedAcquisitionType = useMemo<'purchase' | 'consignment' | null>(() => {
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const value = new URLSearchParams(search).get('acquisitionType');
      if (value === 'purchase' || value === 'consignment') return value;
      return null;
    } catch {
      return null;
    }
  }, [location]);

  const {
    vehicleData,
    updateBasicInfo,
    updateMedia,
    updateAcquisition,
    updateSales,
    saveVehicle,
    isLoading,
    tempMedia,
    setTempMedia,
  } = useVehicleCreation();

  // Seed the acquisition type from the query param (?acquisitionType=consignment|purchase).
  // Runs once on mount so the adquisicion step defaults to the right type.
  const seededAcqTypeRef = useRef(false);
  useEffect(() => {
    if (seededAcqTypeRef.current) return;
    if (!preselectedAcquisitionType) return;
    seededAcqTypeRef.current = true;
    updateAcquisition({
      acquisitionType: preselectedAcquisitionType,
      isConsigned: preselectedAcquisitionType === 'consignment',
      documentType: preselectedAcquisitionType,
    } as any);
  }, [preselectedAcquisitionType, updateAcquisition]);

  const tabOrder: TabKey[] = useMemo(
    () =>
      ['autocompletar', 'info-basica', 'multimedia', 'adquisicion', 'ventas', 'resumen'],
    []
  );

  // ===== VALIDACIONES mínimas
  const validateCurrentTab = (currentTab: TabKey, formData?: any) => {
    if (currentTab === 'ventas') {
      const s = formData ?? vehicleData.sales ?? {};
      const missingFields: string[] = [];
      const missingFieldKeys: string[] = [];

      const price = s.price;
      const priceNum = typeof price === 'number' ? price : parseFloat(String(price || '0').replace(/\./g, ''));
      if (!price || priceNum <= 0) {
        missingFields.push('Precio de venta');
        missingFieldKeys.push('price');
      }
      if (!s.statusId) {
        missingFields.push('Estado inicial');
        missingFieldKeys.push('statusId');
      }

      if (missingFields.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Campos requeridos',
          description: `Completa: ${missingFields.join(', ')}`,
        });
      }

      return {
        isValid: missingFields.length === 0,
        missingFields,
        missingFieldKeys,
      };
    }
    if (currentTab === 'adquisicion') {
      const acq = formData ?? vehicleData.acquisition ?? {};
      const missingFields: string[] = [];
      const missingFieldKeys: string[] = [];

      if (acq.isConsigned) {
        if (!acq.consignmentCustomerId) {
          missingFields.push('Consignatario');
          missingFieldKeys.push('consignmentCustomerId');
        }
        const price = acq.consignmentAgreedPrice;
        const priceNum = typeof price === 'number' ? price : parseFloat(String(price || '0').replace(/\./g, ''));
        if (!price || priceNum <= 0) {
          missingFields.push('Precio acordado');
          missingFieldKeys.push('consignmentAgreedPrice');
        }
      } else {
        if (!acq.purchaseCustomerId) {
          missingFields.push('Proveedor');
          missingFieldKeys.push('purchaseCustomerId');
        }
        const price = acq.purchasePrice;
        const priceNum = typeof price === 'number' ? price : parseFloat(String(price || '0').replace(/\./g, ''));
        if (!price || priceNum <= 0) {
          missingFields.push('Precio de compra');
          missingFieldKeys.push('purchasePrice');
        }
      }

      if (missingFields.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Campos requeridos',
          description: `Completa: ${missingFields.join(', ')}`,
        });
      }

      return {
        isValid: missingFields.length === 0,
        missingFields,
        missingFieldKeys,
      };
    }
    if (currentTab === 'info-basica') {
      const s = formData ?? vehicleData.basicInfo ?? {};
      const vType = (s.vehicle_type || 'car') as string;
      const hiddenForType = VEHICLE_TYPE_HIDDEN_FIELDS[vType as VehicleType] || [];
      const requiredFields: [string, string][] = [
        ['Patente', 'license_plate'],
        ['Marca', 'brand_id'],
        ['Modelo', 'model_id'],
        ['Año', 'year'],
        ['Kilometraje', 'mileage'],
        ['Tipo de combustible', 'fuel_type_id'],
        ['Transmisión', 'transmission'],
        ['Categoría', 'category_id'],
      ].filter(([_, key]) => !hiddenForType.includes(key));
      const missing = requiredFields.filter(([_, key]) => {
        const v = s[key];
        if (key === 'year') return !v || Number(v) < 1900;
        if (key === 'mileage') return !v || Number(String(v).replace(/\./g, '')) <= 0;
        return !v || v === '' || v === 'undefined';
      });
      return {
        isValid: missing.length === 0,
        missingFields: missing.map((m) => m[0]),
        missingFieldKeys: missing.map((m) => m[1]),
      };
    }
    if (currentTab === 'multimedia') {
      return {
        isValid: true,
        missingFields: [],
        missingFieldKeys: [],
      };
    }
    return { isValid: true, missingFields: [], missingFieldKeys: [] };
  };

  const handleTabChange = useCallback((value: TabKey, formData?: any) => {
    if (value === activeTab) return;

    // Only validate when moving FORWARD — going back is always allowed
    const currentIndex = tabOrder.indexOf(activeTab);
    const targetIndex = tabOrder.indexOf(value);
    const isGoingForward = targetIndex > currentIndex;

    if (isGoingForward && value !== 'autocompletar') {
      const validation = validateCurrentTab(activeTab, formData);
      if (!validation.isValid) {
        if (validation.missingFieldKeys.length > 0) {
          const el = document.querySelector(`[name="${validation.missingFieldKeys[0]}"]`) as HTMLElement;
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => el.focus(), 300);
          }
        }
        return;
      }
    }

    if (activeTab === 'multimedia' && tempMedia) {
      updateMedia(tempMedia);
    }

    setPreviousTab(activeTab);
    setActiveTab(value);
  }, [activeTab, tempMedia, updateMedia, tabOrder]);

  const handleNextStep = useCallback((currentTab: TabKey, formData?: any) => {
    const validation = validateCurrentTab(currentTab, formData);
    if (!validation.isValid) {
      if (validation.missingFieldKeys.length > 0) {
        const el = document.querySelector(`[name="${validation.missingFieldKeys[0]}"]`) as HTMLElement;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => el.focus(), 300);
        }
      }
      return;
    }
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex < tabOrder.length - 1) {
      const stepDef = STEPS.find((s) => s.key === currentTab);
      posthog.capture({
        distinctId: user?.id || 'anonymous',
        event: 'vehicle_form_step_completed',
        properties: {
          step_number: currentIndex + 1,
          step_name: stepDef?.fallback || currentTab,
        },
      });

      // Track media upload when advancing past multimedia step
      if (currentTab === 'multimedia' && formData) {
        const galleryCount = Array.isArray(formData.gallery) ? formData.gallery.length : 0;
        const docsCount = Array.isArray(formData.extraDocuments) ? formData.extraDocuments.length : 0;
        const hasMainImage = !!formData.mainImage;
        const totalMedia = (hasMainImage ? 1 : 0) + galleryCount + docsCount;

        if (totalMedia > 0) {
          posthog.capture({
            distinctId: user?.id || 'anonymous',
            event: 'vehicle_media_uploaded',
            properties: {
              media_count: totalMedia,
              media_type: {
                main_image: hasMainImage,
                gallery: galleryCount,
                documents: docsCount,
              },
            },
          });
        }
      }

      handleTabChange(tabOrder[currentIndex + 1], formData);
    }
  }, [handleTabChange, tabOrder, user]);

  const handlePreviousStep = useCallback((currentTab: TabKey) => {
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex > 0) handleTabChange(tabOrder[currentIndex - 1]);
  }, [handleTabChange, tabOrder]);

  const handleSaveVehicle = useCallback(async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;
    setSavingError(null);
    try {
      if (tempMedia) updateMedia(tempMedia);
      const result = await saveVehicle();
      if (!result) throw new Error(t('addVehicle.errors.saveFailed'));

      toast({
        title: t('addVehicle.toasts.savedTitle'),
        description: t('addVehicle.toasts.savedDescription'),
      });

      if ((isOnboardingMode || forceOnboarding) && client) {
        await supabase
          .from('clients')
          .update({ onboarding_status: 'creating_website' })
          .eq('id', client.id);
      }

      if (embedded) { onDone?.(); return; }

      if (isOnboardingMode) {
        navigate('/in-app-onboarding?jump=creating_website&ts=' + Date.now());
      } else {
        navigate('/vehiculos');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('addVehicle.errors.generic');
      setSavingError(msg);
      toast({ title: t('actions.error'), description: msg, variant: 'destructive' });
    } finally {
      isSavingRef.current = false;
    }
  }, [client, embedded, forceOnboarding, isOnboardingMode, navigate, onDone, saveVehicle, t, tempMedia, toast, updateMedia]);

  const handleVehicleDataFound = (data: MappedVehicleData) => {
    setPrefilledData(data);
    setActiveTab('info-basica');
  };
  const handleSkipAutocomplete = () => setActiveTab('info-basica');

  const back = useCallback(() => {
    if (onCancel) return onCancel();
    if (embedded) {
      setActiveTab('autocompletar');
      setPrefilledData(null);
      setAutocompleteEpoch((n) => n + 1);
      return;
    }
    // If we're on a step beyond autocompletar, go back to autocompletar first
    if (activeTab !== 'autocompletar') {
      const currIdx = tabOrder.indexOf(activeTab);
      const prevTab = currIdx > 0 ? tabOrder[currIdx - 1] : 'autocompletar';
      setPreviousTab(activeTab);
      setActiveTab(prevTab);
      if (prevTab === 'autocompletar') {
        setPrefilledData(null);
        setAutocompleteEpoch((n) => n + 1);
      }
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) return window.history.back();
    if (isOnboardingMode) return navigate('/in-app-onboarding');
    return navigate('/vehiculos');
  }, [embedded, isOnboardingMode, navigate, onCancel, activeTab, tabOrder]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') back(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [back]);

  // ===== Stepper helpers
  const activeStepIndex = STEPS.findIndex((s) => s.key === activeTab);
  const isAutocompletar = activeTab === 'autocompletar';

  const handleStepClick = (stepKey: TabKey) => {
    handleTabChange(stepKey);
  };

  // ===== Desktop Stepper (compact inline)
  const DesktopStepper = () => (
    <div className="hidden md:flex items-center gap-1 flex-1 max-w-xl mx-auto">
      {STEPS.map((step, idx) => {
        const isCompleted = idx < activeStepIndex;
        const isActive = idx === activeStepIndex;
        const isFuture = idx > activeStepIndex;

        return (
          <React.Fragment key={step.key}>
            <button
              type="button"
              onClick={() => handleStepClick(step.key)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap',
                isCompleted && 'text-sky-600 hover:bg-sky-50',
                isActive && 'text-sky-600',
                isFuture && 'text-slate-400 hover:text-slate-500'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0',
                  isCompleted && 'bg-sky-500 text-white',
                  isActive && 'bg-sky-400 text-white',
                  isFuture && 'bg-slate-200 text-slate-400'
                )}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : <span>{idx + 1}</span>}
              </div>
              {t(step.labelKey, { defaultValue: step.fallback })}
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-4 h-[1.5px] rounded-full shrink-0',
                  idx < activeStepIndex ? 'bg-sky-300' : 'bg-slate-200'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ===== Mobile Stepper
  const MobileStepper = () => {
    const progress = activeStepIndex >= 0 ? ((activeStepIndex + 1) / STEPS.length) * 100 : 0;
    const currentStep = STEPS[activeStepIndex];

    return (
      <div className="md:hidden flex items-center gap-3 flex-1">
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
          {activeStepIndex + 1}/{STEPS.length}
          {currentStep && (
            <span className="text-slate-700 ml-1.5">
              {t(currentStep.labelKey, { defaultValue: currentStep.fallback })}
            </span>
          )}
        </span>
        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-sky-400 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  // ===== Header with stepper
  const StepperHeader = () => (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
      <div className="flex items-center gap-3 px-4 md:px-6 py-2">
        <button
          type="button"
          onClick={back}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {!isAutocompletar && (
          <>
            <DesktopStepper />
            <MobileStepper />
            {/* Spacer to balance the back button for centering */}
            <div className="hidden md:block w-7 shrink-0" />
          </>
        )}
      </div>
    </div>
  );

  // ===== Animation direction
  const getDirection = () => {
    if (!previousTab) return 1;
    const prevIdx = tabOrder.indexOf(previousTab);
    const currIdx = tabOrder.indexOf(activeTab);
    return currIdx >= prevIdx ? 1 : -1;
  };

  const formMain = (
    <main className="flex-1 w-full bg-transparent">
      <div className={`space-y-0 max-w-full`}>
        {!embedded && <StepperHeader />}

        {embedded && (
          <div className="flex items-center mb-2 px-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={back}
              className="shadow-sm backdrop-blur bg-white/70 hover:bg-white border-slate-200 rounded-full px-3 text-sm font-medium flex items-center gap-1 transition-transform duration-150 active:scale-[0.98]"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver
            </Button>
          </div>
        )}

        <div className={`${embedded ? 'p-0' : 'p-4 md:p-6'}`}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: getDirection() * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: getDirection() * -30 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {activeTab === 'autocompletar' && (
                <GetVehicleInfoByPatent
                  key={`auto-${autocompleteEpoch}`}
                  onVehicleDataFound={handleVehicleDataFound}
                  onSkip={handleSkipAutocomplete}
                />
              )}

              {activeTab === 'info-basica' && (
                <VehicleBasicInfoForm
                  initialData={vehicleData}
                  prefilledData={prefilledData}
                  onSave={(data) => updateBasicInfo(data)}
                  onNext={(formData) => handleNextStep('info-basica', formData)}
                  showMinimalBasicInfo
                />
              )}

              {activeTab === 'multimedia' && (
                <VehicleMediaForm
                  initialData={vehicleData}
                  onSave={updateMedia}
                  onTempSave={setTempMedia}
                  onNext={(mediaData) => handleNextStep('multimedia', mediaData)}
                  onPrevious={() => handlePreviousStep('multimedia')}
                />
              )}

              {activeTab === 'adquisicion' && (
                <VehicleAcquisitionForm
                  initialData={vehicleData}
                  onSave={(acq) => { updateAcquisition(acq); return true; }}
                  onNext={() => handleNextStep('adquisicion')}
                  onPrevious={() => handlePreviousStep('adquisicion')}
                />
              )}

              {activeTab === 'ventas' && (
                <VehicleSalesForm
                  initialData={vehicleData}
                  onSave={updateSales}
                  onNext={(salesData) => handleNextStep('ventas', salesData)}
                  onPrevious={() => handlePreviousStep('ventas')}
                />
              )}

              {activeTab === 'resumen' && (
                <VehicleSummary
                  vehicleData={vehicleData}
                  onSave={handleSaveVehicle}
                  onPrevious={() => handlePreviousStep('resumen')}
                  isLoading={isLoading}
                  error={savingError}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );

  if (embedded) return formMain;
  if (isOnboardingMode) return <OnboardingLayout>{formMain}</OnboardingLayout>;
  return <DashboardLayout>{formMain}</DashboardLayout>;
};

export default AgregarVehiculo;
