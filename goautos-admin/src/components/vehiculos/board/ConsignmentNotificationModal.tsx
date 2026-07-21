import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ConsignmentNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: number;
  previousStatus: string;
  newStatus: string;
}

const ConsignmentNotificationModal = ({
  isOpen,
  onClose,
  vehicleId,
  previousStatus,
  newStatus,
}: ConsignmentNotificationModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const { toast } = useToast();
  const { client } = useAuth();

  const fetchConsignmentEmail = async () => {
    try {
      const { data: consignment, error } = await supabase
        .from('vehicles_consignments')
        .select('customers(email)')
        .eq('vehicle_id', vehicleId)
        .maybeSingle();

      if (error) throw error;
      if (consignment?.customers?.email) {
        setNotificationEmail(consignment.customers.email);
      }
    } catch (error) {
      console.error('Error fetching consignment email:', error);
      toast({
        title: 'Error',
        description: 'No se pudo obtener el email del consignador',
        variant: 'destructive',
      });
    }
  };

  React.useEffect(() => {
    if (isOpen && vehicleId) {
      fetchConsignmentEmail();
    }
  }, [isOpen, vehicleId]);

  const handleNotify = async () => {
    try {
      setIsLoading(true);

      let vehicleReference = `ID ${vehicleId}`;
      try {
        const { data: vehicleInfo, error: vehicleError } = await supabase
          .from('vehicles')
          .select('license_plate, brand:brands(name), model:models(name)')
          .eq('id', vehicleId)
          .single();

        if (vehicleError) {
          console.error(
            'Error fetching vehicle details for email:',
            vehicleError
          );
        } else if (vehicleInfo) {
          const brandName =
            vehicleInfo.brand &&
            typeof vehicleInfo.brand === 'object' &&
            'name' in vehicleInfo.brand
              ? (vehicleInfo.brand.name as string)
              : null;
          const modelName =
            vehicleInfo.model &&
            typeof vehicleInfo.model === 'object' &&
            'name' in vehicleInfo.model
              ? (vehicleInfo.model.name as string)
              : null;

          if (vehicleInfo.license_plate) {
            vehicleReference = `Matrícula ${vehicleInfo.license_plate}`;
          } else if (brandName && modelName) {
            vehicleReference = `${brandName} ${modelName}`;
          } else if (brandName) {
            vehicleReference = brandName;
          } else if (modelName) {
            vehicleReference = modelName;
          }
        }
      } catch (e) {
        console.error('Exception fetching vehicle details for email:', e);
      }

      const subject = `Actualización Importante Sobre su Vehículo (Ref: ${vehicleReference})`;
      const content = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #007bff; color: #ffffff; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">${client?.name}</h1>
              </div>
              <div style="padding: 25px;">
                <h2 style="font-size: 20px; color: #007bff; margin-top: 0;">Actualización del Estado de su Vehículo</h2>
                <p>Estimado cliente,</p>
                <p>Le informamos que el estado de su vehículo (<strong>${vehicleReference}</strong>) ha sido actualizado en nuestro sistema.</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Estado Anterior:</strong> ${previousStatus}</p>
                  <p style="margin: 5px 0;"><strong>Nuevo Estado:</strong> ${newStatus}</p>
                </div>
                
                
                <p>Si tiene alguna pregunta o necesita más información, no dude en ponerse en contacto con nuestro equipo de atención al cliente.</p>
                
                <p style="margin-top: 25px;">Atentamente,</p>
                <p><strong>El Equipo de ${client?.name}</strong></p>
              </div>
              <div style="background-color: #f0f0f0; color: #555; padding: 15px; text-align: center; font-size: 12px;">
                <p style="margin: 0;">Este es un mensaje automático. Por favor, no responda directamente a este correo.</p>
                <p style="margin: 5px 0;">${client?.name} | ${client?.contact?.address} | ${client?.contact?.phone}</p>
                <p style="margin: 0;"><a href="${client?.domain}" style="color: #007bff; text-decoration: none;">Visita nuestro sitio web</a></p>
              </div>
            </div>
          `;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [notificationEmail],
          subject,
          content,
        },
      });

      if (error) throw error;

      if (data?.error || data?.success === false) {
        throw new Error(data.error || 'El envío del email falló');
      }

      toast({
        title: 'Notificación enviada',
        description: `Se ha notificado al consignador en ${notificationEmail}`,
      });
      onClose();
    } catch (error) {
      console.error('Error sending notification:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar la notificación',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Notificar al Cliente</DialogTitle>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='space-y-2'>
            <Label htmlFor='notification-email'>
              Email del cliente para notificación
            </Label>
            <Input
              id='notification-email'
              type='email'
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              placeholder='Email del cliente'
            />
          </div>

          <p className='text-sm text-muted-foreground'>
            ¿Desea notificar al cliente sobre el cambio de estado del vehículo
            mediante un correo electrónico?
          </p>
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={handleSkip}
            disabled={isLoading}
          >
            No notificar
          </Button>
          <Button
            type='button'
            onClick={handleNotify}
            disabled={!notificationEmail || isLoading}
          >
            <Mail className='mr-2 h-4 w-4' />
            {isLoading ? 'Enviando...' : 'Enviar notificación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConsignmentNotificationModal;
