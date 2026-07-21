import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight } from 'lucide-react';
import { STATUS_COLORS, type RequestStatus } from './requestConstants';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
  onConfirm: (note?: string) => void;
}

export default function StatusChangeDialog({
  open,
  onOpenChange,
  fromStatus,
  toStatus,
  onConfirm,
}: StatusChangeDialogProps) {
  const { t } = useTranslation('solicitudes');
  const [note, setNote] = useState('');

  const fromColors = STATUS_COLORS[fromStatus];
  const toColors = STATUS_COLORS[toStatus];

  const handleConfirm = () => {
    onConfirm(note.trim() || undefined);
    setNote('');
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) setNote('');
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('statusChange.title')}</DialogTitle>
          <DialogDescription>{t('statusChange.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status badges */}
          <div className="flex items-center justify-center gap-3">
            <span className={cn('px-3 py-1.5 rounded-full text-xs font-medium', fromColors.bg, fromColors.text)}>
              {t(`status.${fromStatus}`)}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400" />
            <span className={cn('px-3 py-1.5 rounded-full text-xs font-medium', toColors.bg, toColors.text)}>
              {t(`status.${toStatus}`)}
            </span>
          </div>

          {/* Warning for cancelled */}
          {toStatus === 'cancelled' && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
              {t('statusChange.cancelWarning')}
            </p>
          )}

          {/* Note textarea */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">
              {t('statusChange.noteLabel')}
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('statusChange.notePlaceholder')}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('statusChange.cancel')}
          </Button>
          <Button onClick={handleConfirm}>
            {t('statusChange.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
