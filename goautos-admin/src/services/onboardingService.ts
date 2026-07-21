import { supabase } from '@/integrations/supabase/client';
import { OnboardingStatus } from '@/hooks/useOnboardingStatus';

export const onboardingService = {
  /**
   * Actualiza el estado del onboarding del cliente
   */
  async updateOnboardingStatus(clientId: string, status: OnboardingStatus) {
    const { error } = await supabase
      .from('clients')
      .update({ onboarding_status: status })
      .eq('id', clientId);

    if (error) {
      console.error('Error updating onboarding status:', error);
      throw error;
    }

    return true;
  },

  /**
   * Verifica si el cliente tiene al menos un vehículo
   */
  async hasVehicles(clientId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('id')
      .eq('client_id', clientId)
      .limit(1);

    if (error) {
      console.error('Error checking vehicles:', error);
      return false;
    }

    return data && data.length > 0;
  },

  /**
   * Verifica si el cliente tiene configurado su sitio web
   */
  async hasWebsite(clientId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('client_website_config')
      .select('id, elements_structure')
      .eq('client_id', clientId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking website:', error);
      return false;
    }

    return data && data.elements_structure !== null;
  },

  /**
   * Obtiene el estado actual del onboarding
   */
  async getOnboardingStatus(clientId: string): Promise<OnboardingStatus> {
    const { data, error } = await supabase
      .from('clients')
      .select('onboarding_status')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error getting onboarding status:', error);
      return 'complete'; // Default seguro
    }

    return (data?.onboarding_status as OnboardingStatus) || 'complete';
  },

  /**
   * Verifica automáticamente el progreso y actualiza el estado si es necesario
   */
  async autoCheckProgress(clientId: string, currentStatus: OnboardingStatus) {
    // Si está en "adding_first_vehicle" pero ya tiene vehículos, avanzar
    if (currentStatus === 'adding_first_vehicle') {
      const hasVehicles = await this.hasVehicles(clientId);
      if (hasVehicles) {
        await this.updateOnboardingStatus(clientId, 'creating_website');
        return 'creating_website';
      }
    }

    // Si está en "creating_website" pero ya tiene website, completar
    if (currentStatus === 'creating_website') {
      const hasWebsite = await this.hasWebsite(clientId);
      if (hasWebsite) {
        await this.updateOnboardingStatus(clientId, 'complete');
        return 'complete';
      }
    }

    return currentStatus;
  },
};
