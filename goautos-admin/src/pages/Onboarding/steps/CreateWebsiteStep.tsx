import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  /** Vuelve al paso de vehículos de forma instantánea (UI) y luego persiste */
  onBackToVehiclesInstant?: () => void;
  /** Completa de forma instantánea (UI) y luego persiste */
  onCompleteInstant?: () => void;
}

export const CreateWebsiteStep: React.FC<Props> = ({
  onBackToVehiclesInstant,
  onCompleteInstant,
}) => {
  const [, navigate] = useLocation();
  const { t } = useTranslation('inAppOnboarding');

  const handleCreateWebsite = () => {
    navigate('/builder?onboarding=true');
  };

  return (
    <div className="mx-auto w-full ">
      <div className="flex items-center space-x-4 mb-2">
        <div className="flex items-center justify-center w-14 h-14 border border-gray-200 rounded-lg flex-shrink-0 bg-white">
          <Globe className="w-7 h-7 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-semibold text-slate-900">Crea tu sitio web</h2>
          <p className="text-slate-600">Establece tu presencia online con un sitio profesional</p>
        </div>
      </div>
      <div className="border-t border-gray-200 mb-6" />

      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-blue-50/60 p-5">
          <p className="text-slate-700">
            Tu sitio web te permitirá mostrar tu inventario online y llegar a más clientes potenciales.
          </p>
        </div>

        {/* Enlace terciario: volver si te arrepientes (sutil, alineado a la izquierda) */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            onClick={onBackToVehiclesInstant}
            className="underline text-slate-600 hover:text-slate-900"
            type="button"
          >
            {t('actions.backToVehicles', 'Volver a agregar un vehículo')}
          </button>
        </div>

        {/* Acciones coherentes: primaria a la derecha, secundaria a la izquierda */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCompleteInstant}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          >
            {t('actions.skipNow', 'Omitir por ahora')}
          </Button>

          <Button
            onClick={handleCreateWebsite}
            className="bg-primary hover:bg-primary/90 text-white px-6"
          >
            <Globe className="h-4 w-4 mr-2" />
            {t('actions.createWebsite', 'Crear sitio web')}
          </Button>
        </div>
      </div>
    </div>
  );
};
