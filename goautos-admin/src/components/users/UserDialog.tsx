import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import {
  createUser,
  updateUser,
  getClients,
  UserFormData,
} from './UserAuthService';
import posthog from '@/utils/posthog';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import UserForm, { UserFormValues } from './form/UserForm';
import { User } from '@/types/user';
import { UserPlus, UserCog } from 'lucide-react';

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  user: User | null;
}

const UserDialog = ({ open, onClose, onSave, user }: UserDialogProps) => {
  const [clients, setClients] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('team');
  const { userId } = useAuth();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const clientsData = await getClients();
        setClients(clientsData || []);
      } catch (error) {
        console.error('Error fetching clients:', error);
        toast({
          title: t('common:actions.error'),
          description: t('dialog.loadClientsError'),
          variant: 'destructive',
        });
      }
    };

    fetchClients();
  }, [toast]);

  const handleCreateUser = async (values: UserFormValues) => {
    const userData: UserFormData = {
      email: values.email,
      password: !user ? values.password : undefined,
      first_name: values.first_name,
      last_name: values.last_name,
      rol: values.rol,
      client_id: values.client_id === 'none' ? null : values.client_id,
    };

    setIsLoading(true);
    try {
      if (!user) {
        await createUser(userData);

        posthog.capture({
          distinctId: userId || 'anonymous',
          event: 'persona_created',
          properties: { client_id: values.client_id },
        });

        toast({
          title: t('common:actions.success'),
          description: t('dialog.created'),
        });
      } else {
        await updateUser(user.id, userData, user.auth_id);
        toast({
          title: t('common:actions.success'),
          description: t('dialog.updated'),
        });
      }
      onSave();
    } catch (error) {
      console.error('Error in handleCreateUser:', error);
      toast({
        title: t('common:actions.error'),
        description:
          error instanceof Error
            ? error.message
            : t('dialog.processError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-full h-full max-w-full max-h-full sm:max-w-[500px] sm:max-h-[90vh] sm:h-auto p-0 gap-0 overflow-hidden rounded-none sm:rounded-lg border-0 sm:border flex flex-col">
        <DialogHeader className="p-4 sm:p-6 pb-2 sm:pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              {user ? (
                <UserCog className="h-5 w-5 text-primary" />
              ) : (
                <UserPlus className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                {user ? t('dialog.title.edit') : t('dialog.title.new')}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                {user ? 'Modifica los datos del usuario' : 'Completa los datos del nuevo usuario'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <UserForm
            onSubmit={handleCreateUser}
            isLoading={isLoading}
            user={user}
            clients={clients}
            onClose={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserDialog;
