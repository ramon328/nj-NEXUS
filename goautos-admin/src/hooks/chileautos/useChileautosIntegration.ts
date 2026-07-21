import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  getChileautosIntegration,
  saveChileautosIntegration,
  updateChileautosConfig,
  deleteChileautosIntegration,
  validateChileautosCredentials,
  refreshChileautosToken,
} from '@/services/chileautosService';
import { ChileautosIntegration, ChileautosProduct } from '@/types/chileautos';

export const useChileautosIntegration = () => {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();

  // Fetch integration
  const {
    data: integration,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['chileautos-integration', clientId],
    queryFn: async () => {
      if (!clientId) return null;
      return await getChileautosIntegration(clientId);
    },
    enabled: !!clientId,
  });

  // Connect/Save integration
  const connectMutation = useMutation({
    mutationFn: async (credentials: {
      seller_identifier: string;
    }) => {
      if (!clientId) throw new Error('Client ID es requerido');

      // El Seller Identifier de ChileAutos es un GUID. La columna en la base es de
      // tipo UUID y rechaza cualquier valor que no lo sea (p.ej. el número de
      // cuenta del dealer), devolviendo un error genérico de guardado. Validamos y
      // limpiamos espacios pegados del portapapeles antes de intentar guardar.
      const sellerIdentifier = credentials.seller_identifier?.trim() ?? '';
      const GUID_REGEX =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!GUID_REGEX.test(sellerIdentifier)) {
        throw new Error(
          'El Seller Identifier debe ser un GUID válido (ej: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx), no el número de cuenta. Lo entrega ChileAutos al activar la API; si no lo tienes, escríbeles a soporte-dealer@chileautos.cl'
        );
      }

      const result = await saveChileautosIntegration(clientId, {
        seller_identifier: sellerIdentifier,
      });

      if (!result) throw new Error('Error al guardar credenciales');

      // Validate credentials with ChileAutos API
      const validation = await validateChileautosCredentials(clientId);
      if (!validation.success) {
        throw new Error(validation.error || 'Credenciales inválidas');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-integration'] });
      toast({
        title: 'Conexión exitosa',
        description:
          'Tu cuenta de ChileAutos ha sido conectada. Ya puedes publicar vehículos.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error de conexión',
        description:
          error.message || 'No se pudo conectar con ChileAutos.',
        variant: 'destructive',
      });
    },
  });

  // Update configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (config: {
      auto_sync?: boolean;
      sync_on_publish?: boolean;
      sync_on_update?: boolean;
      sync_on_sold?: boolean;
      default_products?: ChileautosProduct[];
      whatsapp_number?: string;
    }) => {
      if (!integration) throw new Error('No hay integración activa');
      return await updateChileautosConfig(integration.id, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-integration'] });
      toast({
        title: 'Configuración actualizada',
        description: 'Los cambios han sido guardados.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar la configuración.',
        variant: 'destructive',
      });
    },
  });

  // Disconnect integration
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!integration) throw new Error('No hay integración activa');
      const success = await deleteChileautosIntegration(integration.id);
      if (!success) throw new Error('Error al desconectar');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-integration'] });
      queryClient.invalidateQueries({ queryKey: ['chileautos-listings'] });
      toast({
        title: 'Desconectado',
        description: 'La integración con ChileAutos ha sido eliminada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo desconectar.',
        variant: 'destructive',
      });
    },
  });

  // Refresh token
  const refreshTokenMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error('Client ID es requerido');
      const result = await refreshChileautosToken(clientId);
      if (!result.success) {
        throw new Error(result.error || 'Error al renovar token');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chileautos-integration'] });
      toast({
        title: 'Token renovado',
        description: 'El token de acceso ha sido renovado.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo renovar el token.',
        variant: 'destructive',
      });
    },
  });

  // Check if token is expiring soon (within 1 hour, since ChileAutos tokens are short-lived)
  const isTokenExpiringSoon = integration?.token_expires_at
    ? new Date(integration.token_expires_at) <
      new Date(Date.now() + 60 * 60 * 1000)
    : false;

  const isConnected = integration?.status === 'active';
  const hasError = integration?.status === 'error';

  return {
    integration,
    isLoading,
    error,
    isConnected,
    hasError,
    isTokenExpiringSoon,
    refetch,
    connect: connectMutation.mutate,
    connectAsync: connectMutation.mutateAsync,
    isConnecting: connectMutation.isPending,
    updateConfig: updateConfigMutation.mutate,
    isUpdatingConfig: updateConfigMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    refreshToken: refreshTokenMutation.mutate,
    isRefreshingToken: refreshTokenMutation.isPending,
  };
};
