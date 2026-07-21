import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, Building2, Palette, Search, MapPin } from 'lucide-react';
import { Client } from './types';
import { useClientDialog } from './useClientDialog';
import { useI18n } from '@/hooks/useI18n';
import BasicInfoFields from './form-sections/BasicInfoFields';
import ThemeFields from './form-sections/ThemeFields';
import SeoFields from './form-sections/SeoFields';
import ContactLocationFields from './form-sections/ContactLocationFields';

import { Drawer, DrawerContent, DrawerContentRight } from '@/components/ui/drawer';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ClientDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  client: Client | null;
}

type Step = {
  id: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ElementType;
};

const steps: Step[] = [
  {
    id: 1,
    title: 'Información Básica',
    shortTitle: 'Básica',
    description: 'Nombre, dominio y configuración general',
    icon: Building2,
  },
  {
    id: 2,
    title: 'Tema y Colores',
    shortTitle: 'Tema',
    description: 'Personalización visual del sitio',
    icon: Palette,
  },
  {
    id: 3,
    title: 'SEO',
    shortTitle: 'SEO',
    description: 'Optimización para buscadores',
    icon: Search,
  },
  {
    id: 4,
    title: 'Contacto y Ubicación',
    shortTitle: 'Contacto',
    description: 'Datos de contacto y localización',
    icon: MapPin,
  },
];

const ClientDialog = ({ open, onClose, onSave, client }: ClientDialogProps) => {
  const { form, isLoading, handleSaveClient } = useClientDialog(
    client,
    onSave,
    onClose
  );
  const { tCommon, tNav } = useI18n();
  const [currentStep, setCurrentStep] = useState(1);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Reset step when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep(1);
    }
  }, [open]);

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === steps.length;

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    setCurrentStep(stepId);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BasicInfoFields form={form} />;
      case 2:
        return <ThemeFields form={form} />;
      case 3:
        return <SeoFields form={form} />;
      case 4:
        return <ContactLocationFields form={form} />;
      default:
        return null;
    }
  };

  const currentStepData = steps.find((s) => s.id === currentStep)!;

  const dialogContent = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSaveClient)}
        className="flex flex-col flex-1 min-h-0"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <div className="px-4 py-2 sm:px-5 sm:py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-[14px] sm:text-[16px] font-semibold text-slate-900 leading-tight">
            {client
              ? tNav('breadcrumbs.editClient')
              : tNav('breadcrumbs.addClient')}
          </h2>
        </div>

        {/* Step Indicator - Desktop */}
        <div className="hidden sm:block px-5 py-3 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={cn(
                    'flex items-center gap-2.5 group transition-all duration-200',
                    currentStep === step.id
                      ? 'opacity-100'
                      : currentStep > step.id
                      ? 'opacity-70 hover:opacity-100'
                      : 'opacity-40 hover:opacity-60'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200',
                      currentStep === step.id
                        ? 'bg-cyan-500 text-white shadow-sm'
                        : currentStep > step.id
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'
                    )}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-left">
                    <p
                      className={cn(
                        'text-xs font-medium transition-colors',
                        currentStep === step.id
                          ? 'text-slate-900'
                          : 'text-slate-500'
                      )}
                    >
                      {step.shortTitle}
                    </p>
                  </div>
                </button>

                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-3 rounded-full transition-colors duration-300',
                      currentStep > step.id ? 'bg-emerald-400' : 'bg-slate-200'
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Step Indicator - Mobile */}
        <div className="sm:hidden px-5 py-2.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-500 text-white text-[11px] font-semibold">
                {currentStep}
              </div>
              <p className="text-sm font-medium text-slate-900">
                {currentStepData.title}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {steps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    currentStep === step.id
                      ? 'w-5 bg-cyan-500'
                      : currentStep > step.id
                      ? 'w-1.5 bg-emerald-400'
                      : 'w-1.5 bg-slate-300'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
          <div className="space-y-4">
            {renderStepContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={isFirstStep ? onClose : handleBack}
              className="gap-2 rounded-xl"
            >
              {isFirstStep ? (
                tCommon('buttons.cancel')
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <span className="sm:hidden">Sig.</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{tCommon('actions.processing')}</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>
                        {client ? tCommon('buttons.save') : tCommon('buttons.add')}
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()} direction="right">
        <DrawerContentRight className="md:min-w-[560px] md:max-w-[640px]">
          <div className="flex flex-col h-full">
            {dialogContent}
          </div>
        </DrawerContentRight>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <div className="flex flex-col h-full max-h-[92vh]">
          {dialogContent}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ClientDialog;
