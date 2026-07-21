
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCommissions, CommissionTier, CommissionType } from '@/hooks/useCommissions';

interface CommissionTiersProps {
  userId: number;
  userName: string;
  onSaved?: () => void;
}

const CommissionTiers: React.FC<CommissionTiersProps> = ({ userId, userName, onSaved }) => {
  const [tiers, setTiers] = useState<CommissionTier[]>([
    { id: '1', maxAmount: 20000000, percentage: 1.5, commissionType: 'percentage' },
    { id: '2', maxAmount: 40000000, percentage: 2.0, commissionType: 'percentage' },
    { id: '3', maxAmount: 60000000, percentage: 2.5, commissionType: 'percentage' },
    { id: '4', maxAmount: Infinity, percentage: 3.0, commissionType: 'percentage' },
  ]);

  const { toast } = useToast();
  const { loading, saveCommissionTiers, fetchCommissionTiers } = useCommissions();

  useEffect(() => {
    const loadCommissions = async () => {
      const savedTiers = await fetchCommissionTiers(userId);
      if (savedTiers.length > 0) {
        setTiers(savedTiers);
      }
    };

    loadCommissions();
  }, [userId]);

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newMaxAmount = lastTier.maxAmount === Infinity ? 80000000 : lastTier.maxAmount + 20000000;
    const newPercentage = lastTier.percentage + 0.5;

    const updatedTiers = [...tiers];
    if (lastTier.maxAmount === Infinity) {
      updatedTiers[tiers.length - 1] = { ...lastTier, maxAmount: newMaxAmount - 20000000 };
    }

    setTiers([
      ...updatedTiers,
      { id: Date.now().toString(), maxAmount: Infinity, percentage: newPercentage, commissionType: 'percentage' }
    ]);
  };

  const removeTier = (id: string) => {
    if (tiers.length <= 1) {
      toast({
        title: 'Error',
        description: 'Debe existir al menos un nivel de comisión',
        variant: 'destructive',
      });
      return;
    }

    const newTiers = tiers.filter(tier => tier.id !== id);

    if (newTiers.length > 0 && newTiers[newTiers.length - 1].maxAmount !== Infinity) {
      newTiers[newTiers.length - 1] = {
        ...newTiers[newTiers.length - 1],
        maxAmount: Infinity
      };
    }

    setTiers(newTiers);
  };

  const updateTier = (id: string, field: keyof CommissionTier, value: any) => {
    setTiers(tiers.map(tier => tier.id === id ? { ...tier, [field]: value } : tier));
  };

  const toggleType = (id: string) => {
    setTiers(tiers.map(tier => {
      if (tier.id !== id) return tier;
      const newType: CommissionType = tier.commissionType === 'percentage' ? 'fixed' : 'percentage';
      return { ...tier, commissionType: newType };
    }));
  };

  const formatCurrency = (amount: number): string => {
    if (amount === Infinity) return 'Sin límite';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const saveCommissions = async () => {
    const success = await saveCommissionTiers(userId, tiers);

    if (success) {
      const refreshedTiers = await fetchCommissionTiers(userId);
      if (refreshedTiers.length > 0) {
        setTiers(refreshedTiers);
      }
      onSaved?.();
    }
  };

  const getPreviousMaxAmount = (index: number): number => {
    if (index === 0) return 0;
    return tiers[index - 1].maxAmount;
  };

  return (
    <div className='space-y-4'>
      {/* Title */}
      <div>
        <h3 className='text-[14px] font-semibold text-slate-900'>Niveles de comisión</h3>
        <p className='text-[12px] text-slate-400 mt-0.5'>
          Configura porcentajes o montos fijos según el valor de venta
        </p>
      </div>

      {/* Tiers */}
      <div className='space-y-2'>
        {tiers.map((tier, index) => (
          <div
            key={tier.id}
            className='bg-white rounded-xl border border-slate-200/60 p-3 space-y-2.5'
          >
            {/* Top row: number + range */}
            <div className='flex items-center gap-3'>
              <div className='h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0'>
                <span className='text-[11px] font-semibold text-slate-500'>{index + 1}</span>
              </div>

              <div className='flex-1 min-w-0'>
                <span className='text-[11px] text-slate-400'>Rango de venta</span>
                <div className='flex items-center gap-1.5 mt-0.5'>
                  <span className='text-[12px] text-slate-500 whitespace-nowrap'>
                    {formatCurrency(getPreviousMaxAmount(index))}
                  </span>
                  <span className='text-[11px] text-slate-300'>→</span>
                  {tier.maxAmount === Infinity ? (
                    <span className='text-[12px] font-medium text-slate-700'>Sin límite</span>
                  ) : (
                    <Input
                      type='number'
                      min={getPreviousMaxAmount(index) + 1}
                      value={tier.maxAmount}
                      onChange={(e) => updateTier(tier.id, 'maxAmount', Number(e.target.value))}
                      className='h-7 text-[12px] w-28 px-2'
                    />
                  )}
                </div>
              </div>

              <button
                onClick={() => removeTier(tier.id)}
                className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0'
                type='button'
              >
                <Trash2 className='h-3.5 w-3.5' />
              </button>
            </div>

            {/* Bottom row: type toggle + value */}
            <div className='flex items-center gap-2 pl-10'>
              {/* Type toggle */}
              <div className='flex rounded-lg border border-slate-200 overflow-hidden'>
                <button
                  type='button'
                  onClick={() => updateTier(tier.id, 'commissionType', 'percentage')}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    tier.commissionType === 'percentage'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-400 hover:text-slate-600'
                  }`}
                >
                  %
                </button>
                <button
                  type='button'
                  onClick={() => updateTier(tier.id, 'commissionType', 'fixed')}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    tier.commissionType === 'fixed'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-slate-400 hover:text-slate-600'
                  }`}
                >
                  $
                </button>
              </div>

              {/* Value */}
              {tier.commissionType === 'percentage' ? (
                <div className='flex items-center gap-1'>
                  <Input
                    type='number'
                    min={0.1}
                    max={100}
                    step={0.1}
                    value={tier.percentage}
                    onChange={(e) => updateTier(tier.id, 'percentage', Number(e.target.value))}
                    className='h-7 text-[12px] w-16 px-2 text-center'
                  />
                  <span className='text-[12px] text-slate-400'>%</span>
                </div>
              ) : (
                <div className='flex items-center gap-1'>
                  <span className='text-[12px] text-slate-400'>$</span>
                  <Input
                    type='number'
                    min={0}
                    step={1000}
                    value={tier.fixedAmount || 0}
                    onChange={(e) => updateTier(tier.id, 'fixedAmount', Number(e.target.value))}
                    className='h-7 text-[12px] w-28 px-2'
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add tier */}
      <button
        onClick={addTier}
        className='w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-200 text-[12px] text-slate-400 hover:text-slate-600 hover:border-slate-300 transition-colors'
        type='button'
      >
        <Plus className='h-3.5 w-3.5' />
        Agregar nivel
      </button>

      {/* Save */}
      <Button
        onClick={saveCommissions}
        disabled={loading}
        className='w-full h-9 rounded-xl text-[13px] font-medium bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
      >
        {loading ? (
          <Loader2 className='h-4 w-4 mr-2 animate-spin' />
        ) : (
          <Save className='h-3.5 w-3.5 mr-2' />
        )}
        Guardar comisiones
      </Button>
    </div>
  );
};

export default CommissionTiers;
