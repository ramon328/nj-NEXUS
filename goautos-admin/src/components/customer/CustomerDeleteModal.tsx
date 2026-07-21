import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CustomerDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customer: {
    id: number;
    first_name: string;
    last_name: string;
  } | null;
}

const CustomerDeleteModal: React.FC<CustomerDeleteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customer,
}) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    if (!customer) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: 'Cliente eliminado',
        description: 'El cliente ha sido eliminado exitosamente.',
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error deleting customer:', error);

      // Determinar mensaje de error específico
      let errorMessage = 'No se pudo eliminar el cliente. Por favor, intente nuevamente.';

      if (error?.message) {
        if (error.message.includes('foreign key') || error.message.includes('violates')) {
          errorMessage = 'No se puede eliminar: el cliente tiene ventas o reservas asociadas.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
        } else if (error.message.includes('JWT') || error.message.includes('token')) {
          errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página.';
        } else if (error.code === 'PGRST301' || error.message.includes('permission')) {
          errorMessage = 'No tienes permisos para eliminar este cliente.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast({
        title: 'Error al eliminar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eliminar Cliente</DialogTitle>
          <DialogDescription>
            ¿Está seguro que desea eliminar al cliente{' '}
            <span className='font-semibold'>
              {customer?.first_name} {customer?.last_name}
            </span>
            ? Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button
            variant='destructive'
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDeleteModal;
