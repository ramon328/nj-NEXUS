import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/App';
import posthog from '@/utils/posthog';

type NavigateFunction = (path: string, options?: { replace?: boolean }) => void;
type ClearAuthStateFunction = () => void;

// Function to clear all application state and caches
const clearApplicationState = () => {
  try {
    // ── 1. Clear React Query cache (prevents cross-client data leaks) ──
    try {
      queryClient.clear();
    } catch (error) {
      console.warn('Could not clear React Query cache:', error);
    }

    // ── 2. Clear sensitive localStorage keys (keeping UI preferences) ──
    const keysToRemove = [
      'supabase.auth.token',
      'supabase.auth.user',
      'user-profile',
      'client-data',
      'vehicle-filters',
      'search-history',
    ];

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Could not remove localStorage key ${key}:`, error);
      }
    });

    // ── 3. Clear sessionStorage ──
    try {
      sessionStorage.clear();
    } catch (error) {
      console.warn('Could not clear sessionStorage:', error);
    }

    // ── 4. Reset ALL Zustand stores (dynamic import to avoid circular deps) ──
    import('@/stores/marketingStore')
      .then(({ useMarketingStore }) => {
        const marketingStore = useMarketingStore.getState();
        marketingStore.setSelectedVehicle(null);
        marketingStore.setVehicleSearch('');
        marketingStore.setAllRecommendations([]);
        marketingStore.setFilteredRecommendations([]);
        marketingStore.setSelectedCustomers([]);
        marketingStore.setLoading(false);
        marketingStore.setIsEmailModalOpen(false);
        marketingStore.setCurrentView('campaign');
        marketingStore.setHasCustomerTransactions(null);
        marketingStore.setCheckingTransactions(false);
      })
      .catch((error) => {
        console.warn('Could not reset marketing store:', error);
      });

    import('@/stores/vehicleSaleStore')
      .then(({ useVehicleSaleStore }) => {
        const saleStore = useVehicleSaleStore.getState();
        saleStore.resetStore();
      })
      .catch((error) => {
        console.warn('Could not reset vehicle sale store:', error);
      });

    import('@/stores/closeBusinessDealStore')
      .then(({ useCloseBusinessDealStore }) => {
        useCloseBusinessDealStore.getState().resetStore();
      })
      .catch((error) => {
        console.warn('Could not reset close business deal store:', error);
      });
  } catch (error) {
    console.error('Error clearing application state:', error);
  }
};

export const useAuthOperations = (
  setLoading: (loading: boolean) => void,
  navigate: NavigateFunction,
  clearAuthState?: ClearAuthStateFunction
) => {
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        posthog.identify({ distinctId: userId, properties: { email: data.user?.email } });
        posthog.capture({ distinctId: userId, event: 'user_signed_in', properties: { email: data.user?.email } });
      }

      return { error: null };
    } catch (error) {
      posthog.captureException(error);
      toast({
        title: 'Error al iniciar sesión',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      // First clear all application state
      clearApplicationState();

      // Then sign out from Supabase
      const { error } = await supabase.auth.signOut({
        scope: 'global', // This ensures complete logout from all sessions
      });

      if (error) throw error;

      posthog.capture({ distinctId: 'anonymous', event: 'user_signed_out' });

      // Force navigation to login with replace to prevent back navigation
      navigate('/login', { replace: true });

      // Small delay to ensure navigation completes before showing toast
      setTimeout(() => {
        toast({
          title: 'Sesión cerrada',
          description: 'Has cerrado sesión correctamente.',
        });
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);

      // Even if there's an error, try to clear state and navigate
      clearApplicationState();

      // IMPORTANTE: Limpiar el estado de auth manualmente para forzar el logout
      if (clearAuthState) {
        clearAuthState();
      }

      navigate('/login', { replace: true });

      // Si es AuthSessionMissingError, no mostrar error (ya no hay sesión)
      const isSessionMissing = error?.message?.includes('Auth session missing');

      if (!isSessionMissing) {
        toast({
          title: 'Error al cerrar sesión',
          description: 'Sesión cerrada, pero ocurrió un error en el proceso.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordRequest = async (email: string) => {
    try {
      setLoading(true);

      // Get the current origin for the redirect URL
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      toast({
        title: 'Email enviado',
        description: 'Revisa tu correo para restablecer tu contraseña.',
      });

      return { error: null };
    } catch (error) {
      toast({
        title: 'Error al enviar email',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Contraseña actualizada',
        description: 'Tu contraseña ha sido restablecida correctamente.',
      });

      return { error: null };
    } catch (error) {
      toast({
        title: 'Error al actualizar contraseña',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    } finally {
      setLoading(false);
    }
  };

  return { signIn, signOut, resetPasswordRequest, updatePassword };
};
