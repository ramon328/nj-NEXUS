import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { FbMarketplaceIntegration } from '@/types/facebookMarketplace';
import posthog from '@/utils/posthog';

export const useFbMarketplaceIntegration = () => {
  const { clientId } = useAuth();
  const queryClient = useQueryClient();

  // Fetch integrations
  const {
    data: integrations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['fb-marketplace-integrations', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('fb_marketplace_integration')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as FbMarketplaceIntegration[];
    },
    enabled: !!clientId,
  });

  // Connect integration (OAuth callback)
  const connectMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!clientId) throw new Error('Client ID is required');

      const redirectUri = `${window.location.origin}/facebook-marketplace`;

      const { data, error } = await supabase.functions.invoke(
        'fb-marketplace-auth',
        {
          body: { code, clientId, redirectUri },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-marketplace-integrations'] });

      posthog.capture({
        distinctId: String(clientId),
        event: 'facebook_connected',
        properties: {},
      });

      toast({
        title: 'Conexión exitosa',
        description: 'Tu Facebook Business ha sido conectado. Ya puedes agregar vehículos al catálogo.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error de conexión',
        description: error.message || 'No se pudo conectar con Facebook Marketplace.',
        variant: 'destructive',
      });
    },
  });

  // Disconnect integration
  const disconnectMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const { error } = await supabase
        .from('fb_marketplace_integration')
        .update({ status: 'disconnected' })
        .eq('id', integrationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-marketplace-integrations'] });
      toast({
        title: 'Desconectado',
        description: 'La integración ha sido desconectada.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo desconectar la integración.',
        variant: 'destructive',
      });
    },
  });

  // Refresh token
  const refreshTokenMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const { data, error } = await supabase.functions.invoke(
        'refresh-fb-marketplace-token',
        {
          body: { integrationId },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fb-marketplace-integrations'] });
      toast({
        title: 'Token renovado',
        description: 'El token de acceso ha sido renovado exitosamente.',
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

  // Get active integration (first one)
  const activeIntegration = integrations?.find(i => i.status === 'active') || null;

  // Check if token is expiring soon (within 7 days)
  const isTokenExpiringSoon = activeIntegration
    ? new Date(activeIntegration.expires_at || '') < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  return {
    integrations: integrations || [],
    activeIntegration,
    isLoading,
    error,
    isTokenExpiringSoon,
    refetch,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
    refreshToken: refreshTokenMutation.mutate,
    isRefreshingToken: refreshTokenMutation.isPending,
  };
};
