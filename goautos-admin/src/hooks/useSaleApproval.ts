import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateSalesQueries } from '@/lib/invalidateSalesQueries';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CommissionSplitInput } from '@/types/sales';
import { getCommissionSplits, syncCommissionSplits } from '@/services/vehicleSaleService';
import posthog from '@/utils/posthog';

interface UseSaleApprovalProps {
  onSuccess: () => void;
}

export const useSaleApproval = ({ onSuccess }: UseSaleApprovalProps) => {
  const queryClient = useQueryClient();

  // Tras aprobar / rechazar / revertir / actualizar una venta, refrescar
  // dashboards, resumen del mes y valor de inventario antes del callback del padre.
  const handleMutationSuccess = () => {
    invalidateSalesQueries(queryClient);
    onSuccess();
  };

  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [commissionAmount, setCommissionAmount] = useState<number>(0);
  const [commissionPercentage, setCommissionPercentage] = useState<number>(0);
  const [commissionBaseType, setCommissionBaseType] = useState<'total' | 'margin'>('total');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [commissionSplits, setCommissionSplits] = useState<CommissionSplitInput[]>([]);

  const openApprovalDialog = async (sale: any) => {
    setSelectedSale(sale);

    // Load commission_base_type from sale data (defaults to 'total' if not set)
    setCommissionBaseType(sale.commission_base_type || 'total');

    // ALWAYS use saved commission values if they exist (for approved sales or manually set commissions)
    if (sale.commission_amount > 0 || sale.commission_percentage > 0) {
      setCommissionAmount(sale.commission_amount || 0);
      setCommissionPercentage(sale.commission_percentage || 0);
    } else if (sale.seller_id) {
      // Only calculate default commission for new sales without commission data
      const { data: sellerData } = await supabase
        .from('seller_commission_tiers')
        .select('percentage, fixed_amount, commission_type')
        .eq('seller_id', sale.seller_id)
        .order('max_amount', { ascending: true })
        .limit(1)
        .single();

      if (sellerData) {
        // Comisión fija: el vendedor cobra un monto fijo (ignora el %).
        if ((sellerData as any).commission_type === 'fixed') {
          setCommissionPercentage(0);
          setCommissionAmount(Number((sellerData as any).fixed_amount) || 0);
        } else {
          const percentage = sellerData.percentage;
          setCommissionPercentage(percentage);

          // Calculate commission based on the base type
          const baseType = sale.commission_base_type || 'total';
          const acquisitionCost = sale.acquisition_cost || 0;
          const baseAmount = baseType === 'margin'
            ? Math.max(0, sale.sale_price - acquisitionCost)
            : sale.sale_price;

          setCommissionAmount((baseAmount * percentage) / 100);
        }
      } else {
        setCommissionAmount(0);
        setCommissionPercentage(0);
      }
    } else {
      setCommissionAmount(0);
      setCommissionPercentage(0);
    }

    setApprovalNotes('');

    // Load existing commission splits
    try {
      const existingSplits = await getCommissionSplits(sale.id);
      if (existingSplits && existingSplits.length > 0) {
        setCommissionSplits(
          existingSplits.map((split) => ({
            id: split.id,
            userId: split.user_id,
            splitType: split.split_type as 'percentage' | 'amount',
            percentage: split.percentage || undefined,
            amount: split.amount || undefined,
            notes: split.notes || undefined,
          }))
        );
      } else {
        setCommissionSplits([]);
      }
    } catch (error) {
      console.error('Error loading commission splits:', error);
      setCommissionSplits([]);
    }

    setApprovalDialog(true);
  };

  const handleApprove = async (
    isInitialApproval: boolean,
    isUpdateOnly: boolean = false
  ) => {
    if (!selectedSale) return false;

    try {
      const updateData: any = {
        seller_id: selectedSale.seller_id,
        commission_amount: commissionAmount,
        commission_percentage: commissionPercentage,
        commission_base_type: commissionBaseType,
      };

      // Si es solo una actualización, no cambiar el estado
      if (isUpdateOnly) {
        // Solo actualizar información, mantener el estado actual
        if (approvalNotes) {
          updateData.approval_notes = approvalNotes;
        }
      } else if (isInitialApproval) {
        // Aprobar venta
        updateData.status = 'approved';
        updateData.approval_date = new Date().toISOString();
      } else {
        // Rechazar venta
        updateData.status = 'rejected';
      }

      if (approvalNotes && !isUpdateOnly) {
        updateData.approval_notes = approvalNotes;
      }

      if (isInitialApproval) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (!userError && userData) {
          updateData.approved_by = userData.id;
        }
      }

      // Actualizar la venta
      const { error: saleError } = await supabase
        .from('vehicles_sales')
        .update(updateData)
        .eq('id', selectedSale.id);

      if (saleError) {
        toast({
          title: 'Error',
          description: `No se pudo actualizar la venta: ${saleError.message}`,
          variant: 'destructive',
        });
        return false;
      }

      // Sync commission splits
      if (commissionSplits.length > 0 || isUpdateOnly) {
        const splitsResult = await syncCommissionSplits(
          selectedSale.id,
          commissionSplits,
          commissionAmount
        );

        if (!splitsResult) {
          console.error('Error syncing commission splits, but continuing');
          // Don't fail the entire operation if splits sync fails
        }
      }

      // Get auth user ID for tracking
      const authUserId = (await supabase.auth.getUser()).data.user?.id || 'anonymous';

      // Si es solo una actualización, no hacer nada más
      if (isUpdateOnly) {
        posthog.capture({
          distinctId: authUserId,
          event: 'sale_commission_configured',
          properties: {
            sale_id: selectedSale.id,
            commission_type: commissionBaseType,
          },
        });
        toast({
          title: 'Éxito',
          description: 'Información de la venta actualizada correctamente',
          variant: 'default',
        });
        handleMutationSuccess();
        setApprovalDialog(false);
        return true;
      }

      // El trigger en la DB se encarga de:
      //   - Aprobación → mover vehículo a "Vendido"
      //   - Rechazo → devolver vehículo a "Publicado"
      // No necesitamos actualizar el vehículo manualmente desde el frontend.

      if (!isInitialApproval) {
        posthog.capture({
          distinctId: authUserId,
          event: 'sale_rejected',
          properties: {
            sale_id: selectedSale.id,
          },
        });
        toast({
          title: 'Éxito',
          description: 'Venta rechazada. El vehículo ha vuelto a estar disponible.',
          variant: 'default',
        });
      } else {
        posthog.capture({
          distinctId: authUserId,
          event: 'sale_approved',
          properties: {
            sale_id: selectedSale.id,
            vehicle_id: selectedSale.vehicle_id,
          },
        });
        toast({
          title: 'Éxito',
          description: 'Venta aprobada correctamente',
          variant: 'default',
        });
      }

      handleMutationSuccess();
      setApprovalDialog(false); // Close dialog after successful update
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleRevert = async (reason: string): Promise<boolean> => {
    if (!selectedSale) return false;

    if (!['approved', 'completed'].includes(selectedSale.status)) {
      toast({
        title: 'Acción no permitida',
        description: 'Solo se puede devolver a pendiente una venta aprobada.',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const authUserId = (await supabase.auth.getUser()).data.user?.id;
      let revertedById: number | null = null;
      if (authUserId) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authUserId)
          .single();
        if (userData) revertedById = userData.id;
      }

      const { error } = await supabase
        .from('vehicles_sales')
        .update({
          status: 'pending',
          reverted_at: new Date().toISOString(),
          reverted_by: revertedById,
          revert_reason: reason || null,
        })
        .eq('id', selectedSale.id);

      if (error) {
        toast({
          title: 'Error',
          description: `No se pudo devolver la venta: ${error.message}`,
          variant: 'destructive',
        });
        return false;
      }

      posthog.capture({
        distinctId: authUserId || 'anonymous',
        event: 'sale_reverted_to_pending',
        properties: {
          sale_id: selectedSale.id,
          vehicle_id: selectedSale.vehicle_id,
          had_reason: !!reason,
        },
      });

      toast({
        title: 'Venta devuelta a pendiente',
        description: 'El vehículo volvió a estar publicado. Puedes corregir y aprobar de nuevo.',
        variant: 'default',
      });

      handleMutationSuccess();
      setApprovalDialog(false);
      return true;
    } catch (error) {
      console.error('Error reverting sale:', error);
      return false;
    }
  };

  const updateSeller = async (saleId: number, sellerId: number | null) => {
    try {
      const { error } = await supabase
        .from('vehicles_sales')
        .update({ seller_id: sellerId })
        .eq('id', saleId);

      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el vendedor',
          variant: 'destructive',
        });
        return false;
      }

      toast({
        title: 'Éxito',
        description: 'Vendedor actualizado correctamente',
      });

      handleMutationSuccess();
      setApprovalDialog(false); // Close dialog after successful update
      return true;
    } catch (error) {
      return false;
    }
  };

  // Cuentas por cobrar de financieras: marcar si la financiera ya pagó a la
  // automotora el monto financiado (ventas a crédito). No cierra el diálogo.
  const handleToggleFinancingSettled = async (settled: boolean) => {
    if (!selectedSale?.id) return false;
    try {
      const settledAt = settled ? new Date().toISOString() : null;
      const { error } = await supabase
        .from('vehicles_sales')
        .update({ financing_settled: settled, financing_settled_at: settledAt })
        .eq('id', selectedSale.id);
      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el pago de la financiera',
          variant: 'destructive',
        });
        return false;
      }
      selectedSale.financing_settled = settled;
      selectedSale.financing_settled_at = settledAt;
      setSelectedSale({ ...selectedSale });
      invalidateSalesQueries(queryClient);
      toast({
        title: 'Listo',
        description: settled
          ? 'Pago de la financiera marcado como recibido.'
          : 'Pago de la financiera marcado como pendiente.',
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    selectedSale,
    approvalDialog,
    setApprovalDialog,
    commissionAmount,
    setCommissionAmount,
    commissionPercentage,
    setCommissionPercentage,
    commissionBaseType,
    setCommissionBaseType,
    approvalNotes,
    setApprovalNotes,
    commissionSplits,
    setCommissionSplits,
    openApprovalDialog,
    handleApprove,
    handleRevert,
    handleToggleFinancingSettled,
    updateSeller,
  };
};
