
import React, { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { VehicleDocument, VehicleDocumentType } from '@/types/vehicleCreation';
import { Plus, Trash2 } from 'lucide-react';

const documentSchema = z.object({
  type: z.enum(['purchase', 'consignment', 'other'] as const),
  notes: z.string().optional(),
  status: z.enum(['pending', 'completed'] as const).default('pending'),
});

const formSchema = z.object({
  documents: z.array(documentSchema).min(1, 'Se requiere al menos un documento'),
});

type FormValues = z.infer<typeof formSchema>;

interface VehicleDocumentsFormProps {
  initialData: any;
  onSave: (data: VehicleDocument[]) => boolean;
  onNext: () => void;
  onPrevious: () => void;
}

const VehicleDocumentsForm = ({ initialData, onSave, onNext, onPrevious }: VehicleDocumentsFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with at least one document if none exists
  const defaultDocuments = initialData.documents?.length 
    ? initialData.documents 
    : [{ type: initialData.acquisition?.documentType || 'purchase', notes: '', status: 'pending' }];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documents: defaultDocuments,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'documents',
  });

  const handleSubmit = (values: FormValues) => {
    setIsSubmitting(true);
    
    // Ensure all required fields are present
    const formattedDocuments: VehicleDocument[] = values.documents.map(doc => ({
      type: doc.type as VehicleDocumentType,
      notes: doc.notes,
      status: doc.status,
    }));
    
    const success = onSave(formattedDocuments);
    
    if (success) {
      onNext();
    }
    
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Documentos</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ type: 'other', notes: '', status: 'pending' })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Documento
          </Button>
        </div>

        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Documento {index + 1}</h4>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar
                    </Button>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name={`documents.${index}.type`}
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Documento</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="purchase" />
                            </FormControl>
                            <FormLabel className="font-normal">Compra</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="consignment" />
                            </FormControl>
                            <FormLabel className="font-normal">Consignación</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="other" />
                            </FormControl>
                            <FormLabel className="font-normal">Otro</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`documents.${index}.status`}
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Estado del Documento</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="pending" />
                            </FormControl>
                            <FormLabel className="font-normal">Pendiente</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="completed" />
                            </FormControl>
                            <FormLabel className="font-normal">Completado</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`documents.${index}.notes`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-between">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onPrevious}
          >
            Anterior
          </Button>
          <Button 
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Guardando...' : 'Siguiente'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default VehicleDocumentsForm;
