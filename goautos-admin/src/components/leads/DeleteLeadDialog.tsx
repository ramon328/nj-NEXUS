import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/hooks/useI18n';
import { toast } from '@/hooks/use-toast';

interface DeleteLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  onDeleteLead: (leadId: string) => Promise<boolean>;
}

const DeleteLeadDialog = ({
  open,
  onOpenChange,
  leadId,
  onDeleteLead,
}: DeleteLeadDialogProps) => {
  const { t: tLeads } = useTranslation('leadsPage');
  const { tCommon } = useI18n();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDeleteLead(leadId);
    setIsDeleting(false);

    if (success) {
      toast({ title: tLeads('deleteDialog.success') });
      onOpenChange(false);
    } else {
      toast({
        title: tLeads('deleteDialog.error'),
        variant: 'destructive',
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tLeads('deleteDialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {tLeads('deleteDialog.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon('buttons.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className='bg-red-600 hover:bg-red-700'
          >
            {isDeleting ? '...' : tCommon('buttons.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteLeadDialog;
