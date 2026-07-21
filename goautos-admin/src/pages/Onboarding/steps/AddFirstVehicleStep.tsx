import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Car } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AgregarVehiculo from '@/pages/AgregarVehiculo';

interface Props {
  onSkipInstant?: () => void;
  onVehicleCreated?: () => void;
}

export const AddFirstVehicleStep: React.FC<Props> = ({
  onSkipInstant,
  onVehicleCreated,
}) => {
  const { t } = useTranslation('inAppOnboarding');
  const [showInlineForm, setShowInlineForm] = useState(false);

  const handleOpenInline = useCallback(() => setShowInlineForm(true), []);
  const handleCloseInline = useCallback(() => setShowInlineForm(false), []);
  const handleDone = useCallback(() => {
    setShowInlineForm(false);
    onVehicleCreated?.();
  }, [onVehicleCreated]);

  return (
    <div className="mx-auto w-full">
      {!showInlineForm ? (
        <>
          <div className="flex items-center space-x-4 mb-2">
            <div className="flex items-center justify-center w-14 h-14 border border-gray-200 rounded-lg flex-shrink-0 bg-white">
              <Car className="w-7 h-7 text-gray-700" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold text-slate-900">
                Agrega tu primer vehículo
              </h2>
              <p className="text-slate-600">Comienza a construir tu inventario</p>
            </div>
          </div>
          <div className="border-t border-gray-200 mb-6" />

          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-blue-50/60 p-5">
              <p className="text-slate-700">
                Agregar tu primer vehículo te permitirá comenzar a gestionar tu inventario y mostrarlo en tu sitio web.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onSkipInstant}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
              >
                {t('actions.skipAddVehicle', 'Continuar sin agregar vehículo')}
              </Button>

              <Button
                type="button"
                onClick={handleOpenInline}
                className="bg-primary hover:bg-primary/90 text-white px-6"
              >
                <Car className="h-4 w-4 mr-2" />
                {t('actions.addVehicle', 'Agregar vehículo')}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <AgregarVehiculo
          embedded
          forceOnboarding
          onDone={handleDone}
          onCancel={handleCloseInline}
        />
      )}
    </div>
  );
};

export default AddFirstVehicleStep;
