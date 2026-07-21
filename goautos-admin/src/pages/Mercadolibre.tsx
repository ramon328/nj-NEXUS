import DashboardLayout from '@/components/DashboardLayout';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { IntegrationHeader } from '@/components/integrations/IntegrationHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MERCADOLIBRE_APP_ID } from '@/config/env';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, ShoppingCart, ExternalLink, Car, Pause, XCircle, Play, RefreshCw, RotateCw, ArrowRight, Shield, CheckCircle2, Sparkles, Eye, BarChart3, Upload, Image, Plus, Trash2, Download, Search, Filter } from 'lucide-react';
import ImportMercadoLibreDialog from '@/components/mercadolibre/ImportMercadoLibreDialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import MercadoLibreVehicleSelector from '@/components/mercadolibre/MercadoLibreVehicleSelector';
import { MercadoLibrePublishDialog } from '@/components/vehicle/detail/MercadoLibrePublishDialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import posthog from '@/utils/posthog';

const mercadolibreConfig = {
  gradientFrom: 'from-yellow-400',
  gradientTo: 'to-yellow-600',
};

const MercadolibrePage = () => {
  const { t } = useTranslation('common');
  const { clientId } = useAuth();
  const [location, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectingIntegrationId, setReconnectingIntegrationId] = useState<number | null>(null);
  // Se marca solo cuando una operación real falla con tokenExpired (refresh_token
  // muerto de verdad). El token normal se renueva solo en cada acción, así que la
  // tarjeta muestra "Conectado" y solo ofrece Reconectar en este caso.
  const [reconnectNeededId, setReconnectNeededId] = useState<number | null>(null);
  const [updatingPublicationId, setUpdatingPublicationId] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [republishingPublicationId, setRepublishingPublicationId] = useState<number | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  // Candado síncrono contra doble-publicación (setIsPublishing es asíncrono y no
  // alcanza a deshabilitar el botón antes del segundo click). Ref dedicado: el
  // isProcessingRef de arriba es para el callback OAuth, no reutilizar.
  const isPublishingRef = useRef(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const {
    data: mercadolibreIntegrations,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['mercadolibre-integrations', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meli_integration')
        .select('*')
        .eq('user_id', clientId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  const {
    data: publishedVehicles,
    isLoading: isLoadingVehicles,
    refetch: refetchVehicles,
  } = useQuery({
    queryKey: ['mercadolibre-published-vehicles', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      // Get all vehicles for this client
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId);

      const vehicleIds = vehicles?.map(v => v.id) || [];

      if (vehicleIds.length === 0) return [];

      // Get published vehicles
      const { data, error } = await supabase
        .from('meli_post')
        .select(`
          *,
          vehicle:vehicle_id(
            id,
            brand:brand_id(name),
            model:model_id(name),
            year,
            price,
            main_image
          )
        `)
        .in('vehicle_id', vehicleIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    const errorMessage = query.get('error_description');

    console.log('Mercadolibre useEffect triggered', {
      code,
      errorMessage,
      isProcessing: isProcessingRef.current,
    });

    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      navigate('/mercadolibre', { replace: true });
      return;
    }

    if (code && !isProcessingRef.current) {
      console.log('Starting callback process');
      isProcessingRef.current = true;
      setIsProcessing(true);
      setError(null);
      // Clean code from URL immediately to prevent re-execution
      navigate('/mercadolibre', { replace: true });
      handleMercadolibreCallback(code);
    }
  }, [location]);

  const handleMercadolibreCallback = async (code: string) => {
    try {
      console.log('Processing Mercadolibre callback with code');

      // Retrieve code_verifier from sessionStorage
      const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
      if (!codeVerifier) {
        throw new Error('Code verifier not found');
      }

      // Retrieve the redirect URI that was used for authorization
      const redirectUri = sessionStorage.getItem('meli_redirect_uri') || `${window.location.origin}/mercadolibre`;

      console.log('Sending callback with redirect URI:', redirectUri);

      const { data, error } = await supabase.functions.invoke(
        'mercadolibre-callback',
        {
          body: { code, clientId, codeVerifier, redirectUri },
        }
      );

      if (error) {
        console.error('Error from edge function:', error);
        throw new Error('No se pudo conectar con MercadoLibre. Intenta de nuevo.');
      }

      if (data.error) {
        console.error('API error:', data.error, data.details);

        // Check if it's a duplicate integration error
        if (data.error === 'Integration already exists') {
          setError('Esta cuenta de Mercadolibre ya está conectada');
          toast({
            title: 'Cuenta duplicada',
            description: 'Esta cuenta de Mercadolibre ya está conectada a tu usuario.',
            variant: 'destructive',
          });
          navigate('/mercadolibre', { replace: true });
          return;
        }

        throw new Error(data.error);
      }

      navigate('/mercadolibre', { replace: true });

      posthog.capture({
        distinctId: String(clientId),
        event: 'mercadolibre_connected',
        properties: {},
      });

      toast({
        title: 'Conexión exitosa',
        description: 'Tu cuenta de Mercadolibre ha sido conectada correctamente.',
      });

      refetch();
    } catch (error) {
      console.error('Error connecting Mercadolibre account:', error);
      setError('No pudimos conectar tu cuenta de MercadoLibre. Revisa que la cuenta esté vigente y vuelve a intentar.');
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar tu cuenta de Mercadolibre.',
        variant: 'destructive',
      });
    } finally {
      // Always clean up sessionStorage and processing state
      sessionStorage.removeItem('pkce_code_verifier');
      sessionStorage.removeItem('meli_redirect_uri');
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const handleDeleteIntegration = async (id: number) => {
    try {
      const { error } = await supabase
        .from('meli_integration')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Desconexión exitosa',
        description: 'Tu cuenta de Mercadolibre ha sido desconectada.',
      });

      refetch();
    } catch (error) {
      console.error('Error deleting Mercadolibre integration:', error);
      toast({
        title: 'Error al desconectar',
        description: 'No se pudo desconectar tu cuenta de Mercadolibre.',
        variant: 'destructive',
      });
    }
  };

  const generatePKCEAndRedirect = async () => {
    // Generate PKCE code_verifier and code_challenge
    const generateCodeVerifier = () => {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, (byte) =>
        byte.toString(16).padStart(2, '0')
      ).join('');
    };

    const generateCodeChallenge = async (verifier: string) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(verifier);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    try {
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store code_verifier in sessionStorage for later use
      sessionStorage.setItem('pkce_code_verifier', codeVerifier);

      // IMPORTANT: Use dynamic redirect URI based on current host
      // This must match exactly what is registered in MercadoLibre app settings
      const redirectUri = `${window.location.origin}/mercadolibre`;

      // Store redirect URI to send to callback
      sessionStorage.setItem('meli_redirect_uri', redirectUri);

      console.log('Using redirect URI:', redirectUri);

      const authUrl = `https://auth.mercadolibre.com/authorization?response_type=code&client_id=${MERCADOLIBRE_APP_ID}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error generating PKCE challenge:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la autenticación.',
        variant: 'destructive',
      });
    }
  };

  const handleConnect = async () => {
    // Check if there's already an integration
    if (mercadolibreIntegrations && mercadolibreIntegrations.length > 0) {
      toast({
        title: 'Cuenta ya conectada',
        description: 'Ya tienes una cuenta de Mercadolibre conectada. Desconecta la cuenta actual si deseas conectar otra.',
        variant: 'destructive',
      });
      return;
    }

    await generatePKCEAndRedirect();
  };

  // Marca la conexión como caída y avisa al usuario en lenguaje humano (sin
  // hablar de "tokens"). Se llama solo cuando una operación devuelve tokenExpired,
  // que ML solo emite con invalid_grant (refresh_token muerto de verdad: 6 meses
  // sin uso, permiso revocado en ML, o cambio de clave). Los errores transitorios
  // (ML caído, red) NO llegan acá.
  const flagReconnectNeeded = () => {
    const id = mercadolibreIntegrations?.[0]?.id ?? null;
    if (id) setReconnectNeededId(id);
    toast({
      title: 'Tu conexión con MercadoLibre expiró',
      description:
        'Por seguridad, MercadoLibre cerró la sesión. Haz clic en "Reconectar" en la tarjeta de tu cuenta para volver a activarla.',
      variant: 'destructive',
      duration: 7000,
    });
  };

  const handleReconnectIntegration = async (id: number) => {
    // Un token muerto no se arregla con "renovar" (el refresh_token también murió)
    // y el callback de OAuth rechaza reconectar si la integración todavía existe.
    // Así que borramos la integración muerta —esto NO borra los avisos meli_post—
    // y relanzamos el login de MercadoLibre. Es "Desconectar + Conectar" en 1 clic.
    try {
      setReconnectingIntegrationId(id);
      const { error } = await supabase
        .from('meli_integration')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await generatePKCEAndRedirect(); // redirige a MercadoLibre
    } catch (error) {
      console.error('Error reconnecting MercadoLibre:', error);
      toast({
        title: 'No se pudo reconectar',
        description:
          'Intenta con "Desconectar" y luego "Conectar MercadoLibre".',
        variant: 'destructive',
      });
      setReconnectingIntegrationId(null);
    }
  };

  const handleUpdatePublicationStatus = async (publicationId: number, action: string) => {
    try {
      setUpdatingPublicationId(publicationId);

      const { data, error } = await supabase.functions.invoke(
        'update-mercadolibre-publication-status',
        {
          body: { publicationId, action },
        }
      );

      if (error) {
        console.error('Error from edge function:', error);
        throw new Error('No se pudo actualizar el estado de la publicación en MercadoLibre.');
      }

      // Check if token is expired - show helpful message
      if (data.tokenExpired) {
        flagReconnectNeeded();
        return;
      }

      if (data.error) {
        console.error('API error:', data.error, data.details);
        throw new Error(data.error);
      }

      if (action === 'pause') {
        posthog.capture({
          distinctId: String(clientId),
          event: 'mercadolibre_listing_paused',
          properties: {},
        });
      }

      const actionMessages = {
        pause: 'pausada',
        close: 'cerrada',
        activate: 'reactivada',
      };

      toast({
        title: 'Publicación actualizada',
        description: `La publicación ha sido ${actionMessages[action as keyof typeof actionMessages]} exitosamente.`,
      });

      refetchVehicles();
    } catch (error) {
      console.error('Error updating publication status:', error);
      toast({
        title: 'Error al actualizar',
        description: error?.message || 'No se pudo actualizar la publicación.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingPublicationId(null);
    }
  };

  const handleSyncPublications = async () => {
    if (!mercadolibreIntegrations || mercadolibreIntegrations.length === 0) {
      toast({
        title: 'Error',
        description: 'No hay integración activa de MercadoLibre.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSyncing(true);

      const { data, error } = await supabase.functions.invoke(
        'sync-mercadolibre-publications',
        {
          body: { integrationId: mercadolibreIntegrations[0].id },
        }
      );

      if (error) {
        console.error('Error from edge function:', error);
        throw new Error('No se pudieron sincronizar las publicaciones de MercadoLibre.');
      }

      // Check if token is expired - show helpful message
      if (data.tokenExpired) {
        flagReconnectNeeded();
        return;
      }

      if (data.error) {
        console.error('API error:', data.error);
        throw new Error(data.error);
      }

      toast({
        title: 'Sincronización completa',
        description: `Se actualizaron ${data.updated} de ${data.total} publicaciones.`,
      });

      refetchVehicles();
    } catch (error) {
      console.error('Error syncing publications:', error);
      toast({
        title: 'Error al sincronizar',
        description: error?.message || 'No se pudieron sincronizar las publicaciones.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRepublishVehicle = async (publicationId: number) => {
    try {
      setRepublishingPublicationId(publicationId);

      const { data, error } = await supabase.functions.invoke(
        'republish-mercadolibre-vehicle',
        {
          body: { publicationId },
        }
      );

      if (error) {
        console.error('Error from edge function:', error);
        throw new Error('No se pudo republicar el vehículo en MercadoLibre.');
      }

      if (data.error) {
        console.error('API error:', data.error, data.details);

        // Check if token is expired
        if (data.tokenExpired) {
          toast({
            title: 'Token expirado',
            description: data.error,
            variant: 'destructive',
          });
          return;
        }

        throw new Error(data.error);
      }

      toast({
        title: 'Vehículo republicado',
        description: 'La publicación ha sido creada exitosamente en MercadoLibre.',
      });

      refetchVehicles();
    } catch (error) {
      console.error('Error republishing vehicle:', error);
      toast({
        title: 'Error al republicar',
        description: error?.message || 'No se pudo republicar el vehículo.',
        variant: 'destructive',
      });
    } finally {
      setRepublishingPublicationId(null);
    }
  };

  const handleDeletePublication = async (publicationId: number) => {
    try {
      // Get current status to decide if we need to close it in ML first
      const { data: post } = await supabase
        .from('meli_post')
        .select('status')
        .eq('id', publicationId)
        .single();

      // If not already closed, close it in MercadoLibre before deleting
      if (post && post.status !== 'closed') {
        await supabase.functions.invoke('update-mercadolibre-publication-status', {
          body: { publicationId, action: 'close' },
        });
      }

      const { error } = await supabase
        .from('meli_post')
        .delete()
        .eq('id', publicationId);

      if (error) throw error;

      toast({
        title: 'Publicación eliminada',
        description: 'La publicación fue cerrada en MercadoLibre y eliminada.',
      });

      await refetchVehicles();
    } catch (error) {
      console.error('Error deleting publication:', error);
      toast({
        title: 'Error al eliminar',
        description: 'No se pudo eliminar el registro de publicación.',
        variant: 'destructive',
      });
    }
  };

  const publishedVehicleIds = (publishedVehicles || [])
    .filter((p: any) => p.status !== 'closed')
    .map((p: any) => p.vehicle_id);

  // Búsqueda (marca/modelo/año/título) + filtros por estado y tipo de publicación.
  const filteredPublications = useMemo(() => {
    const list = publishedVehicles || [];
    const term = searchTerm.trim().toLowerCase();
    return list.filter((p: any) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (typeFilter !== 'all' && p.type_post !== typeFilter) return false;
      if (term) {
        const haystack = `${p.vehicle?.brand?.name ?? ''} ${p.vehicle?.model?.name ?? ''} ${p.vehicle?.year ?? ''} ${p.title ?? ''}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [publishedVehicles, searchTerm, statusFilter, typeFilter]);

  // Métricas reales por estado de los avisos en MercadoLibre (scopeadas al
  // cliente, salen del mismo meli_post que alimenta la tabla de abajo):
  //  - Publicados: activos y visibles ('active').
  //  - Pendientes: en revisión, por activarse o pausados.
  //  - Errores: requieren pago y no llegan a publicarse ('payment_required').
  const meliStats = useMemo(() => {
    const list = publishedVehicles || [];
    const count = (statuses: string[]) =>
      list.filter((p: any) => statuses.includes(p.status)).length;
    return {
      publicados: count(['active']),
      pendientes: count(['under_review', 'not_yet_active', 'paused']),
      errores: count(['payment_required']),
    };
  }, [publishedVehicles]);

  // Último uso = actividad más reciente sobre cualquier aviso (update_at/created_at).
  const meliLastUse = useMemo(() => {
    const list = publishedVehicles || [];
    const times = list
      .map((p: any) => p.update_at || p.created_at)
      .filter(Boolean)
      .map((t: string) => new Date(t).getTime());
    if (times.length === 0) return null;
    return formatDistanceToNow(new Date(Math.max(...times)), {
      addSuffix: true,
      locale: es,
    });
  }, [publishedVehicles]);

  const handleVehicleSelect = (vehicleId: number) => {
    setSelectedVehicleId(vehicleId);
  };

  const handlePublishConfirm = async (listingType: string) => {
    if (!selectedVehicleId || !mercadolibreIntegrations?.length) return;
    // Guard de reentrada: corta el segundo click antes de cualquier await/invoke.
    if (isPublishingRef.current) return;
    isPublishingRef.current = true;

    try {
      setIsPublishing(true);
      const integrationId = mercadolibreIntegrations[0].id;

      const { data, error } = await supabase.functions.invoke(
        'publish-mercadolibre-vehicle',
        {
          body: {
            vehicleId: selectedVehicleId,
            integrationId,
            listingType,
          },
        }
      );

      if (error) {
        // Try to extract the detailed error message from the edge function response
        let errorMsg = 'No se pudo publicar el vehículo en MercadoLibre.';
        try {
          const errorContext = error.context ? await error.context.json() : null;
          if (errorContext?.error) errorMsg = errorContext.error;
        } catch {
          // Use default error message
        }
        throw new Error(errorMsg);
      }

      if (data.tokenExpired) {
        flagReconnectNeeded();
        return;
      }

      if (data.error) throw new Error(data.error);

      posthog.capture({
        distinctId: String(clientId),
        event: 'mercadolibre_batch_published',
        properties: { vehicle_count: 1 },
      });

      toast({
        title: 'Vehículo publicado',
        description: 'El vehículo se publicó exitosamente en MercadoLibre.',
      });

      refetchVehicles();
      setShowVehicleSelector(false);
    } catch (error) {
      console.error('Error publishing vehicle:', error);
      toast({
        title: 'Error al publicar',
        description: error?.message || 'No se pudo publicar el vehículo.',
        variant: 'destructive',
      });
    } finally {
      setIsPublishing(false);
      setSelectedVehicleId(null);
      isPublishingRef.current = false; // liberar el candado pase lo que pase
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-pulse text-gray-400">Cargando...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <IntegrationHeader
          title="Integración de Mercadolibre"
          description="Publica y gestiona tus vehículos en Mercadolibre"
          icon={ShoppingCart}
          gradientFrom={mercadolibreConfig.gradientFrom}
          gradientTo={mercadolibreConfig.gradientTo}
        />

        {error && (
          <Alert variant="destructive" className="mt-4 mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {mercadolibreIntegrations && mercadolibreIntegrations.length > 0 ? (
          <div className="space-y-8">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {mercadolibreIntegrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  id={integration.id}
                  title={integration.first_name}
                  subtitle={integration.email || 'Sin email'}
                  createdAt={integration.created_at}
                  icon={ShoppingCart}
                  onDelete={handleDeleteIntegration}
                  statusMode="simple"
                  needsReconnect={reconnectNeededId === integration.id}
                  onReconnect={handleReconnectIntegration}
                  isReconnecting={reconnectingIntegrationId === integration.id}
                  gradientFrom={mercadolibreConfig.gradientFrom}
                  gradientTo={mercadolibreConfig.gradientTo}
                />
              ))}
            </div>

            {/* Métricas reales de los avisos en MercadoLibre (mismos datos que la
                tabla de abajo), en una fila pareja al estilo ChileAutos. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="rounded-2xl border-slate-200/60 shadow-none" title="Avisos activos y visibles en MercadoLibre">
                <CardContent className="p-4">
                  <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Publicados
                  </p>
                  <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">{meliStats.publicados}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200/60 shadow-none" title="En revisión de MercadoLibre, por activarse o pausados">
                <CardContent className="p-4">
                  <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Pendientes
                  </p>
                  <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">{meliStats.pendientes}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200/60 shadow-none" title="Requieren pago en MercadoLibre y no llegan a publicarse">
                <CardContent className="p-4">
                  <p className="text-[13px] text-slate-500 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Errores
                  </p>
                  <p className="text-xl font-semibold text-slate-900 tabular-nums mt-1">{meliStats.errores}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-slate-200/60 shadow-none" title="Última actividad sobre tus avisos (publicar, editar o sincronizar)">
                <CardContent className="p-4">
                  <p className="text-[13px] text-slate-500">Último uso</p>
                  <p className="text-base font-semibold text-slate-900 mt-1">{meliLastUse ?? '—'}</p>
                </CardContent>
              </Card>
            </div>

            {/* Published Vehicles Section */}
            <Card className="mt-8">
              <CardHeader className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <Car className="h-5 w-5 shrink-0" />
                      Vehículos Publicados
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Avisos que tienes en MercadoLibre (publicados o importados desde la plataforma)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setShowVehicleSelector(!showVehicleSelector)}
                      size="sm"
                      className={
                        showVehicleSelector
                          ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 border-0'
                          : 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 border-0'
                      }
                    >
                      {showVehicleSelector ? (
                        <>
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Cerrar
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-1.5" />
                          Publicar
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setShowImportDialog(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Download className="h-4 w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Importar</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          disabled={isSyncing}
                          size="sm"
                          className="bg-sky-600 hover:bg-sky-700 text-white"
                        >
                          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''} sm:mr-1.5`} />
                          <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Sincronizar con MercadoLibre?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se enviará a MercadoLibre el <strong>precio y los datos actuales del CRM</strong> de
                            cada vehículo publicado, <strong>sobrescribiendo</strong> lo que haya en los avisos
                            activos. Asegúrate de que los precios del CRM estén correctos antes de continuar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-sky-600 hover:bg-sky-700"
                            onClick={handleSyncPublications}
                          >
                            Sí, sincronizar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              {showVehicleSelector && (
                <div className="px-6 pb-4">
                  <div className="border rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Selecciona un vehículo para publicar</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Haz clic en un vehículo para elegir el tipo de publicación y publicarlo en MercadoLibre.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowVehicleSelector(false)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <MercadoLibreVehicleSelector
                      onSelect={handleVehicleSelect}
                      publishedVehicleIds={publishedVehicleIds}
                      disabled={isPublishing}
                    />
                  </div>
                </div>
              )}

              <MercadoLibrePublishDialog
                isOpen={selectedVehicleId !== null}
                onClose={() => setSelectedVehicleId(null)}
                onConfirm={handlePublishConfirm}
                vehicleId={selectedVehicleId || 0}
                isPublishing={isPublishing}
              />

              {mercadolibreIntegrations && mercadolibreIntegrations.length > 0 && (
                <ImportMercadoLibreDialog
                  isOpen={showImportDialog}
                  onClose={() => setShowImportDialog(false)}
                  integrationId={mercadolibreIntegrations[0].id}
                  clientId={clientId}
                  onSuccess={() => refetchVehicles()}
                />
              )}

              <CardContent>
                {isLoadingVehicles ? (
                  <div className="text-center py-8 text-gray-400">
                    Cargando publicaciones...
                  </div>
                ) : publishedVehicles && publishedVehicles.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative flex-1 sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar marca, modelo o año..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger
                          className={cn('w-auto px-2.5 gap-1 shrink-0', statusFilter !== 'all' && 'border-sky-400')}
                          aria-label="Filtrar por estado"
                        >
                          <Filter className={cn('h-4 w-4', statusFilter !== 'all' ? 'text-sky-500' : 'text-gray-400')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="active">Activa</SelectItem>
                          <SelectItem value="paused">Pausada</SelectItem>
                          <SelectItem value="closed">Cerrada</SelectItem>
                          <SelectItem value="payment_required">Pago requerido</SelectItem>
                          <SelectItem value="under_review">En revisión</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger
                          className={cn('w-auto px-2.5 gap-1 shrink-0', typeFilter !== 'all' && 'border-yellow-400')}
                          aria-label="Filtrar por tipo de publicación"
                        >
                          <Sparkles className={cn('h-4 w-4', typeFilter !== 'all' ? 'text-yellow-500' : 'text-gray-400')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos los tipos</SelectItem>
                          <SelectItem value="gold_premium">Gold Premium</SelectItem>
                          <SelectItem value="gold">Gold</SelectItem>
                          <SelectItem value="silver">Silver</SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {filteredPublications.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No hay publicaciones que coincidan con la búsqueda.
                      </div>
                    ) : (
                      filteredPublications.map((publication: any) => {
                      const getListingTypeBadge = (type: string | null) => {
                        const types = {
                          free: { label: 'Free', color: 'bg-green-100 text-green-800' },
                          silver: { label: 'Silver', color: 'bg-gray-100 text-gray-800' },
                          gold: { label: 'Gold', color: 'bg-yellow-100 text-yellow-800' },
                          gold_premium: { label: 'Gold Premium', color: 'bg-purple-100 text-purple-800' },
                        };
                        const typeInfo = types[type as keyof typeof types] || types.free;
                        return (
                          <Badge className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        );
                      };

                      const getStatusBadge = (status: string) => {
                        const statuses: Record<string, { label: string; color: string; dot: string }> = {
                          active: { label: 'Activa', color: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
                          payment_required: { label: 'Pago requerido', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
                          under_review: { label: 'En revisión', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
                          paused: { label: 'Pausada', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
                          closed: { label: 'Cerrada', color: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
                        };
                        const statusInfo = statuses[status] || { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
                        return (
                          <Badge variant="outline" className={`${statusInfo.color} gap-1.5 font-medium`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                            {statusInfo.label}
                          </Badge>
                        );
                      };

                      return (
                        <div
                          key={publication.id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border rounded-xl bg-white shadow-sm hover:shadow-md hover:border-gray-300 transition-all"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                            {publication.vehicle?.main_image ? (
                              <img
                                src={publication.vehicle.main_image}
                                alt={publication.title}
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                                <Car className="h-7 w-7 text-gray-300" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm sm:text-base truncate">
                                {publication.vehicle
                                  ? `${publication.vehicle?.brand?.name ?? ''} ${publication.vehicle?.model?.name ?? ''} ${publication.vehicle?.year ?? ''}`.trim()
                                  : publication.title}
                              </h3>
                              <p className="text-sm font-semibold text-gray-900">
                                ${publication.price?.toLocaleString('es-CL')}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {getListingTypeBadge(publication.type_post)}
                                {getStatusBadge(publication.status)}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch sm:shrink-0">
                            <Button
                              size="sm"
                              className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 border-0"
                              onClick={() => {
                                const url =
                                  publication.url_post ||
                                  (publication.meli_item_id
                                    ? `https://articulo.mercadolibre.cl/${String(publication.meli_item_id).replace(/^([A-Za-z]+)(\d+)$/, '$1-$2')}`
                                    : null);
                                if (url) window.open(url, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4 sm:mr-2" />
                              <span className="hidden sm:inline">Ver en ML</span>
                            </Button>
                            {publication.vehicle_id && (
                              <Button
                                size="sm"
                                className="bg-sky-600 hover:bg-sky-700 text-white"
                                onClick={() => navigate(`/vehiculos/${publication.vehicle_id}`)}
                              >
                                <Car className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Ver auto</span>
                              </Button>
                            )}

                            {publication.status === 'active' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-yellow-400 text-yellow-700 hover:bg-yellow-50 hover:text-yellow-800"
                                onClick={() => handleUpdatePublicationStatus(publication.id, 'pause')}
                                disabled={updatingPublicationId === publication.id}
                              >
                                <Pause className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Pausar</span>
                              </Button>
                            )}

                            {publication.status === 'paused' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdatePublicationStatus(publication.id, 'activate')}
                                  disabled={updatingPublicationId === publication.id}
                                >
                                  <Play className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Reactivar</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdatePublicationStatus(publication.id, 'close')}
                                  disabled={updatingPublicationId === publication.id}
                                >
                                  <XCircle className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Cerrar</span>
                                </Button>
                              </>
                            )}

                            {publication.status === 'closed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRepublishVehicle(publication.id)}
                                disabled={republishingPublicationId === publication.id}
                                className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white hover:from-yellow-500 hover:to-yellow-700 border-0"
                              >
                                <RotateCw className={`h-4 w-4 sm:mr-2 ${republishingPublicationId === publication.id ? 'animate-spin' : ''}`} />
                                <span className="hidden sm:inline">{republishingPublicationId === publication.id ? 'Republicando...' : 'Republicar'}</span>
                              </Button>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 sm:mr-2" />
                                  <span className="hidden sm:inline">Eliminar</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar esta publicación?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {publication.status !== 'closed'
                                      ? 'Se cerrará la publicación en MercadoLibre y se eliminará de la plataforma. Esta acción no se puede deshacer.'
                                      : 'Se eliminará el registro de esta publicación de la plataforma. Esta acción no se puede deshacer.'}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDeletePublication(publication.id)}
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                      })
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4">
                    <p className="text-gray-500 font-medium">
                      Todavía no tienes avisos en MercadoLibre
                    </p>
                    <p className="text-sm text-gray-400 mt-1 max-w-md mx-auto">
                      Usa <strong>Publicar</strong> para crear un aviso nuevo desde tu inventario, o{' '}
                      <strong>Importar</strong> para vincular avisos que ya tienes en tu cuenta de MercadoLibre.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Hero section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-bl from-yellow-300 via-yellow-500 to-yellow-500 p-8 sm:p-12">
              {/* Decorative blurs */}
              <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] rounded-full bg-white/10 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-[-60px] left-[-40px] w-[200px] h-[200px] rounded-full bg-yellow-300/30 blur-[60px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-[12px] font-medium mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    Integración oficial de MercadoLibre
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
                    Publica tus vehículos en MercadoLibre
                  </h2>
                  <p className="text-[15px] text-white/80 leading-relaxed mb-6">
                    Conecta tu cuenta de MercadoLibre y publica vehículos de tu inventario directamente. Gestiona tus publicaciones, pausas y reactivaciones sin salir de GoAutos.
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Button
                      onClick={handleConnect}
                      disabled={isProcessing}
                      size="lg"
                      className="bg-white text-slate-900 hover:bg-white/90 font-semibold shadow-lg shadow-yellow-700/20 h-12 px-6 text-[15px]"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      {isProcessing ? 'Conectando...' : 'Conectar MercadoLibre'}
                      {!isProcessing && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                    <span className="text-[12px] text-white/60 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      Conexión segura vía OAuth + PKCE
                    </span>
                  </div>
                </div>

                {/* Mock MercadoLibre listing preview */}
                <div className="hidden lg:block w-[280px] shrink-0">
                  <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-2xl">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500" />
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
                  iconBg: 'bg-yellow-50',
                  iconColor: 'text-yellow-600',
                  title: 'Publica desde tu inventario',
                  desc: 'Selecciona vehículos y publícalos en MercadoLibre con toda la información y fotos automáticamente.',
                },
                {
                  icon: Car,
                  iconBg: 'bg-amber-50',
                  iconColor: 'text-amber-600',
                  title: 'Gestiona publicaciones',
                  desc: 'Pausa, reactiva o cierra tus publicaciones. Sincroniza el estado directamente desde el panel.',
                },
                {
                  icon: BarChart3,
                  iconBg: 'bg-orange-50',
                  iconColor: 'text-orange-600',
                  title: 'Republica con un clic',
                  desc: 'Cuando una publicación se cierra, republícala instantáneamente sin volver a cargar la información.',
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
                    { step: '1', text: 'Haz clic en "Conectar MercadoLibre" e inicia sesión con tu cuenta.' },
                    { step: '2', text: 'Autoriza los permisos para que GoAutos pueda publicar en tu nombre.' },
                    { step: '3', text: 'Selecciona vehículos de tu inventario y publícalos con un clic.' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
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
                    'Cuenta activa de MercadoLibre',
                    'Permisos para publicar en la categoría Vehículos',
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
      </div>
    </DashboardLayout>
  );
};

export default MercadolibrePage;
