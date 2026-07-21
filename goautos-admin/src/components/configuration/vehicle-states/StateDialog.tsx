
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface StateDialogProps {
  open: boolean;
  onClose: () => void;
  state?: any;
  onSuccess: () => void;
  nextOrder?: number;
}

const StateDialog = ({ open, onClose, state, onSuccess, nextOrder = 1 }: StateDialogProps) => {
  const { clientId } = useAuth();
  const form = useForm({
    defaultValues: {
      name: state?.name || '',
      description: state?.description || '',
      color: state?.color || '#000000',
      show_in_web: state?.show_in_web || false,
      web_visibility_days: state?.web_visibility_days ?? '' as number | ''
    }
  });

  const showInWeb = form.watch('show_in_web');

  React.useEffect(() => {
    if (state) {
      form.reset({
        name: state.name,
        description: state.description,
        color: state.color,
        show_in_web: state.show_in_web || false,
        web_visibility_days: state.web_visibility_days ?? ''
      });
    } else {
      form.reset({
        name: '',
        description: '',
        color: '#000000',
        show_in_web: false,
        web_visibility_days: ''
      });
    }
  }, [state, form]);

  const onSubmit = async (data: any) => {
    try {
      // Normalize web_visibility_days: empty string / 0 / non-positive → NULL
      // (NULL = always show, no window). Only positive integers are persisted.
      const rawDays = Number(data.web_visibility_days);
      const webVisibilityDays =
        data.show_in_web && Number.isFinite(rawDays) && rawDays > 0
          ? Math.floor(rawDays)
          : null;

      if (state?.id) {
        const { error } = await supabase
          .from('clients_vehicles_states')
          .update({
            name: data.name,
            description: data.description,
            color: data.color,
            show_in_web: data.show_in_web,
            web_visibility_days: webVisibilityDays
          })
          .eq('id', state.id);

        if (error) throw error;

        toast({
          title: 'Estado actualizado',
          description: 'El estado ha sido actualizado exitosamente.'
        });
      } else {
        const { error } = await supabase
          .from('clients_vehicles_states')
          .insert([
            {
              name: data.name,
              description: data.description,
              color: data.color,
              order: nextOrder,
              show_in_web: data.show_in_web,
              web_visibility_days: webVisibilityDays,
              client_id: clientId
            }
          ]);

        if (error) throw error;

        toast({
          title: 'Estado creado',
          description: 'El estado ha sido creado exitosamente.'
        });
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving state:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el estado.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state ? 'Editar Estado' : 'Nuevo Estado'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre del estado" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Descripción del estado" />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" {...field} className="w-12" />
                      <Input {...field} placeholder="#000000" />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="show_in_web"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Visible en la web</FormLabel>
                    <FormDescription className="text-xs">
                      Los vehículos en este estado aparecerán en el sitio web público
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {showInWeb && (
              <FormField
                control={form.control}
                name="web_visibility_days"
                render={({ field }) => (
                  <FormItem className="rounded-lg border p-3 shadow-sm space-y-2">
                    <div className="space-y-0.5">
                      <FormLabel>Ventana de visibilidad (días)</FormLabel>
                      <FormDescription className="text-xs">
                        Mostrar en la web sólo los vehículos que pasaron a este estado en los últimos N días. Deja vacío para mostrarlos sin límite de tiempo.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={3650}
                        step={1}
                        placeholder="Sin límite"
                        value={field.value === null || field.value === undefined ? '' : field.value}
                        onChange={(e) => {
                          const v = e.target.value;
                          field.onChange(v === '' ? '' : Number(v));
                        }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">
                {state ? 'Guardar Cambios' : 'Crear Estado'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default StateDialog;
