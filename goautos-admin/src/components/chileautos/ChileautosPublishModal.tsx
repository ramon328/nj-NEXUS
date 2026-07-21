import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Car,
  Calendar,
  DollarSign,
  Gauge,
  Palette,
  Fuel,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getChileautosMakes,
  getChileautosModels,
  publishToChileautosWithOverrides,
} from '@/services/chileautosService';

interface VehicleForPublish {
  id: number;
  brand_name?: string;
  model_name?: string;
  year?: number;
  price?: number;
  mileage?: number;
  main_image?: string;
  color_name?: string;
  fuel_type_name?: string;
  transmission?: string;
  category_name?: string;
  license_plate?: string;
}

interface ChileautosPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleForPublish;
  onSuccess: () => void;
  pendingCount?: number; // Number of vehicles still pending manual selection
}

export const ChileautosPublishModal = ({
  isOpen,
  onClose,
  vehicle,
  onSuccess,
  pendingCount = 0,
}: ChileautosPublishModalProps) => {
  const { clientId } = useAuth();

  // Catalog data
  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Selected overrides
  const [selectedMake, setSelectedMake] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if vehicle make/model exists in catalog
  const vehicleMake = vehicle.brand_name || '';
  const vehicleModel = vehicle.model_name || '';

  const makeExistsInCatalog = useMemo(() => {
    const makes = availableMakes || [];
    if (!makes.length) return null; // Still loading
    return makes.some(
      (m) => vehicleMake && m.toLowerCase() === vehicleMake.toLowerCase()
    );
  }, [availableMakes, vehicleMake]);

  const modelExistsInCatalog = useMemo(() => {
    const models = availableModels || [];
    if (!models.length || !selectedMake) return null;
    return models.some(
      (m) => vehicleModel && m.toLowerCase() === vehicleModel.toLowerCase()
    );
  }, [availableModels, vehicleModel, selectedMake]);

  // Load makes on mount
  useEffect(() => {
    if (isOpen && clientId) {
      loadMakes();
    }
  }, [isOpen, clientId]);

  // Auto-select make if it exists in catalog
  useEffect(() => {
    if (availableMakes.length > 0 && vehicleMake) {
      const matchingMake = availableMakes.find(
        (m) => m.toLowerCase() === vehicleMake.toLowerCase()
      );
      if (matchingMake) {
        setSelectedMake(matchingMake);
      }
    }
  }, [availableMakes, vehicleMake]);

  // Load models when make changes
  useEffect(() => {
    if (selectedMake && clientId) {
      loadModels(selectedMake);
    } else {
      setAvailableModels([]);
      setSelectedModel('');
    }
  }, [selectedMake, clientId]);

  // Auto-select model if it exists in catalog
  useEffect(() => {
    if (availableModels.length > 0 && vehicleModel && selectedMake) {
      const matchingModel = availableModels.find(
        (m) => m.toLowerCase() === vehicleModel.toLowerCase()
      );
      if (matchingModel) {
        setSelectedModel(matchingModel);
      }
    }
  }, [availableModels, vehicleModel, selectedMake]);

  const loadMakes = async () => {
    if (!clientId) return;
    setIsLoadingMakes(true);
    setError(null);
    try {
      const result = await getChileautosMakes(clientId);
      console.log('[ChileAutos] Makes result:', result);
      if (result.success && result.data) {
        // API returns { data: { results: [...] } } or { data: [...] }
        let makesArray: string[] = [];
        const data = result.data as any;
        if (Array.isArray(data)) {
          makesArray = data;
        } else if (data?.results && Array.isArray(data.results)) {
          makesArray = data.results;
        }
        // Filter out empty strings and separator values
        makesArray = makesArray.filter(m => m && m.trim() !== '' && !m.startsWith('-'));
        setAvailableMakes(makesArray);
        if (makesArray.length === 0) {
          setError('No se encontraron marcas en el catálogo');
        }
      } else {
        setError(result.error || 'Error al cargar marcas del catálogo');
        setAvailableMakes([]);
      }
    } catch (err) {
      console.error('[ChileAutos] Error loading makes:', err);
      setError('Error al cargar marcas del catálogo');
      setAvailableMakes([]);
    } finally {
      setIsLoadingMakes(false);
    }
  };

  const loadModels = async (makeName: string) => {
    if (!clientId) return;
    setIsLoadingModels(true);
    setSelectedModel('');
    try {
      const result = await getChileautosModels(clientId, makeName);
      console.log('[ChileAutos] Models result for', makeName, ':', result);
      if (result.success && result.data) {
        // API returns { data: { results: [...] } } or { data: [...] }
        let modelsArray: string[] = [];
        const data = result.data as any;
        if (Array.isArray(data)) {
          modelsArray = data;
        } else if (data?.results && Array.isArray(data.results)) {
          modelsArray = data.results;
        }
        // Filter out empty strings and separator values
        modelsArray = modelsArray.filter(m => m && m.trim() !== '' && !m.startsWith('-'));
        setAvailableModels(modelsArray);
      } else {
        setAvailableModels([]);
      }
    } catch (err) {
      console.error('[ChileAutos] Error loading models:', err);
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handlePublish = async () => {
    if (!clientId || !selectedMake || !selectedModel) return;

    setIsPublishing(true);
    setError(null);

    try {
      // ALWAYS send the selected catalog values as overrides
      // The catalog has the exact casing that ChileAutos API expects
      // Even if "Mahindra" matches "MAHINDRA" case-insensitively,
      // the API needs the exact catalog value "Mahindra"
      const overrides = {
        make: selectedMake,
        model: selectedModel,
      };

      console.log('[ChileAutos] Publishing with overrides:', overrides);

      const result = await publishToChileautosWithOverrides(
        vehicle.id,
        clientId,
        overrides
      );

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || 'Error al publicar en ChileAutos');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleClose = () => {
    if (!isPublishing) {
      setError(null);
      setSelectedMake('');
      setSelectedModel('');
      onClose();
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return '—';
    return `$${price.toLocaleString('es-CL')}`;
  };

  const formatMileage = (mileage: number | undefined) => {
    if (!mileage) return '—';
    return `${mileage.toLocaleString('es-CL')} km`;
  };

  // Validaciones de publicación (mismo criterio que el Sheet: el precio bloquea,
  // las fotos solo advierten). El modal solo recibe precio y foto principal, así
  // que combustible/transmisión los sigue validando el backend con su error claro.
  const hasPrice = !!vehicle.price && vehicle.price > 0;
  const hasPhoto = !!vehicle.main_image;

  const canPublish = selectedMake && selectedModel && !isPublishing && hasPrice;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Seleccionar marca y modelo
            {pendingCount > 1 && (
              <Badge variant="secondary" className="ml-2">
                {pendingCount} pendientes
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Vehicle Preview */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
          {vehicle.main_image ? (
            <img
              src={vehicle.main_image}
              alt={`${vehicleMake} ${vehicleModel}`}
              className="w-full sm:w-32 h-36 sm:h-24 object-cover rounded-md"
            />
          ) : (
            <div className="w-full sm:w-32 h-36 sm:h-24 bg-gray-200 rounded-md flex items-center justify-center">
              <Car className="h-8 w-8 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base sm:text-lg truncate">
              {vehicle.year} {vehicleMake} {vehicleModel}
            </h3>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:text-sm text-gray-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {vehicle.year || '—'}
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                {formatPrice(vehicle.price)}
              </div>
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 shrink-0" />
                {formatMileage(vehicle.mileage)}
              </div>
              <div className="flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 shrink-0" />
                {vehicle.color_name || '—'}
              </div>
              <div className="flex items-center gap-1.5">
                <Fuel className="h-3.5 w-3.5 shrink-0" />
                {vehicle.fuel_type_name || '—'}
              </div>
              <div className="flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 shrink-0" />
                {vehicle.transmission || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Selection */}
        <div className="space-y-4">
          {makeExistsInCatalog === false || modelExistsInCatalog === false ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>
                No se encontró coincidencia automática. Selecciona la marca y modelo del catálogo de ChileAutos.
              </span>
            </div>
          ) : selectedMake && selectedModel ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Marca y modelo encontrados en el catálogo. Confirma y publica.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>
                Cargando catálogo de ChileAutos...
              </span>
            </div>
          )}

          {/* Make Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="make">Marca</Label>
              {vehicleMake && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500">Original:</span>
                  <Badge
                    variant={makeExistsInCatalog ? 'outline' : 'destructive'}
                    className="text-xs"
                  >
                    {vehicleMake}
                    {makeExistsInCatalog === true && (
                      <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />
                    )}
                    {makeExistsInCatalog === false && (
                      <AlertTriangle className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                </div>
              )}
            </div>
            <Select
              value={selectedMake}
              onValueChange={setSelectedMake}
              disabled={isLoadingMakes || isPublishing}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingMakes ? 'Cargando marcas...' : 'Selecciona una marca'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {(availableMakes || []).map((make) => (
                  <SelectItem key={make} value={make}>
                    <span className="flex items-center gap-2">
                      {make}
                      {vehicleMake && make.toLowerCase() === vehicleMake.toLowerCase() && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {makeExistsInCatalog === false && (
              <p className="text-xs text-amber-600">
                La marca "{vehicleMake}" no existe en ChileAutos. Selecciona una
                alternativa.
              </p>
            )}
          </div>

          {/* Model Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="model">Modelo</Label>
              {vehicleModel && selectedMake && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500">Original:</span>
                  <Badge
                    variant={modelExistsInCatalog ? 'outline' : 'destructive'}
                    className="text-xs"
                  >
                    {vehicleModel}
                    {modelExistsInCatalog === true && (
                      <CheckCircle2 className="h-3 w-3 ml-1 text-green-500" />
                    )}
                    {modelExistsInCatalog === false && (
                      <AlertTriangle className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                </div>
              )}
            </div>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
              disabled={!selectedMake || isLoadingModels || isPublishing}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedMake
                      ? 'Selecciona una marca primero'
                      : isLoadingModels
                      ? 'Cargando modelos...'
                      : 'Selecciona un modelo'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {(availableModels || []).map((model) => (
                  <SelectItem key={model} value={model}>
                    <span className="flex items-center gap-2">
                      {model}
                      {vehicleModel && model.toLowerCase() === vehicleModel.toLowerCase() && (
                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMake && modelExistsInCatalog === false && (
              <p className="text-xs text-amber-600">
                El modelo "{vehicleModel}" no existe para {selectedMake} en
                ChileAutos. Selecciona una alternativa.
              </p>
            )}
            {selectedMake && (availableModels || []).length === 0 && !isLoadingModels && (
              <p className="text-xs text-gray-500">
                No hay modelos disponibles para esta marca.
              </p>
            )}
          </div>

          {/* Override Notice */}
          {selectedMake &&
            selectedModel &&
            (selectedMake.toLowerCase() !== vehicleMake.toLowerCase() ||
              selectedModel.toLowerCase() !== vehicleModel.toLowerCase()) && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Se publicará como{' '}
                  <strong>
                    {selectedMake} {selectedModel}
                  </strong>{' '}
                  en ChileAutos (diferente a los datos originales).
                </AlertDescription>
              </Alert>
            )}

          {/* Falta precio: bloquea la publicación */}
          {!hasPrice && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este vehículo no tiene precio. Agrégalo en la ficha del vehículo
                antes de publicarlo en ChileAutos.
              </AlertDescription>
            </Alert>
          )}

          {/* Sin foto principal: solo advierte (ChileAutos puede rechazarlo) */}
          {hasPrice && !hasPhoto && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este vehículo no tiene foto principal. ChileAutos podría rechazar
                la publicación por falta de imágenes.
              </AlertDescription>
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isPublishing} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={!canPublish}
            className="bg-orange-500 hover:bg-orange-600 w-full sm:w-auto"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando...
              </>
            ) : (
              'Publicar en ChileAutos'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
