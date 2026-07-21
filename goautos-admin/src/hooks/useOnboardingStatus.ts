import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'wouter';

export type OnboardingStatus = 'adding_first_vehicle' | 'creating_website' | 'complete';

export const useOnboardingStatus = () => {
  const { client, clientId, refreshClient } = useAuth();
  const [, navigate] = useLocation();
  const [currentStatus, setCurrentStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (client) {
      setCurrentStatus(client.onboarding_status as OnboardingStatus || 'complete');
      setIsLoading(false);
    }
  }, [client]);

  const updateStatus = async (newStatus: OnboardingStatus) => {
    if (!clientId) return;

    try {
      const { error } = await supabase
        .from('clients')
        .update({ onboarding_status: newStatus })
        .eq('id', clientId);

      if (error) {
        console.error('Error updating onboarding status:', error);
        throw error;
      }

      // Actualizar el estado local inmediatamente para una transición fluida
      setCurrentStatus(newStatus);
    } catch (error) {
      console.error('Failed to update onboarding status:', error);
    }
  };

  const completeOnboarding = async () => {
    await updateStatus('complete');
    // Refrescar el client para obtener el nuevo onboarding_status
    await refreshClient();
    // Si ya pagó (flujo de pago automático), directo al dashboard; /subscribe
    // es solo para cuentas sin suscripción vigente (flujo antiguo).
    const hasPaid =
      client?.subscription_status === 'trial' || client?.subscription_status === 'active';
    navigate(hasPaid ? '/' : '/subscribe', { replace: true });
  };

  const skipToWebsite = async () => {
    await updateStatus('creating_website');
    // Refrescar el client para obtener el nuevo onboarding_status
    await refreshClient();
    // Navegar al siguiente paso sin recargar la página
    navigate('/in-app-onboarding', { replace: true });
  };

  const checkIfHasVehicles = async (): Promise<boolean> => {
    if (!clientId) return false;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id')
        .eq('client_id', clientId)
        .limit(1);

      if (error) throw error;

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking vehicles:', error);
      return false;
    }
  };

  const checkIfHasWebsite = async (): Promise<boolean> => {
    if (!clientId) return false;

    try {
      const { data, error } = await supabase
        .from('client_website_config')
        .select('id, elements_structure')
        .eq('client_id', clientId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      return data && data.elements_structure !== null;
    } catch (error) {
      console.error('Error checking website:', error);
      return false;
    }
  };

  return {
    currentStatus,
    isLoading,
    updateStatus,
    completeOnboarding,
    skipToWebsite,
    checkIfHasVehicles,
    checkIfHasWebsite,
    isComplete: currentStatus === 'complete',
    needsVehicle: currentStatus === 'adding_first_vehicle',
    needsWebsite: currentStatus === 'creating_website',
  };
};
