import { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Database,
  LineChart,
  Sparkles,
  CheckCheck,
} from 'lucide-react';

const LOADING_STEPS = [
  {
    icon: Search,
    title: 'Buscando publicaciones',
    description: 'Consultando Chileautos...',
    duration: 2000,
  },
  {
    icon: Globe,
    title: 'Ampliando búsqueda',
    description: 'Revisando Yapo y MercadoLibre...',
    duration: 2500,
  },
  {
    icon: Database,
    title: 'Recopilando datos',
    description: 'Extrayendo precios y detalles...',
    duration: 2000,
  },
  {
    icon: LineChart,
    title: 'Analizando mercado',
    description: 'Calculando rangos y promedios...',
    duration: 2500,
  },
  {
    icon: Sparkles,
    title: 'Generando informe',
    description: 'Preparando tu tasación...',
    duration: 3000,
  },
];

const LoadingSteps = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let stepTimer: ReturnType<typeof setTimeout>;
    let progressInterval: ReturnType<typeof setInterval>;

    const advanceStep = () => {
      if (currentStep < LOADING_STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
        setProgress(0);
      }
    };

    const stepDuration = LOADING_STEPS[currentStep].duration;
    const progressIncrement = 100 / (stepDuration / 50);

    progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(prev + progressIncrement, 100));
    }, 50);

    stepTimer = setTimeout(advanceStep, stepDuration);

    return () => {
      clearTimeout(stepTimer);
      clearInterval(progressInterval);
    };
  }, [currentStep]);

  const CurrentIcon = LOADING_STEPS[currentStep].icon;

  return (
    <div className="py-12">
      <div className="flex flex-col items-center gap-6 mb-8">
        <div className="relative">
          <div className="absolute inset-0 w-24 h-24 -m-2">
            <div
              className="absolute inset-0 rounded-2xl bg-primary/20 animate-ping"
              style={{ animationDuration: '2s' }}
            />
          </div>
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/30">
            <CurrentIcon className="w-8 h-8 text-white" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-primary">
            <span className="text-xs font-bold text-primary">
              {currentStep + 1}
            </span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-900 font-semibold text-lg">
            {LOADING_STEPS[currentStep].title}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {LOADING_STEPS[currentStep].description}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-3">
          {LOADING_STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-100 text-green-600'
                      : isCurrent
                        ? 'bg-primary text-white shadow-md shadow-primary/30'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCheck className="w-5 h-5" />
                  ) : (
                    <StepIcon
                      className={`w-5 h-5 ${isCurrent ? 'animate-pulse' : ''}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-cyan-400 transition-all duration-100 ease-linear rounded-full"
            style={{
              width: `${(currentStep / LOADING_STEPS.length) * 100 + progress / LOADING_STEPS.length}%`,
            }}
          />
        </div>

        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-400">
            Paso {currentStep + 1} de {LOADING_STEPS.length}
          </span>
          <span className="text-xs text-gray-400">
            {Math.round(
              (currentStep / LOADING_STEPS.length) * 100 +
                progress / LOADING_STEPS.length,
            )}
            %
          </span>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">
          Tip: Incluye el año y kilometraje para resultados más precisos
        </p>
      </div>
    </div>
  );
};

export default LoadingSteps;
