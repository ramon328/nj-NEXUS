import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY_PREFIX = 'last_updates_visit';

/**
 * Hook para detectar si hay novedades nuevas que el usuario no ha visto
 * Usa localStorage para trackear la última visita del usuario
 */
export function useUpdatesNotification() {
  const { userId } = useAuth();
  const [hasNewUpdates, setHasNewUpdates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Obtener la key de localStorage específica para este usuario
  const getStorageKey = useCallback(() => {
    return `${STORAGE_KEY_PREFIX}_${userId || 'guest'}`;
  }, [userId]);

  // Obtener la fecha de la última visita desde localStorage
  const getLastVisit = useCallback((): Date | null => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      return stored ? new Date(stored) : null;
    } catch (error) {
      console.error('Error reading last visit from localStorage:', error);
      return null;
    }
  }, [getStorageKey]);

  // Guardar la fecha de visita actual en localStorage
  const markAsViewed = useCallback(() => {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(getStorageKey(), now);
      setHasNewUpdates(false);
    } catch (error) {
      console.error('Error saving last visit to localStorage:', error);
    }
  }, [getStorageKey]);

  // Verificar si hay novedades más recientes que la última visita
  useEffect(() => {
    const checkForNewUpdates = async () => {
      setIsLoading(true);
      try {
        // Obtener la fecha más reciente de cualquier novedad
        const { data, error } = await supabase
          .from('updates')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          console.error('Error fetching latest update:', error);
          setHasNewUpdates(false);
          return;
        }

        if (!data) {
          setHasNewUpdates(false);
          return;
        }

        const latestUpdateDate = new Date(data.created_at);
        const lastVisit = getLastVisit();

        // Si nunca ha visitado o la última novedad es más reciente que la última visita
        if (!lastVisit || latestUpdateDate > lastVisit) {
          setHasNewUpdates(true);
        } else {
          setHasNewUpdates(false);
        }
      } catch (error) {
        console.error('Error in checkForNewUpdates:', error);
        setHasNewUpdates(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkForNewUpdates();
  }, [getLastVisit]);

  return {
    hasNewUpdates,
    isLoading,
    markAsViewed,
  };
}
