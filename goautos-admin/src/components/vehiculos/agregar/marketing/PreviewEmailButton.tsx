import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadImage } from '@/utils/fileUploadUtils';
import { formatCurrency } from '@/lib/utils';

interface PreviewEmailButtonProps {
  brandName: string;
  modelName: string;
  formattedPrice: string;
  mainImage?: File | string | null;
  selectedCustomers: number[];
  isEmailCampaignEnabled: boolean;
}

const PreviewEmailButton = ({
  brandName,
  modelName,
  formattedPrice,
  mainImage,
  selectedCustomers,
  isEmailCampaignEnabled,
}: PreviewEmailButtonProps) => {
  const { toast } = useToast();
  const [previewEmail, setPreviewEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handlePreviewEmail = async () => {
    try {
      setIsSending(true);

      if (
        !selectedCustomers.length ||
        !isEmailCampaignEnabled ||
        !previewEmail
      ) {
        toast({
          title: 'No se puede enviar el preview',
          description:
            'Debes seleccionar al menos un cliente, activar la campaña de email e ingresar un email para el preview',
          variant: 'destructive',
        });
        return;
      }

      let mainImageUrl = '';

      if (mainImage instanceof File) {
        const tempImagePath = await uploadImage(mainImage, 'email-previews');
        if (tempImagePath) {
          mainImageUrl = tempImagePath;
        } else {
          console.warn('Could not upload preview image');
        }
      } else if (typeof mainImage === 'string') {
        mainImageUrl = mainImage;
      }

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
          <div style="text-align: center; padding: 20px 0;">
            <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">¡Descubre tu Próximo Vehículo!</h1>
            <p style="color: #666; font-size: 16px; margin-top: 10px;">
              Basado en tus preferencias, hemos encontrado el vehículo perfecto para ti
            </p>
          </div>

          ${
            mainImageUrl
              ? `
            <div style="margin: 30px 0;">
              <img 
                src="${mainImageUrl}" 
                alt="${brandName} ${modelName}" 
                style="width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"
              />
            </div>
          `
              : ''
          }

          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin: 20px 0;">
            <h2 style="color: #2563eb; margin: 0; font-size: 24px;">${brandName} ${modelName}</h2>
            <p style="font-size: 32px; color: #1a1a1a; margin: 16px 0; font-weight: semibold;">
              ${formattedPrice}
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background-color: white; border-radius: 6px; overflow: hidden;">
              <tr style="background-color: #f1f5f9;">
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Característica</th>
                <th style="padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0;">Detalle</th>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Marca</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${brandName}</td>
              </tr>
              <tr style="background-color: #f8fafc;">
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Modelo</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${modelName}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">Precio</td>
                <td style="padding: 12px; border-bottom: 1px solid #e2e8f0;">${formattedPrice}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #2563eb; color: white; padding: 24px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 16px 0; font-size: 20px;">¿Por qué esta es una excelente oportunidad?</h3>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Vehículo seleccionado específicamente según tus preferencias de marca y modelo</li>
              <li>Precio competitivo en el mercado actual</li>
              <li>Disponibilidad inmediata</li>
              <li>Posibilidad de financiamiento personalizado</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a 
              href="#" 
              style="background-color: #2563eb; color: white; padding: 14px 28px; 
                     text-decoration: none; border-radius: 6px; display: inline-block;
                     font-weight: semibold; font-size: 16px;"
            >
              Ver Más Detalles
            </a>
          </div>

          <div style="text-align: center; color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 0;">
              ¿Preguntas? Estamos aquí para ayudarte.<br>
              Responde a este email o llámanos.
            </p>
          </div>
        </div>
      `;

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [previewEmail],
          subject: `¡Descubre el ${brandName} ${modelName} - ¡Una Oportunidad Única!`,
          content: emailContent,
        },
      });

      if (error) throw error;

      if (data?.error || data?.success === false) {
        throw new Error(data.error || 'El envío del email falló');
      }

      toast({
        title: 'Preview enviado',
        description: `Se ha enviado un preview del email a ${previewEmail}`,
      });
    } catch (error) {
      console.error('Error sending preview:', error);
      toast({
        title: 'Error',
        description:
          'No se pudo enviar el preview del email: ' +
          (error instanceof Error ? error.message : String(error)),
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='preview-email'>Email para preview</Label>
        <div className='flex gap-2'>
          <Input
            id='preview-email'
            type='email'
            value={previewEmail}
            onChange={(e) => setPreviewEmail(e.target.value)}
            placeholder='Ingresa el email para el preview'
            className='flex-1'
          />
          <Button
            type='button'
            variant='outline'
            onClick={handlePreviewEmail}
            disabled={
              !selectedCustomers.length ||
              !isEmailCampaignEnabled ||
              !previewEmail ||
              isSending
            }
          >
            <Mail className='mr-2 h-4 w-4' />
            {isSending ? 'Enviando...' : 'Enviar Preview'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreviewEmailButton;
