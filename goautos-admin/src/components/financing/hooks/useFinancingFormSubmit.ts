
import { useState } from 'react';
import { FinancingFormValues } from '../forms/FinancingFormSchema';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';

type FinancingFormSubmitProps = {
  onSuccess: () => void;
  initialData?: {
    id: number;
    [key: string]: any;
  };
};

export const useFinancingFormSubmit = ({ onSuccess, initialData }: FinancingFormSubmitProps) => {
  const { clientId, userRole } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const createPaymentSchedule = async (financingId: number, values: FinancingFormValues) => {
    const payments = [];
    const startDate = new Date(values.start_date);
    const paymentDay = parseInt(values.payment_day);
    const monthlyInstallment = parseFloat(values.monthly_installment);

    for (let i = 1; i <= parseInt(values.total_installments); i++) {
      // Calculate the payment date for this installment
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(startDate.getMonth() + i);
      paymentDate.setDate(paymentDay);

      // Format the date as YYYY-MM-DD
      const formattedDate = paymentDate.toISOString().split('T')[0];

      payments.push({
        financing_id: financingId,
        installment_number: i,
        amount: monthlyInstallment,
        payment_date: formattedDate,
        due_date: formattedDate,
        payment_status: 'pending',
        is_paid: false,
        interest_amount: 0,
      });
    }

    // Insert all payment records
    const { error: paymentsError } = await supabase
      .from('financing_payment')
      .insert(payments);

    if (paymentsError) {
      console.error('Error creating payment schedule:', paymentsError);
      toast({
        title: 'Advertencia',
        description: 'Hubo un problema al crear el calendario de pagos',
        variant: 'destructive',
      });
      throw paymentsError;
    }
  };

  const onSubmit = async (values: FinancingFormValues) => {
    setIsLoading(true);
    try {
      if (!clientId) {
        toast({
          title: 'Error',
          description: 'No se pudo identificar el cliente',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Validate that vehicle belongs to this client
      const { data: vehicleCheck, error: vehicleError } = await supabase
        .from('vehicles')
        .select('id, client_id')
        .eq('id', parseInt(values.vehicle_id))
        .eq('client_id', clientId)
        .single();

      if (vehicleError || !vehicleCheck) {
        toast({
          title: 'Error',
          description: 'El vehículo seleccionado no pertenece a su empresa',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Validate that customer belongs to this client
      const { data: customerCheck, error: customerError } = await supabase
        .from('customers')
        .select('id, client_id')
        .eq('id', parseInt(values.customer_id))
        .eq('client_id', clientId)
        .single();

      if (customerError || !customerCheck) {
        toast({
          title: 'Error',
          description: 'El cliente seleccionado no pertenece a su empresa',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      const financing = {
        vehicle_id: parseInt(values.vehicle_id),
        customer_id: parseInt(values.customer_id),
        downpayment: parseFloat(values.downpayment),
        monthly_installment: parseFloat(values.monthly_installment),
        payment_day: parseInt(values.payment_day),
        total_installments: parseInt(values.total_installments),
        start_date: values.start_date.toISOString().split('T')[0],
        notes: values.notes,
      };

      if (initialData?.id) {
        // First verify that this financing belongs to this client through vehicle
        const { data: existingFinancing, error: checkError } = await supabase
          .from('financing')
          .select('id, vehicle_id, vehicle:vehicle_id(client_id)')
          .eq('id', initialData.id)
          .single();

        if (checkError || !existingFinancing || (userRole !== 'superadmin' && existingFinancing.vehicle?.client_id !== clientId)) {
          toast({
            title: 'Error',
            description: 'No tiene permisos para actualizar este financiamiento',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Update existing financing
        const { error } = await supabase
          .from('financing')
          .update(financing)
          .eq('id', initialData.id);

        if (error) {
          console.error('Error updating financing:', error);
          toast({
            title: 'Error',
            description: 'No se pudo actualizar el financiamiento',
            variant: 'destructive',
          });
          throw error;
        }
      } else {
        // Create new financing
        console.log('[FINANCING] Creating financing for vehicle:', financing.vehicle_id, 'customer:', financing.customer_id);

        const { data: newFinancing, error: insertError } = await supabase
          .from('financing')
          .insert(financing)
          .select()
          .single();

        if (insertError) {
          console.error('[FINANCING] Insert error:', insertError);
          toast({
            title: 'Error',
            description: `No se pudo crear el financiamiento: ${insertError.message}`,
            variant: 'destructive',
          });
          throw insertError;
        }

        console.log('[FINANCING] Created successfully with ID:', newFinancing.id);

        // Create payment schedule
        console.log('[FINANCING] Creating payment schedule...');
        await createPaymentSchedule(newFinancing.id, values);
        console.log('[FINANCING] Payment schedule created successfully');

        // Track financing creation
        posthog.capture({
          distinctId: clientId,
          event: 'financing_created',
          properties: {
            financing_id: newFinancing.id,
            vehicle_id: financing.vehicle_id,
            customer_id: financing.customer_id,
            total_installments: financing.total_installments,
            downpayment: financing.downpayment,
          },
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving financing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    onSubmit,
    isLoading
  };
};
