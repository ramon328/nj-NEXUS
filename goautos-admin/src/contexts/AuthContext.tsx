import { useAuthOperations } from '@/hooks/useAuthOperations';
import { useAuthState } from '@/hooks/useAuthState';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextProps, Client } from '@/types/user';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '@/stores/languageStore';
import { useSuperadminStore } from '@/stores/superadminStore';
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';

export const AuthContext = createContext<AuthContextProps>({} as AuthContextProps);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [location, navigate] = useLocation();
  const { i18n } = useTranslation();
  const persistedLanguage = useLanguageStore((s) => s.language);
  const setPersistedLanguage = useLanguageStore((s) => s.setLanguage);
  const {
    user,
    setUser,
    session,
    setSession,
    userRole,
    setUserRole,
    userPermissions,
    setUserPermissions,
    userRoleData,
    setUserRoleData,
    isLoading,
    setIsLoading,
    loading,
    setLoading,
    clientId,
    setClientId,
    client,
    setClient,
    userData,
    setUserData,
    userRoles,
    setUserRoles,
  } = useAuthState();

  // Tenant override for superadmin impersonation
  const [tenantOverrideClient, setTenantOverrideClient] = useState<Client | null>(null);
  const [tenantOverrideId, setTenantOverrideId] = useState<number>(0);
  const persistedTenantId = useSuperadminStore((s) => s.selectedTenantId);
  const setPersistedTenantId = useSuperadminStore((s) => s.setSelectedTenantId);

  // Admin multi-automotora: un admin (no superadmin) con >=2 allowed_client_ids
  // puede impersonar SOLO entre esas automotoras permitidas.
  const allowedClientIds: number[] = userData?.allowed_client_ids ?? [];
  const isMultiTenantAdmin = userRole !== 'superadmin' && allowedClientIds.length > 1;
  const canSwitchTenant = userRole === 'superadmin' || isMultiTenantAdmin;

  const isTenantOverride = tenantOverrideId > 0 && (userRole === 'superadmin' || isMultiTenantAdmin);
  const effectiveClientId = isTenantOverride ? tenantOverrideId : clientId;
  const effectiveClient = isTenantOverride ? tenantOverrideClient : client;

  const setTenantOverride = useCallback(async (tenantClientId: number, tenantClient: Client) => {
    // Para no-superadmin (admin multi-automotora), solo permitir tenants en la lista blanca.
    if (userRole !== 'superadmin' && !allowedClientIds.includes(tenantClientId)) return;
    setTenantOverrideId(tenantClientId);
    setTenantOverrideClient(tenantClient);
    setPersistedTenantId(tenantClientId);
  }, [setPersistedTenantId, userRole, allowedClientIds]);

  const clearTenantOverride = useCallback(() => {
    setTenantOverrideId(0);
    setTenantOverrideClient(null);
    setPersistedTenantId(null);
  }, [setPersistedTenantId]);

  // Restore persisted tenant on load (superadmin o admin multi-automotora)
  useEffect(() => {
    if (!canSwitchTenant || !persistedTenantId || tenantOverrideId > 0) return;
    // Para no-superadmin, el tenant persistido debe seguir permitido; si no, limpiar.
    if (userRole !== 'superadmin' && !allowedClientIds.includes(persistedTenantId)) {
      setPersistedTenantId(null);
      return;
    }
    // Fetch the persisted tenant's client data
    const restoreTenant = async () => {
      const { data: tenantData, error } = await supabase
        .from('clients')
        .select('*, legal_info(*), logo')
        .eq('id', persistedTenantId)
        .single();
      if (!error && tenantData) {
        setTenantOverrideId(persistedTenantId);
        setTenantOverrideClient(tenantData);
      } else {
        // Persisted tenant no longer valid
        setPersistedTenantId(null);
      }
    };
    restoreTenant();
  }, [canSwitchTenant, userRole, allowedClientIds, persistedTenantId, tenantOverrideId, setPersistedTenantId]);

  // Función para limpiar el estado de autenticación manualmente (definida antes de usarse)
  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setUserRole('admin');
    setUserPermissions([]);
    setUserRoleData(null);
    setUserRoles([]);
    setClientId(0);
    setClient(null);
    setUserData(null);
    setIsLoading(false);
  };

  const { signIn, signOut, resetPasswordRequest, updatePassword } = useAuthOperations(setLoading, navigate, clearAuthState);
  const { fetchUserProfile } = useUserProfile(
    setUserRole,
    setClientId,
    setClient,
    setIsLoading,
    setUserData,
    setUserPermissions,
    setUserRoleData,
    setUserRoles
  );

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);

        // When the user clicks the password recovery link from their email,
        // Supabase fires PASSWORD_RECOVERY. Navigate to the reset page so
        // they can enter a new password instead of landing on the dashboard.
        if (event === 'PASSWORD_RECOVERY') {
          navigate('/reset-password');
          return;
        }

        if (event === 'SIGNED_OUT') {
          // Force complete state cleanup on sign out
          setUser(null);
          setSession(null);
          setUserRole('admin');
          setUserPermissions([]);
          setUserRoleData(null);
          setUserRoles([]);
          setClientId(0);
          setClient(null);
          setUserData(null);
          setIsLoading(false);

          // Navigate to login with replace to prevent back navigation
          navigate('/login', { replace: true });
          return;
        }

        if (currentSession?.user) {
          fetchUserProfile(currentSession.user.id);
        } else {
          // Complete state reset when no session
          setUserRole('admin');
          setUserPermissions([]);
          setUserRoleData(null);
          setUserRoles([]);
          setClientId(0);
          setClient(null);
          setUserData(null);
          setIsLoading(false);
        }
      });

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchUserProfile(initialSession.user.id);
      } else {
        setIsLoading(false);
      }

      return () => {
        subscription.unsubscribe();
      };
    };

    initializeAuth();
  }, [navigate]);

  // Initialize language when client changes, respecting persisted choice
  useEffect(() => {
    if (persistedLanguage) return; // User has a saved choice
    if (client?.default_language === 'es' || client?.default_language === 'en') {
      setPersistedLanguage(client.default_language);
      i18n.changeLanguage(client.default_language);
    }
  }, [client?.default_language, i18n, persistedLanguage]);

  // Función para refrescar el client manualmente
  const refreshClient = async () => {
    if (!user?.id) return;
    await fetchUserProfile(user.id);
  };

  // Refrescar permisos cuando la ventana recupera el foco
  // Esto permite que cambios hechos por el tenant se reflejen sin re-login
  useEffect(() => {
    const handleFocus = () => {
      if (user?.id && !isLoading) {
        fetchUserProfile(user.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?.id, isLoading]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userRole,
        userPermissions,
        userRoleData,
        userRoles,
        signIn,
        signOut,
        resetPasswordRequest,
        updatePassword,
        loading,
        clientId: effectiveClientId,
        client: effectiveClient,
        userId: user?.id || '',
        isLoading,
        session,
        userData,
        refreshClient,
        clearAuthState,
        setTenantOverride,
        clearTenantOverride,
        isTenantOverride,
        allowedClientIds,
        canSwitchTenant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
