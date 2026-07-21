import React from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { CommissionSplitInput, CommissionSplitType } from '@/types/sales';
import { User } from '@/types/user';

interface CommissionSplitRowProps {
  split: CommissionSplitInput;
  index: number;
  users: User[];
  totalCommission: number;
  selectedUserIds: string[];
  onChange: (index: number, field: keyof CommissionSplitInput, value: any) => void;
  onUpdate: (index: number, updates: Partial<CommissionSplitInput>) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export const CommissionSplitRow: React.FC<CommissionSplitRowProps> = ({
  split,
  index,
  users,
  totalCommission,
  selectedUserIds,
  onChange,
  onUpdate,
  onRemove,
  canRemove,
}) => {
  // Filter out users that are already selected (except the current one)
  const availableUsers = users.filter(
    (user) => !selectedUserIds.includes(user.auth_id) || user.auth_id === split.userId
  );

  // Calculate amount based on split type
  const calculatedAmount =
    split.splitType === 'percentage' && split.percentage
      ? (totalCommission * split.percentage) / 100
      : split.amount || 0;

  const handleTypeChange = (type: CommissionSplitType) => {
    // Apply splitType change AND reset the opposite value in a single update,
    // otherwise the second onChange reads stale state and overwrites the first.
    if (type === 'percentage') {
      onUpdate(index, { splitType: type, amount: undefined });
    } else {
      onUpdate(index, { splitType: type, percentage: undefined });
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9.]/g, '');
    const numValue = parseFloat(value) || 0;

    if (split.splitType === 'percentage') {
      onChange(index, 'percentage', Math.min(numValue, 100));
    } else {
      onChange(index, 'amount', numValue);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2.5 border border-slate-100 rounded-xl bg-slate-50/80">
      <div className="flex flex-wrap items-center gap-2">
        {/* User selector */}
        <Select
          value={split.userId || ''}
          onValueChange={(value) => onChange(index, 'userId', value)}
        >
          <SelectTrigger className="w-[170px] h-8 bg-white text-[12px] rounded-lg border-slate-200/60">
            <SelectValue placeholder="Seleccionar colaborador" />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.map((user) => (
              <SelectItem key={user.auth_id} value={user.auth_id}>
                <span className="flex items-center gap-2 text-[12px]">
                  {user.first_name} {user.last_name}
                  <span className="text-[10px] text-slate-400">
                    ({user.rol === 'seller' || user.rol === 'vendedor' ? 'Vendedor' : user.rol === 'admin' || user.rol === 'administrador' ? 'Admin' : user.rol})
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type toggle (% or $) */}
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => handleTypeChange('percentage')}
            className={cn(
              'h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors',
              split.splitType === 'percentage'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('amount')}
            className={cn(
              'h-7 px-2.5 rounded-md text-[12px] font-medium transition-colors',
              split.splitType === 'amount'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            $
          </button>
        </div>

        {/* Value input */}
        <div className="relative">
          <Input
            type="text"
            value={
              split.splitType === 'percentage'
                ? split.percentage || ''
                : split.amount || ''
            }
            onChange={handleValueChange}
            className="w-[90px] h-8 pr-6 bg-white text-[12px] rounded-lg border-slate-200/60"
            placeholder="0"
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px]">
            {split.splitType === 'percentage' ? '%' : '$'}
          </span>
        </div>

        {/* Calculated amount display */}
        <div className="text-[12px] font-medium text-slate-700 min-w-[90px]">
          = {formatCurrency(calculatedAmount)}
        </div>

        {/* Remove button */}
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Optional notes */}
      <Input
        type="text"
        value={split.notes || ''}
        onChange={(e) => onChange(index, 'notes', e.target.value)}
        className="h-7 text-[12px] bg-white rounded-lg border-slate-200/60"
        placeholder="Notas (ej: Captación del cliente)"
      />
    </div>
  );
};

export default CommissionSplitRow;
