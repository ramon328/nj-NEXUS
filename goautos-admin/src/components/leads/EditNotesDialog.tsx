import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerContentRight } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/hooks/useI18n';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';

interface EditNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  currentNotes: string;
  onUpdateNotes: (leadId: string, notes: string) => Promise<boolean>;
}

const EditNotesDialog = ({
  open,
  onOpenChange,
  leadId,
  currentNotes,
  onUpdateNotes,
}: EditNotesDialogProps) => {
  const { t: tLeads } = useTranslation('leadsPage');
  const { tCommon } = useI18n();
  const [notes, setNotes] = useState(currentNotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setNotes(currentNotes);
    }
  }, [open, currentNotes]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const success = await onUpdateNotes(leadId, notes.trim());
    setIsSubmitting(false);

    if (success) {
      toast({ title: tLeads('editNotesDialog.success') });
      onOpenChange(false);
    } else {
      toast({
        title: tLeads('editNotesDialog.error'),
        variant: 'destructive',
      });
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 sm:px-5 sm:py-4 border-b border-slate-100 shrink-0">
        <h2 className="text-[14px] sm:text-[16px] font-semibold text-slate-900 leading-tight">{tLeads('editNotesDialog.title')}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
        <div className="space-y-1.5">
          <label className="text-[13px] text-slate-700 font-medium">Notas</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={tLeads('editNotesDialog.placeholder')}
            rows={8}
            className="resize-none text-[13px]"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            {tCommon('buttons.cancel')}
          </Button>
          <Button
            className="gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-[13px]">Guardando...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span className="text-[13px]">{tCommon('buttons.save')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContentRight className="p-0">
          {content}
        </DrawerContentRight>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92vh]">
        <div className="flex flex-col max-h-[92vh]">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default EditNotesDialog;
