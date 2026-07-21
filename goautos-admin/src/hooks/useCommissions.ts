
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type CommissionType = 'percentage' | 'fixed';

export interface CommissionTier {
  id: string;
  maxAmount: number;
  percentage: number;
  fixedAmount?: number;
  commissionType: CommissionType;
  isInfinity?: boolean;
}

export const useCommissions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const saveCommissionTiers = async (sellerId: number, tiers: CommissionTier[]) => {
    try {
      setLoading(true);

      // First, delete any existing tiers for this seller
      await supabase
        .from('seller_commission_tiers')
        .delete()
        .eq('seller_id', sellerId);

      // Then insert the new tiers
      const tiersToInsert = tiers.map(tier => {
        // For infinity tiers, set a very large number in the database
        // but mark it with is_infinity flag
        const maxAmount = tier.maxAmount === Infinity ? 
          9999999999 : // Use a very large number for infinity
          tier.maxAmount;
          
        return {
          seller_id: sellerId,
          max_amount: maxAmount,
          percentage: tier.commissionType === 'percentage' ? tier.percentage : 0,
          fixed_amount: tier.commissionType === 'fixed' ? (tier.fixedAmount || 0) : null,
          commission_type: tier.commissionType || 'percentage',
          is_infinity: tier.maxAmount === Infinity,
        };
      });

      const { error } = await supabase
        .from('seller_commission_tiers')
        .insert(tiersToInsert);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Configuración de comisiones guardada correctamente",
      });

      return true;
    } catch (error) {
      console.error('Error saving commission tiers:', error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las comisiones",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchCommissionTiers = async (sellerId: number): Promise<CommissionTier[]> => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('seller_commission_tiers')
        .select('*')
        .eq('seller_id', sellerId)
        .order('max_amount', { ascending: true });

      if (error) throw error;

      // Transform the data to match our frontend model
      return (data || []).map(tier => ({
        id: tier.id,
        maxAmount: tier.is_infinity ? Infinity : Number(tier.max_amount),
        percentage: Number(tier.percentage),
        fixedAmount: tier.fixed_amount ? Number(tier.fixed_amount) : undefined,
        commissionType: (tier.commission_type || 'percentage') as CommissionType,
      }));
    } catch (error) {
      console.error('Error fetching commission tiers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las comisiones",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    saveCommissionTiers,
    fetchCommissionTiers
  };
};
