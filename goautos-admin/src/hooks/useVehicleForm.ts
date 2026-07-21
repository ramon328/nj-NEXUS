
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// Form validation schema
export const vehicleFormSchema = z.object({
  year: z.string().min(4, 'Ingrese un año válido'),
  price: z.string().min(1, 'Ingrese un precio'),
  brand_id: z.string().min(1, 'Seleccione una marca'),
  model_id: z.string().min(1, 'Seleccione un modelo'),
  category_id: z.string().min(1, 'Seleccione una categoría'),
  is_consigned: z.boolean().default(false),
  status_id: z.string().min(1, 'Seleccione un estado'),
  dealership_id: z.string().min(1, 'Seleccione una sucursal'),
  description: z.string().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

export const useVehicleForm = (onSuccess: () => void) => {
  const { clientId } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<string>('');

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      year: new Date().getFullYear().toString(),
      price: '',
      brand_id: '',
      model_id: '',
      category_id: '',
      status_id: '',
      dealership_id: '',
      is_consigned: false,
      description: '',
    },
  });

  const onSubmit = async (values: VehicleFormValues) => {
    if (!clientId) {
      toast({
        title: 'Error',
        description: 'No se pudo identificar el cliente',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert string values to appropriate types
      const vehicleData = {
        client_id: clientId,
        year: parseInt(values.year, 10),
        price: parseFloat(values.price),
        brand_id: values.brand_id,
        model_id: parseInt(values.model_id, 10),
        category_id: parseInt(values.category_id, 10),
        is_consigned: values.is_consigned,
        status_id: parseInt(values.status_id, 10),
        dealership_id: parseInt(values.dealership_id, 10),
        description: values.description || null,
        views: 0, // Initial view count
      };

      const { error } = await supabase.from('vehicles').insert(vehicleData);

      if (error) {
        console.error('Error adding vehicle:', error);
        toast({
          title: 'Error',
          description: 'No se pudo agregar el vehículo',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Éxito',
        description: 'Vehículo agregado correctamente',
      });
      
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    selectedBrand,
    setSelectedBrand,
    isSubmitting,
    onSubmit,
  };
};
