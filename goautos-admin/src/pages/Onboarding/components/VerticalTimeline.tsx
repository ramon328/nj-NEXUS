import React from 'react';
import { User, Building2, MapPin, Lock, CheckCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  subtitle: string;
  icon: 'user' | 'building' | 'map' | 'lock' | 'check';
}

interface VerticalTimelineProps {
  currentStep: number;
  steps: Step[];
  onStepClick: (stepId: number) => void;
}

const iconMap = {
  user: User,
  building: Building2,
  map: MapPin,
  lock: Lock,
  check: CheckCircle,
};

export const VerticalTimeline: React.FC<VerticalTimelineProps> = ({
  currentStep,
  steps,
  onStepClick,
}) => {
  const getStepStatus = (stepId: number): 'completed' | 'current' | 'pending' => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'pending';
  };

  const isClickable = (stepId: number) => stepId <= currentStep;

  return (
    <>
      {/* Desktop: Vertical Timeline */}
      <div className="hidden md:flex flex-col gap-0">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = iconMap[step.icon];
          const clickable = isClickable(step.id);

          return (
            <div key={step.id} className="relative flex items-start gap-4 pb-8">
              {/* Vertical line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-5 top-11 w-0.5 h-full',
                    status === 'completed' ? 'bg-emerald-500' : 'bg-slate-200'
                  )}
                />
              )}

              {/* Icon circle */}
              <div className="relative z-10 flex-shrink-0">
                <button
                  onClick={() => clickable && onStepClick(step.id)}
                  disabled={!clickable}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                    status === 'completed' &&
                      'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600',
                    status === 'current' &&
                      'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200',
                    status === 'pending' && 'bg-white border-slate-300 text-slate-400',
                    clickable && status !== 'current' && 'cursor-pointer',
                    !clickable && 'cursor-not-allowed'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Text content */}
              <div className="flex-1 pt-1.5">
                <button
                  onClick={() => clickable && onStepClick(step.id)}
                  disabled={!clickable}
                  className={cn(
                    'text-left w-full group',
                    clickable && 'cursor-pointer',
                    !clickable && 'cursor-not-allowed'
                  )}
                >
                  <h3
                    className={cn(
                      'font-semibold text-sm leading-tight transition-colors',
                      status === 'current' && 'text-slate-900',
                      status === 'completed' && 'text-slate-700 group-hover:text-slate-900',
                      status === 'pending' && 'text-slate-400'
                    )}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={cn(
                      'text-xs mt-0.5 transition-colors',
                      status === 'current' && 'text-slate-600',
                      status === 'completed' && 'text-slate-500 group-hover:text-slate-600',
                      status === 'pending' && 'text-slate-400'
                    )}
                  >
                    {step.subtitle}
                  </p>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};
