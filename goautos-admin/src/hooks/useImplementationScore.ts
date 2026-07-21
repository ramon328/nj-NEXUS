import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Milestone {
  key: string;
  completed: boolean;
  weight: number;
  link: string;
}

export interface ImplementationScore {
  score: number;
  milestones: Milestone[];
  nextStep: Milestone | null;
  isComplete: boolean;
  isLoading: boolean;
}

export const useImplementationScore = (): ImplementationScore => {
  const { client, clientId } = useAuth();
  const [score, setScore] = useState(0);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!clientId) return;

    const calculate = async () => {
      setIsLoading(true);
      try {
        // Run all DB queries in parallel
        const [dealershipCount, vehicleCount, websiteConfig, managedLeadCount, documentCount] =
          await Promise.all([
            // Hito 1: At least one branch with address
            supabase
              .from('dealerships')
              .select('id', { count: 'exact', head: true })
              .eq('client_id', clientId)
              .not('address', 'is', null),

            // Hitos 2 & 3: Vehicle count (all vehicles created, regardless of show_in_stock)
            supabase
              .from('vehicles')
              .select('id', { count: 'exact', head: true })
              .eq('client_id', clientId),

            // Hito 4: Builder personalizado (.maybeSingle to avoid PGRST116 on new clients)
            supabase
              .from('client_website_config')
              .select('elements_structure')
              .eq('client_id', clientId)
              .maybeSingle(),

            // Hito 5: Lead gestionado (any lead moved out of pending)
            supabase
              .from('leads')
              .select('id', { count: 'exact', head: true })
              .eq('client_id', clientId)
              .neq('status', 'pending'),

            // Hito 6: Documento generado intencionalmente (excluye purchase/consignment automáticos)
            supabase
              .from('vehicles_documents')
              .select('id', { count: 'exact', head: true })
              .eq('client_id', clientId)
              .in('type', ['quotation', 'sale', 'reservation', 'close_deal']),
          ]);

        // Hito 1: name + branding (logo or favicon) + at least one branch
        const hasDealershipData = !!(
          client?.name &&
          (client?.logo || client?.favicon) &&
          (dealershipCount.count ?? 0) >= 1
        );

        const vCount = vehicleCount.count ?? 0;
        const hasFirstVehicle = vCount >= 1;
        const hasFiveVehicles = vCount >= 5;
        const hasBuilder = !!websiteConfig.data?.elements_structure;
        const hasLeadManaged = (managedLeadCount.count ?? 0) >= 1;
        const hasDocument = (documentCount.count ?? 0) >= 1;

        const computed: Milestone[] = [
          { key: 'dealershipData', completed: hasDealershipData, weight: 1, link: '/configuracion' },
          { key: 'firstVehicle', completed: hasFirstVehicle, weight: 1, link: '/vehiculos/agregar' },
          { key: 'fiveVehicles', completed: hasFiveVehicles, weight: 1, link: '/vehiculos' },
          { key: 'builder', completed: hasBuilder, weight: 1.5, link: '/builder' },
          { key: 'leadManaged', completed: hasLeadManaged, weight: 2, link: '/leads' },
          { key: 'documentGenerated', completed: hasDocument, weight: 2.5, link: '/vehiculos' },
        ];

        const totalWeight = computed.reduce((acc, m) => acc + m.weight, 0);
        const earned = computed.reduce(
          (acc, m) => acc + (m.completed ? m.weight : 0),
          0
        );
        const percentage = Math.round((earned / totalWeight) * 100);

        setMilestones(computed);
        setScore(percentage);
      } catch (error) {
        console.error('useImplementationScore:', error);
      } finally {
        setIsLoading(false);
        setHasLoaded(true);
      }
    };

    calculate();
  }, [clientId, client?.name, client?.logo, client?.favicon]);

  // Next step: first incomplete milestone sorted by weight desc, then by order asc
  const nextStep =
    milestones
      .map((m, i) => ({ ...m, index: i }))
      .filter((m) => !m.completed)
      .sort((a, b) => b.weight - a.weight || a.index - b.index)[0] ?? null;

  return {
    score,
    milestones,
    nextStep,
    isComplete: hasLoaded && score === 100,
    isLoading: !hasLoaded || isLoading,
  };
};
