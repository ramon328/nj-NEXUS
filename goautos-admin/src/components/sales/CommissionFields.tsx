import React, { useEffect, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Percent, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommissionSplitRow } from './CommissionSplitRow';
import { CommissionSplitInput, validateCommissionSplits } from '@/types/sales';
import { User } from '@/types/user';

interface CommissionFieldsProps {
  showCommission: boolean;
  commissionAmount: number;
  setCommissionAmount: (amount: number) => void;
  commissionPercentage: number;
  setCommissionPercentage: (percentage: number) => void;
  salePrice: number;
  acquisitionCost?: number;
  isConsigned?: boolean;
  commissionBaseType?: 'total' | 'margin';
  setCommissionBaseType?: (type: 'total' | 'margin') => void;
  // Split functionality
  enableSplits?: boolean;
  splits?: CommissionSplitInput[];
  onSplitsChange?: (splits: CommissionSplitInput[]) => void;
  availableUsers?: User[];
}

type CommissionMode = 'amount' | 'percentage';

const CommissionFields = ({
  showCommission,
  commissionAmount,
  setCommissionAmount,
  commissionPercentage,
  setCommissionPercentage,
  salePrice,
  acquisitionCost = 0,
  isConsigned = false,
  commissionBaseType = 'total',
  setCommissionBaseType,
  enableSplits = false,
  splits = [],
  onSplitsChange,
  availableUsers = [],
}: CommissionFieldsProps) => {
  const { tCommon } = useI18n();
  const [mode, setMode] = useState<CommissionMode>('percentage');
  const [isInternalUpdate, setIsInternalUpdate] = useState(false);
  const [isSplitMode, setIsSplitMode] = useState(splits.length > 0);

  // Calculate the base amount for commission (total or margin)
  const calculateBaseAmount = () => {
    if (commissionBaseType === 'margin') {
      return Math.max(0, salePrice - acquisitionCost);
    }
    return salePrice;
  };

  const baseAmount = calculateBaseAmount();

  // Sync percentage to amount when percentage changes AND we're in percentage mode
  useEffect(() => {
    if (!isInternalUpdate && mode === 'percentage' && baseAmount > 0) {
      const calculatedAmount = (baseAmount * commissionPercentage) / 100;
      if (Math.abs(calculatedAmount - commissionAmount) > 0.01) {
        setIsInternalUpdate(true);
        setCommissionAmount(calculatedAmount);
        setIsInternalUpdate(false);
      }
    }
  }, [commissionPercentage, baseAmount, mode]);

  // Sync amount to percentage when amount changes AND we're in amount mode
  useEffect(() => {
    if (!isInternalUpdate && mode === 'amount' && baseAmount > 0) {
      const calculatedPercentage = (commissionAmount / baseAmount) * 100;
      if (Math.abs(calculatedPercentage - commissionPercentage) > 0.01) {
        setIsInternalUpdate(true);
        setCommissionPercentage(calculatedPercentage);
        setIsInternalUpdate(false);
      }
    }
  }, [commissionAmount, baseAmount, mode]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = Number(e.target.value.replace(/[^0-9]/g, ''));
    setCommissionAmount(newAmount);
  };

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPercentage = Number(e.target.value.replace(/[^0-9.]/g, ''));
    setCommissionPercentage(newPercentage);
  };

  const toggleMode = (newMode: CommissionMode) => {
    setMode(newMode);
  };

  if (!showCommission) return null;

  return (
    <div className="bg-white rounded-xl p-3 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
      <div className='flex items-center justify-between mb-2'>
        <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          {tCommon('sales.commission.title')}
        </h4>
        <div className='flex bg-slate-100 rounded-lg p-0.5'>
          <button
            type='button'
            onClick={() => toggleMode('percentage')}
            className={cn(
              'h-7 px-3 rounded-md text-[12px] font-medium transition-colors',
              mode === 'percentage'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            %
          </button>
          <button
            type='button'
            onClick={() => toggleMode('amount')}
            className={cn(
              'h-7 px-3 rounded-md text-[12px] font-medium transition-colors',
              mode === 'amount'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            $
          </button>
        </div>
      </div>

      {/* Commission base type selector (Total vs Margin) */}
      {setCommissionBaseType && (
        <div className='mb-3 p-2.5 bg-slate-50/80 rounded-xl border border-slate-100'>
          <label className='text-[11px] text-slate-400 block mb-2'>
            Calcular comisión sobre:
          </label>
          <div className='flex gap-2'>
            <button
              type='button'
              onClick={() => setCommissionBaseType('total')}
              className={cn(
                'flex-1 h-8 rounded-lg text-[12px] font-medium transition-colors',
                commissionBaseType === 'total'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50'
              )}
            >
              Total de la venta
            </button>
            <button
              type='button'
              onClick={() => setCommissionBaseType('margin')}
              className={cn(
                'flex-1 h-8 rounded-lg text-[12px] font-medium transition-colors',
                commissionBaseType === 'margin'
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200/60 text-slate-600 hover:bg-slate-50'
              )}
            >
              Margen
            </button>
          </div>
          {commissionBaseType === 'margin' && (
            <div className='mt-2.5 text-[12px] text-slate-500 space-y-1'>
              <div className='flex justify-between'>
                <span>Precio de venta:</span>
                <span className='font-medium text-slate-700'>{formatCurrency(salePrice)}</span>
              </div>
              <div className='flex justify-between'>
                <span>{isConsigned ? 'Pago al consignador:' : 'Costo de adquisición:'}</span>
                <span className='font-medium text-slate-700'>-{formatCurrency(acquisitionCost)}</span>
              </div>
              <div className='flex justify-between pt-1.5 border-t border-slate-200'>
                <span className='font-medium text-slate-700'>Margen:</span>
                <span className='font-medium text-sky-500'>{formatCurrency(baseAmount)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'percentage' ? (
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='text-[12px] text-slate-500 block mb-1'>
              {tCommon('sales.commission.percentageLabel')}
            </label>
            <div className='relative'>
              <Input
                type='text'
                value={commissionPercentage}
                onChange={handlePercentageChange}
                className='h-9 text-[13px] font-medium pr-8 rounded-xl border-slate-200/60'
                placeholder='0.0'
              />
              <span className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[12px]'>
                %
              </span>
            </div>
          </div>
          <div>
            <label className='text-[12px] text-slate-500 block mb-1'>
              {tCommon('sales.commission.calculatedAmount')}
            </label>
            <div className='h-9 px-3 py-2 border border-slate-200/60 rounded-xl bg-slate-50/80 text-[13px] font-medium text-slate-600 flex items-center'>
              {formatCurrency(commissionAmount)}
            </div>
          </div>
        </div>
      ) : (
        <div className='grid grid-cols-2 gap-3'>
          <div>
            <label className='text-[12px] text-slate-500 block mb-1'>
              {tCommon('sales.commission.amountLabel')}
            </label>
            <Input
              type='text'
              value={formatCurrency(commissionAmount).replace('CLP', '').trim()}
              onChange={handleAmountChange}
              className='h-9 text-[13px] font-medium rounded-xl border-slate-200/60'
              placeholder='0'
            />
          </div>
          <div>
            <label className='text-[12px] text-slate-500 block mb-1'>
              {tCommon('sales.commission.calculatedPercentage')}
            </label>
            <div className='h-9 px-3 py-2 border border-slate-200/60 rounded-xl bg-slate-50/80 text-[13px] font-medium text-slate-600 flex items-center'>
              {commissionPercentage.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {/* Commission Splits Section */}
      {enableSplits && onSplitsChange && (
        <CommissionSplitsSection
          isSplitMode={isSplitMode}
          setIsSplitMode={setIsSplitMode}
          splits={splits}
          onSplitsChange={onSplitsChange}
          availableUsers={availableUsers}
          totalCommission={commissionAmount}
        />
      )}
    </div>
  );
};

// Commission Splits Section Component
interface CommissionSplitsSectionProps {
  isSplitMode: boolean;
  setIsSplitMode: (value: boolean) => void;
  splits: CommissionSplitInput[];
  onSplitsChange: (splits: CommissionSplitInput[]) => void;
  availableUsers: User[];
  totalCommission: number;
}

const CommissionSplitsSection: React.FC<CommissionSplitsSectionProps> = ({
  isSplitMode,
  setIsSplitMode,
  splits,
  onSplitsChange,
  availableUsers,
  totalCommission,
}) => {
  // Calculate validation
  const validation = validateCommissionSplits(splits, totalCommission);

  // Calculate total assigned
  const totalAssigned = splits.reduce((sum, split) => {
    if (split.splitType === 'percentage' && split.percentage) {
      return sum + (totalCommission * split.percentage) / 100;
    }
    return sum + (split.amount || 0);
  }, 0);

  // Get selected user IDs
  const selectedUserIds = splits.map((s) => s.userId).filter(Boolean);

  // Handle toggle split mode
  const handleToggleSplitMode = (checked: boolean) => {
    setIsSplitMode(checked);
    if (checked && splits.length === 0) {
      // Initialize with one empty split
      onSplitsChange([
        {
          id: crypto.randomUUID(),
          userId: '',
          splitType: 'percentage',
          percentage: 100,
        },
      ]);
    } else if (!checked) {
      // Clear splits when disabling
      onSplitsChange([]);
    }
  };

  // Handle split change
  const handleSplitChange = (
    index: number,
    field: keyof CommissionSplitInput,
    value: any
  ) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], [field]: value };
    onSplitsChange(newSplits);
  };

  // Handle multiple field updates at once (avoids stale state when changing
  // splitType + resetting amount/percentage in the same click)
  const handleSplitUpdate = (
    index: number,
    updates: Partial<CommissionSplitInput>
  ) => {
    const newSplits = [...splits];
    newSplits[index] = { ...newSplits[index], ...updates };
    onSplitsChange(newSplits);
  };

  // Handle remove split
  const handleRemoveSplit = (index: number) => {
    const newSplits = splits.filter((_, i) => i !== index);
    onSplitsChange(newSplits);
  };

  // Handle add split
  const handleAddSplit = () => {
    onSplitsChange([
      ...splits,
      {
        id: crypto.randomUUID(),
        userId: '',
        splitType: 'percentage',
        percentage: 0,
      },
    ]);
  };

  return (
    <div className="pt-3 border-t border-slate-100 mt-3">
      {/* Toggle */}
      <div className="flex items-center space-x-2 mb-3">
        <Checkbox
          id="split-commission"
          checked={isSplitMode}
          onCheckedChange={handleToggleSplitMode}
        />
        <label
          htmlFor="split-commission"
          className="text-[12px] font-medium text-slate-700 cursor-pointer"
        >
          Dividir entre múltiples colaboradores
        </label>
      </div>

      {/* Splits list */}
      {isSplitMode && (
        <div className="space-y-2.5">
          {splits.map((split, index) => (
            <CommissionSplitRow
              key={split.id || index}
              split={split}
              index={index}
              users={availableUsers}
              totalCommission={totalCommission}
              selectedUserIds={selectedUserIds}
              onChange={handleSplitChange}
              onUpdate={handleSplitUpdate}
              onRemove={handleRemoveSplit}
              canRemove={splits.length > 1}
            />
          ))}

          {/* Add person button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSplit}
            className="w-full h-8 rounded-xl border-slate-200/60 text-[12px]"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Agregar colaborador
          </Button>

          {/* Validation summary */}
          <div
            className={cn(
              'flex items-center justify-between p-2.5 rounded-xl border',
              validation.valid
                ? 'bg-sky-50/80 border-sky-200'
                : 'bg-red-50/80 border-red-200'
            )}
          >
            <div className="flex items-center gap-1.5">
              {validation.valid ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              )}
              <span
                className={cn(
                  'text-[12px]',
                  validation.valid ? 'text-sky-600' : 'text-red-700'
                )}
              >
                {validation.valid
                  ? 'Asignación válida'
                  : validation.error}
              </span>
            </div>
            <div className="text-[12px] font-medium">
              <span className={validation.valid ? 'text-sky-600' : 'text-red-700'}>
                {formatCurrency(totalAssigned)}
              </span>
              <span className="text-slate-400"> / {formatCurrency(totalCommission)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionFields;
