import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { IntegrationHeader } from '@/components/integrations/IntegrationHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  useFbMarketplaceIntegration,
  useFbMarketplacePublications,
  useFbMarketplacePublish,
} from '@/hooks/facebook-marketplace';
import { VehicleCardSelector, FbMarketplacePublicationsGrid } from '@/components/facebook-marketplace';
import {
  Store,
  AlertCircle,
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
} from 'lucide-react';
import { FB_MARKETPLACE_APP_ID } from '@/config/env';

const facebookConfig = {
  gradientFrom: 'from-blue-600',
  gradientTo: 'to-blue-800',
};

const FacebookMarketplacePage = () => {
  const { clientId } = useAuth();
  const [location, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState('publish');

  // Hooks
  const {
    integrations,
    activeIntegration,
    isLoading: isLoadingIntegration,
    isConnecting,
    isDisconnecting,
    isTokenExpiringSoon,
    connect,
    disconnect,
    refreshToken,
    isRefreshingToken,
    refetch: refetchIntegration,
  } = useFbMarketplaceIntegration();

  const {
    publications,
    isLoading: isLoadingPublications,
    stats,
    sync,
    isSyncing,
    updateStatus,
    isUpdatingStatus,
    refetch: refetchPublications,
  } = useFbMarketplacePublications(activeIntegration?.id);

  const { publishBatch, isPublishingBatch } = useFbMarketplacePublish();

  // Handle OAuth callback
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    const errorMessage = query.get('error_description');

    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      navigate('/facebook-marketplace', { replace: true });
      return;
    }

    if (code && !isConnecting) {
      setError(null);
      connect(code);
      navigate('/facebook-marketplace', { replace: true });
    }
  }, [location, isConnecting]);

  // Generate OAuth URL and redirect
  const handleConnect = () => {
    if (activeIntegration) {
      toast({
        title: 'Business ya conectado',
        description: 'Ya tienes un Business Manager conectado. Desconecta el actual si deseas conectar otro.',
        variant: 'destructive',
      });
      return;
    }

    const redirectUri = encodeURIComponent(`${window.location.origin}/facebook-marketplace`);
    // Permissions for Business Manager and Catalog management
    const scopes = encodeURIComponent('business_management,catalog_management,ads_management');

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
      `client_id=${FB_MARKETPLACE_APP_ID}` +
      `&redirect_uri=${redirectUri}` +
      `&scope=${scopes}` +
      `&response_type=code`;

    window.location.href = authUrl;
  };

  // Handle publish selected vehicles
  const handlePublishSelected = () => {
    if (!activeIntegration) {
      toast({
        title: 'Sin conexión',
        description: 'Conecta tu Facebook Business primero.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedVehicleIds.length === 0) {
      toast({
        title: 'Sin selección',
        description: 'Selecciona al menos un vehículo para publicar.',
        variant: 'destructive',
      });
      return;
    }

    publishBatch({
      vehicleIds: selectedVehicleIds,
      integrationId: activeIntegration.id,
    });

    setSelectedVehicleIds([]);
  };

  // Get published vehicle IDs
  const publishedVehicleIds = publications
    .filter(p => p.status === 'active' || p.status === 'paused')
    .map(p => p.vehicle_id);

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <IntegrationHeader
          title="Catálogo de Facebook"
          description="Sincroniza tu inventario con Facebook para potenciar tus campañas publicitarias"
          icon={Store}
          {...facebookConfig}
        />

        {/* Error alert */}
        {error && (
          <Alert variant="destructive" className="mt-4 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Token expiring warning */}
        {isTokenExpiringSoon && activeIntegration && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-yellow-800">
                Tu token de acceso expirará pronto. Renuévalo para mantener tus publicaciones activas.
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshToken(activeIntegration.id)}
                disabled={isRefreshingToken}
              >
                {isRefreshingToken ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Renovar token
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading state */}
        {isLoadingIntegration && (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-gray-400">Cargando...</div>
          </div>
        )}

        {/* No integration - Empty state (Instagram-style) */}
        {!isLoadingIntegration && !activeIntegration && (
          <div className="space-y-8">
            {/* Hero section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-8 sm:p-12">
              {/* Decorative blurs */}
              <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] rounded-full bg-white/10 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-[-60px] left-[-40px] w-[200px] h-[200px] rounded-full bg-blue-400/20 blur-[60px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-[12px] font-medium mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    Integración con Facebook Business
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
                    Sincroniza tu inventario con Facebook Ads
                  </h2>
                  <p className="text-[15px] text-white/80 leading-relaxed mb-6">
                    Conecta tu Business Manager y crea un catálogo de vehículos para campañas de Dynamic Ads que aparecen en Facebook, Instagram y Marketplace.
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting}
                      size="lg"
                      className="bg-white text-blue-700 hover:bg-white/90 font-semibold shadow-lg shadow-blue-900/20 h-12 px-6 text-[15px]"
                    >
                      <Store className="w-5 h-5 mr-2" />
                      {isConnecting ? 'Conectando...' : 'Conectar Facebook Business'}
                      {!isConnecting && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                    <span className="text-[12px] text-white/60 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Conexión segura vía OAuth
                    </span>
                  </div>
                </div>

                {/* Mock catalog preview */}
                <div className="hidden lg:block w-[280px] shrink-0">
                  <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-2xl">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                      <div>
                        <div className="h-2.5 w-20 rounded-full bg-white/40" />
                        <div className="h-2 w-14 rounded-full bg-white/20 mt-1" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                        <Image className="w-6 h-6 text-white/30" />
                      </div>
                      <div className="aspect-square rounded-lg bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center">
                        <Image className="w-6 h-6 text-white/30" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-white/20" />
                      <div className="h-2 w-3/4 rounded-full bg-white/15" />
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
                  title: 'Catálogo automático',
                  desc: 'Sincroniza vehículos de tu inventario directamente al catálogo de Facebook con un clic.',
                },
                {
                  icon: LayoutGrid,
                  iconBg: 'bg-indigo-50',
                  iconColor: 'text-indigo-600',
                  title: 'Dynamic Ads',
                  desc: 'Crea campañas publicitarias que muestran los vehículos correctos a los compradores interesados.',
                },
                {
                  icon: BarChart3,
                  iconBg: 'bg-sky-50',
                  iconColor: 'text-sky-600',
                  title: 'Gestión centralizada',
                  desc: 'Controla qué vehículos están publicados, pausa o activa publicaciones desde el panel.',
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
                    { step: '1', text: 'Haz clic en "Conectar Facebook Business" e inicia sesión con tu cuenta.' },
                    { step: '2', text: 'Autoriza los permisos de Business Manager y catálogo de productos.' },
                    { step: '3', text: 'Selecciona vehículos de tu inventario y agrégalos al catálogo con un clic.' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
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
                    'Cuenta de Facebook Business Manager activa',
                    'Permisos de administración del catálogo',
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
        )}

        {/* Active integration */}
        {!isLoadingIntegration && activeIntegration && (
          <>
            {/* Integration info card */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                      <Store className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {activeIntegration.fb_business_name || 'Facebook Business'}
                      </CardTitle>
                      <CardDescription>
                        Catálogo: {activeIntegration.catalog_name || 'Sin nombre'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Conectado
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sync(activeIntegration.id)}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sincronizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnect(activeIntegration.id)}
                      disabled={isDisconnecting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Desconectar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-gray-500">Publicaciones activas: </span>
                    <span className="font-semibold text-green-600">{stats.active}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Pausadas: </span>
                    <span className="font-semibold text-gray-600">{stats.paused}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Total: </span>
                    <span className="font-semibold">{stats.total}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs: Publish / Publications */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex items-center justify-between mb-4">
                <TabsList>
                  <TabsTrigger value="publish" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Agregar
                  </TabsTrigger>
                  <TabsTrigger value="publications" className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    En catálogo ({stats.total})
                  </TabsTrigger>
                </TabsList>

                {activeTab === 'publish' && selectedVehicleIds.length > 0 && (
                  <Button
                    onClick={handlePublishSelected}
                    disabled={isPublishingBatch}
                    className="bg-gradient-to-r from-blue-600 to-blue-800"
                  >
                    {isPublishingBatch ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Agregar {selectedVehicleIds.length} vehículo{selectedVehicleIds.length !== 1 ? 's' : ''}
                  </Button>
                )}
              </div>

              {/* Publish tab */}
              <TabsContent value="publish" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Selecciona vehículos para agregar al catálogo</CardTitle>
                    <CardDescription>
                      Selecciona los vehículos de tu inventario que quieres agregar a tu catálogo de Facebook
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VehicleCardSelector
                      selectedIds={selectedVehicleIds}
                      onSelectionChange={setSelectedVehicleIds}
                      publishedVehicleIds={publishedVehicleIds}
                      disabled={isPublishingBatch}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Publications tab */}
              <TabsContent value="publications" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Vehículos en el catálogo</CardTitle>
                    <CardDescription>
                      Gestiona los vehículos sincronizados con tu catálogo de Facebook
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FbMarketplacePublicationsGrid
                      publications={publications}
                      isLoading={isLoadingPublications}
                      onPause={(postId) => updateStatus({ postId, action: 'pause' })}
                      onActivate={(postId) => updateStatus({ postId, action: 'activate' })}
                      onDelete={(postId) => updateStatus({ postId, action: 'delete' })}
                      isUpdating={isUpdatingStatus}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FacebookMarketplacePage;
