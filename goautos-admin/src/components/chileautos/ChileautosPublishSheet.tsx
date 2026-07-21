import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
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
  Upload,
  Type,
  FileText,
  Tag,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getChileautosMakes,
  getChileautosModels,
  publishToChileautosWithOverrides,
  updateChileautosListingWithOverrides,
} from '@/services/chileautosService';
import { supabase } from '@/integrations/supabase/client';

interface ChileautosPublishSheetProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: number;
  onSuccess: () => void;
  /**
   * 'publish' (default): publica un vehículo nuevo en ChileAutos (operation create).
   * 'edit': edita un aviso YA publicado (operation update con skipPhotos, sin re-enviar fotos).
   */
  mode?: 'publish' | 'edit';
}

interface VehicleData {
  id: number;
  brand_name?: string;
  model_name?: string;
  year?: number;
  price?: number;
  mileage?: number;
  main_image?: string;
  gallery?: string[];
  color_name?: string;
  fuel_type_name?: string;
  transmission?: string;
  category_name?: string;
  license_plate?: string;
  description?: string;
  version_name?: string;
}

export const ChileautosPublishSheet = ({
  isOpen,
  onClose,
  vehicleId,
  onSuccess,
  mode = 'publish',
}: ChileautosPublishSheetProps) => {
  const { clientId } = useAuth();
  const isEditMode = mode === 'edit';

  // Vehicle data
  const [vehicle, setVehicle] = useState<VehicleData | null>(null);
  const [loadingVehicle, setLoadingVehicle] = useState(false);

  // Catalog data
  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingMakes, setIsLoadingMakes] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Editable fields
  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [price, setPrice] = useState<number>(0);
  // Marca si el dealer editó el badge a mano: si lo hizo, NO lo pisamos con el
  // autocompletado derivado del modelo.
  const userEditedBadge = useRef(false);

  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generated title preview — refleja el formato REAL que arma ChileAutos:
  // Año · Marca · Modelo · Versión (ej. "2023 Toyota Hilux GLI"). ChileAutos construye
  // el título así desde sus campos (año adelante) y la versión/badge queda como
  // subtítulo/etiqueta de filtro. Por eso el preview incluye el badge en vivo.
  const autoTitle = useMemo(() => {
    const make = selectedMake || vehicle?.brand_name || '';
    const model = selectedModel || vehicle?.model_name || '';
    const year = vehicle?.year || '';
    const base = `${year} ${make} ${model}`.trim();
    return badge.trim() ? `${base} ${badge.trim()}` : base;
  }, [selectedMake, selectedModel, vehicle, badge]);

  const displayTitle = customTitle || autoTitle;

  // Photos count
  const photosCount = useMemo(() => {
    if (!vehicle) return 0;
    let count = vehicle.main_image ? 1 : 0;
    if (vehicle.gallery) count += vehicle.gallery.filter(u => u && u !== vehicle.main_image).length;
    return count;
  }, [vehicle]);

  // Load vehicle data
  useEffect(() => {
    if (!isOpen || !vehicleId) return;
    const fetchVehicle = async () => {
      setLoadingVehicle(true);
      userEditedBadge.current = false;
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id, vehicle_type, year, price, mileage, main_image, gallery, license_plate,
          transmission, description, version_name,
          brand:brand_id(name),
          model:model_id(name),
          color:color_id(name),
          fuel_type:fuel_type_id(name),
          category:category_id(name)
        `)
        .eq('id', vehicleId)
        .single();

      if (!error && data) {
        const v: VehicleData = {
          id: data.id,
          brand_name: data.brand?.name,
          model_name: data.model?.name,
          year: data.year,
          price: data.price,
          mileage: data.mileage,
          main_image: data.main_image,
          gallery: data.gallery,
          color_name: data.color?.name,
          fuel_type_name: data.fuel_type?.name,
          transmission: data.transmission,
          category_name: data.category?.name,
          license_plate: data.license_plate,
          description: data.description,
          version_name: data.version_name,
        };
        setVehicle(v);
        setPrice(v.price || 0);
        setDescription(v.description || '');
        setCustomTitle('');
        // Pre-llenar la Versión/Badge con la versión que ya tiene el auto en GoAuto.
        // Es la etiqueta de filtro de ChileAutos; así llega automática (editable) y
        // queda consistente en cada sync (incluida una edición de precio) sin que el
        // dealer tenga que tipearla a mano.
        setBadge(v.version_name || '');
      }
      setLoadingVehicle(false);
    };
    fetchVehicle();
  }, [isOpen, vehicleId]);

  // Load makes
  useEffect(() => {
    // En modo edición el aviso ya existe y no se re-envía catálogo: evitamos cargar
    // marcas/modelos (llamadas de red innecesarias y posibles selects fantasma).
    if (!isOpen || !clientId || isEditMode) return;
    const loadMakes = async () => {
      setIsLoadingMakes(true);
      try {
        const result = await getChileautosMakes(clientId);
        if (result.success && result.data) {
          const data = result.data as any;
          let arr: string[] = Array.isArray(data) ? data : data?.results || [];
          arr = arr.filter(m => m && m.trim() !== '' && !m.startsWith('-'));
          setAvailableMakes(arr);
        }
      } catch {}
      setIsLoadingMakes(false);
    };
    loadMakes();
  }, [isOpen, clientId]);

  // Auto-select make
  useEffect(() => {
    if (availableMakes.length > 0 && vehicle?.brand_name) {
      const match = availableMakes.find(
        m => m.toLowerCase() === vehicle.brand_name!.toLowerCase()
      );
      if (match) setSelectedMake(match);
    }
  }, [availableMakes, vehicle?.brand_name]);

  // Load models on make change
  useEffect(() => {
    if (!selectedMake || !clientId) {
      setAvailableModels([]);
      setSelectedModel('');
      return;
    }
    const loadModels = async () => {
      setIsLoadingModels(true);
      try {
        const result = await getChileautosModels(clientId, selectedMake);
        if (result.success && result.data) {
          const data = result.data as any;
          let arr: string[] = Array.isArray(data) ? data : data?.results || [];
          arr = arr.filter(m => m && m.trim() !== '' && !m.startsWith('-'));
          setAvailableModels(arr);
        }
      } catch {}
      setIsLoadingModels(false);
    };
    loadModels();
  }, [selectedMake, clientId]);

  // Auto-select model + autocompletar Versión/Badge desde el modelo
  useEffect(() => {
    if (availableModels.length > 0 && vehicle?.model_name && selectedMake) {
      const rawModel = vehicle.model_name.toLowerCase();
      // 1) match exacto; 2) si no, el modelo del catálogo MÁS LARGO que sea prefijo del
      //    modelo crudo. Mallorca suele traer el trim pegado al modelo
      //    (ej. "SILVERADO 6.2 ZR2 AUTO DC 4WD R") y el catálogo trae el base ("Silverado").
      let match = availableModels.find(m => m.toLowerCase() === rawModel);
      if (!match) {
        match = availableModels
          .filter(m => rawModel.startsWith(m.toLowerCase() + ' '))
          .sort((a, b) => b.length - a.length)[0];
      }
      if (match) {
        setSelectedModel(match);
        // Autocompletar el badge con la versión que viene incrustada en el modelo (lo que
        // sobra después del modelo base), SOLO si el auto no tiene version_name y el dealer
        // no editó el campo a mano. Así la versión que ya está en GoAuto llega sola.
        if (!userEditedBadge.current && !(vehicle.version_name || '').trim()) {
          const trim = vehicle.model_name.slice(match.length).trim();
          if (trim) setBadge(trim);
        }
      }
    }
  }, [availableModels, vehicle?.model_name, vehicle?.version_name, selectedMake]);

  // Persiste la Versión/Badge en el vehículo SOLO si el usuario realmente puso un valor.
  // version_name lo comparten el sitio web y MercadoLibre -> nunca lo pisamos con vacío.
  const persistVersionName = async () => {
    const trimmedBadge = badge.trim();
    if (!trimmedBadge) return;
    if (trimmedBadge === (vehicle?.version_name || '').trim()) return;
    try {
      await supabase
        .from('vehicles')
        .update({ version_name: trimmedBadge })
        .eq('id', vehicleId);
    } catch (err) {
      // No bloqueamos el flujo si esto falla: el sync a ChileAutos ya quedó hecho.
      console.error('[ChileAutos] No se pudo persistir version_name:', err);
    }
  };

  const handlePublish = async () => {
    // En modo publish exigimos catálogo (marca/modelo). En modo edit el aviso ya existe,
    // sólo editamos overrides (título/badge/precio/descripción) sin tocar fotos ni catálogo.
    if (!clientId) return;
    if (!isEditMode && (!selectedMake || !selectedModel)) return;

    setIsPublishing(true);
    setError(null);

    try {
      let result;

      if (isEditMode) {
        const overrides: {
          title?: string;
          description?: string;
          badge?: string;
          price?: number;
        } = {};

        if (customTitle) overrides.title = customTitle;
        if (description) overrides.description = description;
        if (badge) overrides.badge = badge;
        if (price && price !== vehicle?.price) overrides.price = price;

        result = await updateChileautosListingWithOverrides(
          vehicleId,
          clientId,
          overrides
        );
      } else {
        const overrides: any = {
          make: selectedMake,
          model: selectedModel,
        };

        if (customTitle) overrides.title = customTitle;
        if (description) overrides.description = description;
        if (badge) overrides.badge = badge;
        if (price && price !== vehicle?.price) overrides.price = price;

        result = await publishToChileautosWithOverrides(
          vehicleId,
          clientId,
          overrides
        );
      }

      if (result.success) {
        // Solo en modo EDICIÓN persistimos la versión al vehículo (ahí el usuario la cambió
        // a propósito). En PUBLICAR NO la guardamos: la versión suele venir ya dentro del
        // nombre del modelo y guardarla en version_name la duplicaría en web/MercadoLibre/
        // Facebook (esos canales concatenan model_name + version_name sin dedup).
        if (isEditMode) await persistVersionName();
        onSuccess();
        handleClose();
      } else {
        setError(
          result.error ||
            (isEditMode
              ? 'Error al actualizar en ChileAutos'
              : 'Error al publicar en ChileAutos')
        );
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
      setCustomTitle('');
      setDescription('');
      setBadge('');
      userEditedBadge.current = false;
      setVehicle(null);
      onClose();
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(value);

  const missingRequiredFields = useMemo(() => {
    if (!vehicle) return [];
    const missing: string[] = [];
    if (!vehicle.fuel_type_name) missing.push('combustible');
    if (!vehicle.transmission) missing.push('transmisión');
    return missing;
  }, [vehicle]);

  const canPublish = isEditMode
    ? !isPublishing && price > 0
    : selectedMake &&
      selectedModel &&
      !isPublishing &&
      price > 0 &&
      missingRequiredFields.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            {isEditMode ? 'Editar publicación' : 'Publicar en ChileAutos'}
          </SheetTitle>
        </SheetHeader>

        {loadingVehicle ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : vehicle ? (
          <div className="space-y-5 py-4">
            {/* Vehicle Preview */}
            <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
              {vehicle.main_image ? (
                <img
                  src={vehicle.main_image}
                  alt={`${vehicle.brand_name} ${vehicle.model_name}`}
                  className="w-28 h-20 object-cover rounded-md"
                />
              ) : (
                <div className="w-28 h-20 bg-gray-200 rounded-md flex items-center justify-center">
                  <Car className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {vehicle.year} {vehicle.brand_name} {vehicle.model_name}
                </h3>
                <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(vehicle.price || 0)}</span>
                  <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{vehicle.mileage?.toLocaleString('es-CL') || '—'} km</span>
                  <span className="flex items-center gap-1"><Palette className="h-3 w-3" />{vehicle.color_name || '—'}</span>
                  <span className="flex items-center gap-1"><Fuel className="h-3 w-3" />{vehicle.fuel_type_name || '—'}</span>
                  <span className="flex items-center gap-1"><Settings className="h-3 w-3" />{vehicle.transmission || '—'}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{vehicle.year || '—'}</span>
                </div>
                {photosCount > 0 && (
                  <p className="text-xs text-green-600 mt-1">{photosCount} foto{photosCount !== 1 ? 's' : ''}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Title Preview */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium mb-1">Título en ChileAutos</p>
              <p className="font-semibold text-sm text-blue-900">{displayTitle}</p>
            </div>

            {/* Catalog Selection — sólo en modo publicar. En edición el aviso ya existe
                y no re-enviamos catálogo (skipPhotos / overrides de texto y precio). */}
            {!isEditMode && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Marca y Modelo (catálogo ChileAutos)</p>

              <div className="space-y-1.5">
                <Label className="text-xs">Marca *</Label>
                <Select
                  value={selectedMake}
                  onValueChange={setSelectedMake}
                  disabled={isLoadingMakes || isPublishing}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={isLoadingMakes ? 'Cargando...' : 'Selecciona marca'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableMakes.map((make) => (
                      <SelectItem key={make} value={make}>
                        <span className="flex items-center gap-2">
                          {make}
                          {vehicle?.brand_name && make.toLowerCase() === vehicle.brand_name.toLowerCase() && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Modelo *</Label>
                <Select
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  disabled={!selectedMake || isLoadingModels || isPublishing}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={
                      !selectedMake ? 'Selecciona marca primero' :
                      isLoadingModels ? 'Cargando...' : 'Selecciona modelo'
                    } />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {availableModels.map((model) => (
                      <SelectItem key={model} value={model}>
                        <span className="flex items-center gap-2">
                          {model}
                          {vehicle?.model_name && model.toLowerCase() === vehicle.model_name.toLowerCase() && (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            )}

            {!isEditMode && <Separator />}

            {/* Customizable Fields */}
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Personalizar publicación</p>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Type className="h-3 w-3" />
                  Título personalizado
                </Label>
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={autoTitle}
                  className="h-8 text-sm"
                  disabled={isPublishing}
                />
                <p className="text-[10px] text-gray-400">Dejar vacío para usar el título automático</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Versión / Badge
                </Label>
                <Input
                  value={badge}
                  onChange={(e) => {
                    userEditedBadge.current = true;
                    setBadge(e.target.value);
                  }}
                  placeholder={`ej: GLI, 1.5T, Facturable, Full Equipo`}
                  className="h-8 text-sm"
                  disabled={isPublishing}
                />
                <p className="text-[10px] text-gray-400">Aparece como "Versión" en ChileAutos (filtro de búsqueda)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  Precio de publicación
                </Label>
                <Input
                  type="text"
                  value={price ? new Intl.NumberFormat('es-CL').format(price) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setPrice(parseInt(raw, 10) || 0);
                  }}
                  placeholder="0"
                  className="h-8 text-sm"
                  disabled={isPublishing}
                />
                {price !== vehicle?.price && vehicle?.price && (
                  <p className="text-[10px] text-amber-600">
                    Precio original: {formatCurrency(vehicle.price)} — se publicará con {formatCurrency(price)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  Descripción
                </Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción del vehículo para ChileAutos..."
                  rows={3}
                  className="text-sm resize-none"
                  disabled={isPublishing}
                />
              </div>
            </div>

            {/* Override notice */}
            {selectedMake && selectedModel && (
              (selectedMake.toLowerCase() !== (vehicle.brand_name || '').toLowerCase() ||
               selectedModel.toLowerCase() !== (vehicle.model_name || '').toLowerCase()) && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Se publicará como <strong>{selectedMake} {selectedModel}</strong> (diferente a los datos originales)
                  </AlertDescription>
                </Alert>
              )
            )}

            {/* Missing required fields warning */}
            {!isEditMode && missingRequiredFields.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Falta cargar <strong>{missingRequiredFields.join(' y ')}</strong> en este vehículo. ChileAutos los exige para publicar. Edita el vehículo, completa esos campos y vuelve aquí.
                </AlertDescription>
              </Alert>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* Footer */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isPublishing}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePublish}
                disabled={!canPublish}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-700"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditMode ? 'Guardando...' : 'Publicando...'}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {isEditMode ? 'Guardar cambios' : 'Publicar'}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
