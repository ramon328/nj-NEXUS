import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Client } from '@/components/clients/types';

export interface ClientScore {
  score: number;
  completedCount: number;
  totalCount: number;
}

export const useClientsImplementationScores = (clients: Client[]) => {
  const [scores, setScores] = useState<Record<number, ClientScore>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (clients.length === 0) return;

    const clientIds = clients.map((c) => c.id);

    const calculate = async () => {
      setIsLoading(true);
      try {
        const [dealerships, vehicles, websiteConfigs, managedLeads, documents] =
          await Promise.all([
            supabase
              .from('dealerships')
              .select('client_id')
              .in('client_id', clientIds)
              .not('address', 'is', null),
            supabase
              .from('vehicles')
              .select('client_id')
              .in('client_id', clientIds),
            supabase
              .from('client_website_config')
              .select('client_id, elements_structure')
              .in('client_id', clientIds),
            supabase
              .from('leads')
              .select('client_id')
              .in('client_id', clientIds)
              .neq('status', 'pending'),
            supabase
              .from('vehicles_documents')
              .select('client_id')
              .in('client_id', clientIds)
              .in('type', ['quotation', 'sale', 'reservation', 'close_deal']),
          ]);

        // Count per client
        const dealershipCounts: Record<number, number> = {};
        (dealerships.data || []).forEach((d) => {
          dealershipCounts[d.client_id] = (dealershipCounts[d.client_id] || 0) + 1;
        });

        const vehicleCounts: Record<number, number> = {};
        (vehicles.data || []).forEach((v) => {
          vehicleCounts[v.client_id] = (vehicleCounts[v.client_id] || 0) + 1;
        });

        const builderSet = new Set<number>();
        (websiteConfigs.data || []).forEach((w) => {
          if (w.elements_structure) builderSet.add(w.client_id);
        });

        const leadSet = new Set<number>();
        (managedLeads.data || []).forEach((l) => {
          leadSet.add(l.client_id);
        });

        const docSet = new Set<number>();
        (documents.data || []).forEach((d) => {
          docSet.add(d.client_id);
        });

        const weights = [1, 1, 1, 1.5, 2, 2.5]; // 6 milestones
        const totalWeight = weights.reduce((a, b) => a + b, 0);

        const result: Record<number, ClientScore> = {};

        for (const client of clients) {
          const cid = client.id;
          const hasDealership = !!(
            client.name &&
            (client.logo || client.favicon) &&
            (dealershipCounts[cid] || 0) >= 1
          );
          const vCount = vehicleCounts[cid] || 0;
          const milestones = [
            hasDealership,
            vCount >= 1,
            vCount >= 5,
            builderSet.has(cid),
            leadSet.has(cid),
            docSet.has(cid),
          ];

          const earned = milestones.reduce(
            (acc, completed, i) => acc + (completed ? weights[i] : 0),
            0
          );
          const completedCount = milestones.filter(Boolean).length;

          result[cid] = {
            score: Math.round((earned / totalWeight) * 100),
            completedCount,
            totalCount: milestones.length,
          };
        }

        setScores(result);
      } catch (error) {
        console.error('useClientsImplementationScores:', error);
      } finally {
        setIsLoading(false);
      }
    };

    calculate();
  }, [clients.map((c) => c.id).join(',')]);

  return { scores, isLoading };
};
