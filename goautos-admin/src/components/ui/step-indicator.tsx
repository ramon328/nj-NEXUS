import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StepDef {
  id: number;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
}

interface StepIndicatorProps {
  steps: StepDef[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
  canNavigateToStep?: (stepId: number) => boolean;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  canNavigateToStep,
}: StepIndicatorProps) {
  return (
    <div className="px-3 py-1.5 md:py-2.5 border-b border-slate-100 bg-slate-50/40 shrink-0">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          const canNavigate = canNavigateToStep?.(step.id) ?? true;

          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => canNavigate && onStepClick?.(step.id)}
                disabled={!canNavigate}
                className={cn(
                  'flex items-center gap-1.5 shrink-0 transition-all duration-200',
                  !canNavigate && 'cursor-not-allowed',
                  isActive
                    ? 'opacity-100'
                    : isCompleted
                    ? 'opacity-80 hover:opacity-100'
                    : 'opacity-40'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-6 h-6 md:w-7 md:h-7 rounded-full text-[10px] md:text-xs font-bold transition-all duration-200',
                    isActive &&
                      'bg-cyan-500 text-white ring-[3px] ring-cyan-500/20',
                    isCompleted && 'bg-emerald-500 text-white',
                    !isActive &&
                      !isCompleted &&
                      'bg-slate-200/80 text-slate-400'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3 md:h-3.5 md:w-3.5 stroke-[3]" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px] md:text-xs font-medium whitespace-nowrap transition-colors',
                    isActive ? 'text-slate-800' : 'text-slate-400',
                    !isActive && 'hidden sm:inline'
                  )}
                >
                  {step.shortTitle}
                </span>
              </button>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-1.5 sm:mx-2.5 min-w-[8px] sm:min-w-[12px] transition-colors duration-300',
                    isCompleted ? 'bg-emerald-300' : 'bg-slate-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
