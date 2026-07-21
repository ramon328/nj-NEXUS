import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Save, Undo2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';

interface DialogActionsProps {
  status: string;
  isUpdating: boolean;
  onClose: () => void;
  onReject: () => void;
  onApprove: () => void;
  onSave: () => void;
  onRevert?: () => void;
}

export const DialogActions = ({
  status,
  isUpdating,
  onClose,
  onReject,
  onApprove,
  onSave,
  onRevert,
}: DialogActionsProps) => {
  const { tCommon } = useI18n();
  if (status === 'pending') {
    return (
      <div className='flex flex-col w-full gap-2 sm:flex-row sm:justify-between'>
        <Button
          type='button'
          variant='outline'
          onClick={onReject}
          className='border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl text-[12px] h-9 w-full sm:w-auto'
        >
          <X className='mr-1.5 h-3.5 w-3.5' />
          {tCommon('sales.dialog.actions.reject')}
        </Button>
        <Button
          type='button'
          onClick={onApprove}
          className='bg-emerald-500 hover:bg-emerald-600 rounded-xl text-[12px] h-9 w-full sm:w-auto'
        >
          <Check className='mr-1.5 h-3.5 w-3.5' />
          {tCommon('sales.dialog.actions.approve')}
        </Button>
      </div>
    );
  }

  const canRevert = onRevert && (status === 'approved' || status === 'completed');

  return (
    <div className='flex flex-col w-full gap-2 sm:flex-row sm:justify-between'>
      {canRevert ? (
        <Button
          type='button'
          variant='outline'
          onClick={onRevert}
          disabled={isUpdating}
          className='border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl text-[12px] h-9 w-full sm:w-auto'
        >
          <Undo2 className='mr-1.5 h-3.5 w-3.5' />
          Devolver a pendiente
        </Button>
      ) : (
        <Button
          type='button'
          variant='outline'
          onClick={onClose}
          className='rounded-xl text-[12px] h-9 border-slate-200/60 w-full sm:w-auto'
        >
          {tCommon('buttons.cancel')}
        </Button>
      )}
      <div className='flex flex-col gap-2 sm:flex-row'>
        {canRevert && (
          <Button
            type='button'
            variant='outline'
            onClick={onClose}
            className='rounded-xl text-[12px] h-9 border-slate-200/60 w-full sm:w-auto'
          >
            {tCommon('buttons.cancel')}
          </Button>
        )}
        <Button
          type='button'
          onClick={onSave}
          disabled={isUpdating}
          className='bg-sky-400 hover:bg-sky-500 rounded-xl text-[12px] h-9 w-full sm:w-auto'
        >
          <Save className='mr-1.5 h-3.5 w-3.5' />
          {tCommon('sales.dialog.actions.save')}
        </Button>
      </div>
    </div>
  );
};
