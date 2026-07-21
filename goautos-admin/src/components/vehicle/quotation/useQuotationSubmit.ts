import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { createVehicleDocument } from '@/services/vehicleDocumentService';
import { QuotationFormData } from './QuotationFormSchema';
import { useTranslation } from 'react-i18next';

interface UseQuotationSubmitProps {
  vehicleId: number;
  onSuccess?: () => void;
}

export const useQuotationSubmit = ({
  vehicleId,
  onSuccess,
}: UseQuotationSubmitProps) => {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useTranslation('vehicleQuotations');

  const submitQuotation = async (values: QuotationFormData) => {
    try {
      setIsSubmitting(true);
      const currentDate = new Date().toISOString();
      const customerId = values.customer_id
        ? parseInt(values.customer_id)
        : null;

      // Convert validity period from days to a description
      const validityPeriod = `${values.validity_period} ${values.validity_period === '1' ? 'día' : 'días'}`;

      // First create a document record
      let documentId = null;
      if (clientId) {
        documentId = await createVehicleDocument(
          vehicleId,
          'quotation',
          clientId,
          customerId || undefined
        );

        if (!documentId) {
          throw new Error('Failed to create document record');
        }
      }

      // Insert new quotation into the database with document_id
      const { error } = await supabase.from('vehicles_quotations').insert({
        vehicle_id: vehicleId,
        customer_id: customerId,
        quotation_date: currentDate,
        estimated_price: parseFloat(values.estimated_price),
        validity_period: validityPeriod,
        notes: values.notes || null,
        document_id: documentId || 0, // Link to the created document
      });

      if (error) throw error;

      toast({
        title: t('toasts.successTitle'),
        description: t('toasts.successDescription'),
      });

      if (onSuccess) {
        onSuccess();
      }

      return true;
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast({
        variant: 'destructive',
        title: t('toasts.errorTitle'),
        description: t('toasts.errorDescription'),
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitQuotation,
    isSubmitting,
  };
};
