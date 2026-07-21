import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/DashboardLayout';
import { IntegrationHeader } from '@/components/integrations/IntegrationHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertCircle,
  Globe,
  ExternalLink,
  RefreshCw,
  Loader2,
  Upload,
  LayoutGrid,
  ArrowRight,
  Shield,
  CheckCircle2,
  Sparkles,
  Eye,
  BarChart3,
  Image,
  Car,
  Settings,
} from 'lucide-react';
import {
  useChileautosIntegration,
  useChileautosListings,
} from '@/hooks/chileautos';
import {
  ChileautosVehicleSelector,
  ChileautosPublicationsGrid,
  ChileautosPublishModal,
  ChileautosPublishSheet,
  ChileautosListingDetailDrawer,
} from '@/components/chileautos';
import { ChileautosListing } from '@/types/chileautos';
import { differenceInCalendarDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import posthog from '@/utils/posthog';

const chileautosConfig = {
  gradientFrom: 'from-blue-500',
  gradientTo: 'to-blue-700',
};

const ChileautosPage = () => {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('publish');
  const [credentials, setCredentials] = useState({
    seller_identifier: '',
  });
  // State for vehicles that need manual selection
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [vehicleForPublish, setVehicleForPublish] = useState<any>(null);
  const [pendingManualVehicles, setPendingManualVehicles] = useState<any[]>([]);
  // State for single vehicle publish sheet
  const [isPublishSheetOpen, setIsPublishSheetOpen] = useState(false);
  const [sheetVehicleId, setSheetVehicleId] = useState<number | null>(null);
  const [detailListing, setDetailListing] = useState<ChileautosListing | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  // State for editing an already-published listing (sheet en modo 'edit')
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [editVehicleId, setEditVehicleId] = useState<number | null>(null);

  const {
    integration,
    isLoading: isLoadingIntegration,
    isConnected,
    hasError,
    connect,
    isConnecting,
    updateConfig,
    isUpdatingConfig,
    disconnect,
    isDisconnecting,
    refreshToken,
    isRefreshingToken,
  } = useChileautosIntegration();

  const {
    listings,
    isLoading: isLoadingListings,
    publishedCount,
    pendingCount,
    errorCount,
    totalCount,
    publishedVehicleIds,
    bulkSync,
    isBulkSyncing,
    remove,
    isRemoving,
    update,
    isUpdating,
    autoPublish,
    isAutoPublishing,
  } = useChileautosListings();

  // Último uso de la integración = la actividad más reciente sobre cualquier aviso
  // (publicar/editar/sincronizar). En días: 0 = hoy, 1 = ayer, etc.
  const lastUseLabel = useMemo(() => {
    if (!listings || listings.length === 0) return null;
    const times = listings
      .map((l) => l.last_synced_at || l.updated_at || l.created_at)
      .filter(Boolean)
      .map((d) => new Date(d as string).getTime());
    if (times.length === 0) return null;
    const days = differenceInCalendarDays(new Date(), new Date(Math.max(...times)));
    if (days <= 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    return `Hace ${days} días`;
  }, [listings]);

  const handleConnect = () => {
    if (!credentials.seller_identifier) {
      return;
    }

    connect(credentials, {
      onSuccess: () => {
        posthog.capture({
          distinctId: String(clientId),
          event: 'chileautos_connected',
          properties: {},
        });
        setIsConnectDialogOpen(false);
        setCredentials({
          seller_identifier: '',
        });
      },
    });
  };

  const handleDisconnect = () => {
    if (
      confirm(
        '¿Estás seguro de que quieres desconectar ChileAutos? Los vehículos publicados permanecerán en ChileAutos pero ya no podrás gestionarlos desde aquí.'
      )
    ) {
      disconnect();
    }
  };

  const handleConfigChange = (key: string, value: boolean | string) => {
    if (key === 'sync_on_publish' && typeof value === 'boolean') {
      posthog.capture({
        distinctId: String(clientId),
        event: 'chileautos_auto_publish_toggled',
        properties: { enabled: value },
      });
    }
    updateConfig({ [key]: value });
  };

  // Fetch vehicle data for single publish modal
  const fetchVehicleForPublish = async (vehicleId: number) => {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        id,
        year,
        price,
        mileage,
        main_image,
        license_plate,
        transmission,
        brand:brand_id(name),
        model:model_id(name),
        color:color_id(name),
        fuel_type:fuel_type_id(name),
        category:category_id(name)
      `)
      .eq('id', vehicleId)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      brand_name: data.brand?.name,
      model_name: data.model?.name,
      year: data.year,
      price: data.price,
      mileage: data.mileage,
      main_image: data.main_image,
      color_name: data.color?.name,
      fuel_type_name: data.fuel_type?.name,
      transmission: data.transmission,
      category_name: data.category?.name,
      license_plate: data.license_plate,
    };
  };

  const handlePublishSelected = async () => {
    if (selectedVehicleIds.length === 0) return;

    // Single vehicle: open the publish sheet with full edit capabilities
    if (selectedVehicleIds.length === 1) {
      setSheetVehicleId(selectedVehicleIds[0]);
      setIsPublishSheetOpen(true);
      return;
    }

    try {
      // Multiple vehicles: use auto-publish
      const result = await autoPublish(selectedVehicleIds);

      // Track batch publish event
      if (result.summary.published > 0) {
        posthog.capture({
          distinctId: String(clientId),
          event: 'chileautos_batch_published',
          properties: { vehicle_count: result.summary.published },
        });
      }

      // Clear selection for successfully published vehicles
      if (result.summary.published > 0) {
        const publishedIds = result.results
          .filter(r => r.success)
          .map(r => r.vehicleId);
        setSelectedVehicleIds(prev => prev.filter(id => !publishedIds.includes(id)));
      }

      // If there are vehicles that need manual selection, queue them
      if (result.needsManualSelection.length > 0) {
        setPendingManualVehicles(result.needsManualSelection);
        // Open modal for the first one
        const firstVehicle = result.needsManualSelection[0];
        setVehicleForPublish({
          id: firstVehicle.vehicleId,
          brand_name: firstVehicle.brand_name,
          model_name: firstVehicle.model_name,
          year: firstVehicle.year,
          price: firstVehicle.price,
          mileage: firstVehicle.mileage,
          main_image: firstVehicle.main_image,
        });
        setIsPublishModalOpen(true);
      }
    } catch (error) {
      console.error('Error in auto-publish:', error);
      toast.error('Error al publicar vehículos');
    }
  };

  const handleListingClick = (listing: ChileautosListing) => {
    setDetailListing(listing);
    setIsDetailOpen(true);
  };

  const handleVerifyListing = async (identifier: string): Promise<{ exists: boolean; data?: any }> => {
    if (!clientId) return { exists: false };
    try {
      const { data, error } = await supabase.functions.invoke('chileautos-sync', {
        body: {
          operation: 'verify',
          clientId,
          chileautosIdentifier: identifier,
        },
      });
      if (error) return { exists: false };
      // El backend ahora busca el identifier en active_items paginado y devuelve `found`.
      // (Antes hacía GET de 1 auto → 405 → siempre fallaba.)
      return { exists: data?.found === true || data?.exists === true, data: data?.data };
    } catch {
      return { exists: false };
    }
  };

  const handlePublishModalSuccess = () => {
    // Remove current vehicle from pending list
    const remaining = pendingManualVehicles.slice(1);
    setPendingManualVehicles(remaining);

    // Clear current vehicle from selection
    if (vehicleForPublish) {
      setSelectedVehicleIds(prev => prev.filter(id => id !== vehicleForPublish.id));
    }

    queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
    queryClient.invalidateQueries({ queryKey: ['vehicles-for-chileautos-publish'] });
    toast.success('Vehículo publicado en ChileAutos');

    // If there are more vehicles pending, show the next one
    if (remaining.length > 0) {
      const nextVehicle = remaining[0];
      setVehicleForPublish({
        id: nextVehicle.vehicleId,
        brand_name: nextVehicle.brand_name,
        model_name: nextVehicle.model_name,
        year: nextVehicle.year,
        price: nextVehicle.price,
        mileage: nextVehicle.mileage,
        main_image: nextVehicle.main_image,
      });
      // Modal stays open
    } else {
      // All done
      setIsPublishModalOpen(false);
      setVehicleForPublish(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Header */}
        <IntegrationHeader
          title="Integración ChileAutos"
          description="Publica y gestiona tu inventario en ChileAutos.cl"
          icon={Globe}
          {...chileautosConfig}
        />

        {/* Error alert */}
        {hasError && integration?.last_error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{integration.last_error}</AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoadingIntegration && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {/* No integration - Empty state */}
        {!isLoadingIntegration && !isConnected && (
          <>
            <div className="space-y-8">
              {/* Hero section */}
              <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-bl from-blue-400 via-blue-600 to-blue-700 p-5 sm:p-8 md:p-12">
                {/* Decorative blurs */}
                <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] rounded-full bg-white/10 blur-[80px] pointer-events-none" />
                <div className="absolute bottom-[-60px] left-[-40px] w-[200px] h-[200px] rounded-full bg-blue-300/30 blur-[60px] pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-[12px] font-medium mb-4">
                      <Sparkles className="w-3.5 h-3.5" />
                      Integración oficial de ChileAutos
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight mb-3">
                      Publica tus vehículos en ChileAutos
                    </h2>
                    <p className="text-sm sm:text-[15px] text-white/80 leading-relaxed mb-6">
                      Conecta tu cuenta de ChileAutos y publica vehículos de tu inventario directamente.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Button
                        onClick={() => setIsConnectDialogOpen(true)}
                        disabled={isConnecting}
                        size="lg"
                        className="bg-white text-slate-900 hover:bg-white/90 font-semibold shadow-lg shadow-blue-700/20 h-12 px-6 text-[15px]"
                      >
                        <Globe className="w-5 h-5 mr-2" />
                        {isConnecting ? 'Conectando...' : 'Conectar ChileAutos'}
                        {!isConnecting && <ArrowRight className="w-4 h-4 ml-2" />}
                      </Button>
                      <span className="text-[12px] text-white/60 flex items-center gap-1.5">
                        <Shield className="w-3 h-3" />
                        Conexión segura vía API
                      </span>
                    </div>
                  </div>

                  {/* Mock listing preview */}
                  <div className="hidden lg:block w-[280px] shrink-0">
                    <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-2xl">
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-300 to-blue-500" />
                        <div>
                          <div className="h-2.5 w-20 rounded-full bg-white/40" />
                          <div className="h-2 w-14 rounded-full bg-white/20 mt-1" />
                        </div>
                      </div>
                      <div className="aspect-video rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-3">
                        <Image className="w-10 h-10 text-white/30" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-full rounded-full bg-white/20" />
                        <div className="h-2 w-3/4 rounded-full bg-white/15" />
                        <div className="h-3 w-1/3 rounded-full bg-white/25 mt-2" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Upload,
                    iconBg: 'bg-blue-50',
                    iconColor: 'text-blue-600',
                    title: 'Publica desde tu inventario',
                    desc: 'Selecciona vehículos y publícalos en ChileAutos con toda la información y fotos automáticamente.',
                  },
                  {
                    icon: Car,
                    iconBg: 'bg-indigo-50',
                    iconColor: 'text-indigo-600',
                    title: 'Sincronización automática',
                    desc: 'Los cambios de precio, kilometraje y estado se sincronizan automáticamente con ChileAutos.',
                  },
                  {
                    icon: BarChart3,
                    iconBg: 'bg-sky-50',
                    iconColor: 'text-sky-600',
                    title: 'Gestión centralizada',
                    desc: 'Administra todas tus publicaciones de ChileAutos directamente desde el panel de GoAutos.',
                  },
                ].map((feature) => (
                  <div
                    key={feature.title}
                    className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] transition-shadow"
                  >
                    <div className={`w-10 h-10 rounded-xl ${feature.iconBg} flex items-center justify-center mb-3`}>
                      <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-[15px] font-semibold text-slate-900 mb-1">{feature.title}</h3>
                    <p className="text-[13px] text-slate-500 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>

              {/* How it works + Requirements */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* How it works */}
                <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]">
                  <h3 className="text-[16px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Eye className="w-4.5 h-4.5 text-slate-400" />
                    Cómo funciona
                  </h3>
                  <div className="space-y-4">
                    {[
                      { step: '1', text: 'Haz clic en "Conectar ChileAutos" e ingresa tu Seller Identifier.' },
                      { step: '2', text: 'GoAutos se conectará automáticamente con tu cuenta de ChileAutos.' },
                      { step: '3', text: 'Selecciona vehículos de tu inventario y publícalos con un clic.' },
                    ].map((item) => (
                      <div key={item.step} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                          {item.step}
                        </div>
                        <p className="text-[14px] text-slate-600 leading-relaxed pt-0.5">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Requirements */}
                <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]">
                  <h3 className="text-[16px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                    Requisitos
                  </h3>
                  <div className="space-y-3">
                    {[
                      'Cuenta activa en ChileAutos',
                      'Tu Seller Identifier (GUID proporcionado por ChileAutos)',
                      'Vehículos con fotos cargadas en tu inventario',
                    ].map((req) => (
                      <div key={req} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        <p className="text-[14px] text-slate-600">{req}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100">
                    <p className="text-[12px] text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Al conectar aceptas nuestra{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
                        Política de Privacidad
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connect Dialog */}
            <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Conectar ChileAutos</DialogTitle>
                  <DialogDescription>
                    Ingresa el identificador de tu automotora en ChileAutos. Si
                    no lo tienes, contacta a{' '}
                    <a
                      href="mailto:soporte-dealer@chileautos.cl"
                      className="text-primary hover:underline"
                    >
                      soporte-dealer@chileautos.cl
                    </a>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="seller_identifier">Seller Identifier (GUID)</Label>
                    <Input
                      id="seller_identifier"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={credentials.seller_identifier}
                      onChange={(e) =>
                        setCredentials({
                          ...credentials,
                          seller_identifier: e.target.value,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Este es el identificador único de tu automotora en ChileAutos.
                      Lo puedes solicitar a soporte-dealer@chileautos.cl
                    </p>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsConnectDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href="https://www.chileautos.cl/info/global-inventory-integration"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver documentación
                    </a>
                  </Button>
                  <Button
                    onClick={handleConnect}
                    disabled={
                      isConnecting ||
                      !credentials.seller_identifier
                    }
                    className="bg-gradient-to-r from-blue-500 to-blue-700"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      'Conectar'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Active integration */}
        {!isLoadingIntegration && isConnected && integration && (
          <>
            {/* Status line + stat cards */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-sm mb-3 flex-wrap">
                <Globe className="h-4 w-4 text-blue-600 shrink-0" />
                <span className="font-medium text-gray-900">ChileAutos</span>
                <span className="text-gray-300">·</span>
                <span className="inline-flex items-center gap-1.5 text-gray-700">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Conectado
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="rounded-2xl border-slate-200/60 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Publicados
                    </p>
                    <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">{publishedCount}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-slate-200/60 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Pendientes
                    </p>
                    <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">{pendingCount}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-slate-200/60 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Errores
                    </p>
                    <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">{errorCount}</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-slate-200/60 shadow-none">
                  <CardContent className="p-4">
                    <p className="text-[13px] text-slate-500">Último uso</p>
                    <p className="text-base font-semibold text-slate-900 mt-1">
                      {lastUseLabel ?? '—'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Tabs: Publish / Publications / Settings */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <TabsList className="w-full sm:w-auto bg-transparent p-0 h-auto gap-2">
                  <TabsTrigger
                    value="publish"
                    className="flex-1 sm:flex-initial flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Publicar
                  </TabsTrigger>
                  <TabsTrigger
                    value="publications"
                    className="flex-1 sm:flex-initial flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Publicados ({totalCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="flex-1 sm:flex-initial flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100 data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
                  >
                    <Settings className="h-4 w-4" />
                    Sincronización
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  {activeTab === 'publish' && selectedVehicleIds.length > 0 && (
                    <Button
                      onClick={handlePublishSelected}
                      disabled={isAutoPublishing}
                      className="bg-gradient-to-r from-blue-500 to-blue-700 w-full sm:w-auto"
                    >
                      {isAutoPublishing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Publicar {selectedVehicleIds.length} vehículo
                      {selectedVehicleIds.length !== 1 ? 's' : ''}
                    </Button>
                  )}

                  {activeTab === 'publications' && (
                    <Button
                      size="sm"
                      onClick={() => bulkSync(undefined)}
                      disabled={isBulkSyncing}
                      className="gap-2 bg-sky-400 hover:bg-sky-500 text-white shadow-sm rounded-xl w-full sm:w-auto"
                    >
                      {isBulkSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Sincronizar todo
                    </Button>
                  )}
                </div>
              </div>

              {/* Publish tab */}
              <TabsContent value="publish" className="mt-0">
                <Card>
                  <CardHeader className="px-4 sm:px-6">
                    <CardTitle className="text-base sm:text-lg">Selecciona vehículos para publicar</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Selecciona los vehículos de tu inventario que quieres publicar en ChileAutos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-2 sm:px-6">
                    <ChileautosVehicleSelector
                      selectedIds={selectedVehicleIds}
                      onSelectionChange={setSelectedVehicleIds}
                      publishedVehicleIds={publishedVehicleIds}
                      disabled={isAutoPublishing}
                      onPublishSuccess={() => {
                        // Clear selection when single vehicle is published via modal
                      }}
                      onPublishClick={(vehicleId) => {
                        setSheetVehicleId(vehicleId);
                        setIsPublishSheetOpen(true);
                      }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Publications tab */}
              <TabsContent value="publications" className="mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Vehículos en ChileAutos</CardTitle>
                        <CardDescription>
                          Gestiona tus publicaciones en ChileAutos
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ChileautosPublicationsGrid
                      publications={listings}
                      isLoading={isLoadingListings}
                      onRemove={(vehicleId) => remove(vehicleId)}
                      onSync={(vehicleId) => update(vehicleId)}
                      isUpdating={isRemoving || isUpdating}
                      onListingClick={handleListingClick}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Sync settings tab */}
              <TabsContent value="settings" className="mt-0">
                {/* Configuration section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configuración de sincronización</CardTitle>
                    <CardDescription>
                      Configura cómo se sincronizan los vehículos con ChileAutos. Por defecto
                      todo está desactivado: activa solo lo que necesites.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Publicar automáticamente</Label>
                        <p className="text-sm text-muted-foreground">
                          Publicar en ChileAutos al crear un vehículo
                        </p>
                      </div>
                      <Switch
                        checked={integration.sync_on_publish}
                        onCheckedChange={(checked) =>
                          handleConfigChange('sync_on_publish', checked)
                        }
                        disabled={isUpdatingConfig}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Actualizar al editar</Label>
                        <p className="text-sm text-muted-foreground">
                          Sincronizar cambios de precio, km, etc.
                        </p>
                      </div>
                      <Switch
                        checked={integration.sync_on_update}
                        onCheckedChange={(checked) =>
                          handleConfigChange('sync_on_update', checked)
                        }
                        disabled={isUpdatingConfig}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Marcar vendido automáticamente</Label>
                        <p className="text-sm text-muted-foreground">
                          Actualizar estado en ChileAutos al vender
                        </p>
                      </div>
                      <Switch
                        checked={integration.sync_on_sold}
                        onCheckedChange={(checked) =>
                          handleConfigChange('sync_on_sold', checked)
                        }
                        disabled={isUpdatingConfig}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <Label htmlFor="whatsapp">WhatsApp para leads</Label>
                      <Input
                        id="whatsapp"
                        placeholder="+56 9 1234 5678"
                        className="mt-2 max-w-xs"
                        defaultValue={integration.whatsapp_number || ''}
                        onBlur={(e) =>
                          handleConfigChange('whatsapp_number', e.target.value)
                        }
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Número donde recibirás los leads de ChileAutos
                      </p>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <div>
                        <Label>Conexión</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Seller Identifier:{' '}
                          <span className="font-mono text-gray-700 break-all">
                            {integration.seller_identifier}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshToken()}
                          disabled={isRefreshingToken}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                          {isRefreshingToken ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Renovar token
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDisconnect}
                          disabled={isDisconnecting}
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-red-600"
                        >
                          {isDisconnecting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          ) : null}
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Single Vehicle Publish Sheet */}
      {sheetVehicleId && (
        <ChileautosPublishSheet
          isOpen={isPublishSheetOpen}
          onClose={() => {
            setIsPublishSheetOpen(false);
            setSheetVehicleId(null);
          }}
          vehicleId={sheetVehicleId}
          onSuccess={() => {
            setSelectedVehicleIds(prev => prev.filter(id => id !== sheetVehicleId));
            queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles-for-chileautos-publish'] });
            toast.success('Vehículo publicado en ChileAutos');
          }}
        />
      )}

      {/* Manual Selection Modal */}
      {vehicleForPublish && (
        <ChileautosPublishModal
          isOpen={isPublishModalOpen}
          onClose={() => {
            setIsPublishModalOpen(false);
            setVehicleForPublish(null);
            setPendingManualVehicles([]);
          }}
          vehicle={vehicleForPublish}
          onSuccess={handlePublishModalSuccess}
          pendingCount={pendingManualVehicles.length}
        />
      )}
      {/* Listing Detail Drawer */}
      <ChileautosListingDetailDrawer
        listing={detailListing}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onSync={(vehicleId) => { update(vehicleId); }}
        onRemove={(vehicleId) => { remove(vehicleId); setIsDetailOpen(false); }}
        onVerify={handleVerifyListing}
        onEdit={(vehicleId) => {
          setEditVehicleId(vehicleId);
          setIsEditSheetOpen(true);
          setIsDetailOpen(false);
        }}
        isSyncing={isUpdating}
      />

      {/* Edit Published Listing Sheet (mode='edit', skipPhotos) */}
      {editVehicleId && (
        <ChileautosPublishSheet
          isOpen={isEditSheetOpen}
          mode="edit"
          onClose={() => {
            setIsEditSheetOpen(false);
            setEditVehicleId(null);
          }}
          vehicleId={editVehicleId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
            queryClient.invalidateQueries({ queryKey: ['vehicles-for-chileautos-publish'] });
            toast.success('Publicación actualizada en ChileAutos');
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default ChileautosPage;
