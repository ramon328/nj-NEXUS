import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import posthog from '@/utils/posthog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Building2, User, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const customerSchema = z
  .object({
    customer_type: z.enum(['person', 'company']).default('person'),
    first_name: z.string().optional().or(z.literal('')),
    last_name: z.string().optional().or(z.literal('')),
    company_name: z.string().optional().or(z.literal('')),
    email: z
      .string()
      .email({ message: 'Email inválido' })
      .optional()
      .or(z.literal('')),
    phone: z.string().optional(),
    rut: z.string().optional(),
    address: z.string().optional(),
    birth_date: z.string().optional(),
    // Banking information
    bank_name: z.string().optional(),
    account_type: z.enum(['corriente', 'ahorro', 'vista', 'rut']).optional().or(z.literal('')),
    account_number: z.string().optional(),
    account_holder_name: z.string().optional(),
    account_holder_rut: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.customer_type === 'company') {
      if (!data.company_name || !data.company_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'La razón social es requerida',
          path: ['company_name'],
        });
      }
    } else {
      if (!data.first_name || !data.first_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El nombre es requerido',
          path: ['first_name'],
        });
      }
      if (!data.last_name || !data.last_name.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'El apellido es requerido',
          path: ['last_name'],
        });
      }
    }
  });

type CustomerFormValues = z.infer<typeof customerSchema>;

type CustomerFormProps = {
  onSuccess?: (customerData: any) => void;
  initialEmail?: string;
  initialData?: any;
};

const CustomerForm = ({
  onSuccess,
  initialEmail,
  initialData,
}: CustomerFormProps) => {
  const { clientId, userId } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState<any>(null);

  const [showBankingInfo, setShowBankingInfo] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_type: initialData?.customer_type || 'person',
      first_name: initialData?.first_name || '',
      last_name: initialData?.last_name || '',
      company_name: initialData?.company_name || '',
      email: initialData?.email || initialEmail || '',
      phone: initialData?.phone || '',
      rut: initialData?.rut || '',
      address: initialData?.address || '',
      birth_date: initialData?.birth_date || '',
      bank_name: initialData?.bank_name || '',
      account_type: initialData?.account_type || '',
      account_number: initialData?.account_number || '',
      account_holder_name: initialData?.account_holder_name || '',
      account_holder_rut: initialData?.account_holder_rut || '',
    },
  });

  // Prerrellenar cuando initialData cambie
  React.useEffect(() => {
    if (initialData) {
      setExistingCustomer(initialData);
      form.reset({
        customer_type: initialData.customer_type || 'person',
        first_name: initialData.first_name || '',
        last_name: initialData.last_name || '',
        company_name: initialData.company_name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        rut: initialData.rut || '',
        address: initialData.address || '',
        birth_date: initialData.birth_date || '',
        bank_name: initialData.bank_name || '',
        account_type: initialData.account_type || '',
        account_number: initialData.account_number || '',
        account_holder_name: initialData.account_holder_name || '',
        account_holder_rut: initialData.account_holder_rut || '',
      });
      if (initialData.bank_name || initialData.account_number) {
        setShowBankingInfo(true);
      }
    } else {
      setExistingCustomer(null);
    }
  }, [initialData]);

  // Buscar cliente existente por email cuando cambia el email (solo en modo creación)
  useEffect(() => {
    if (initialData) return;

    const checkExistingCustomer = async () => {
      const email = form.watch('email');
      if (email && clientId) {
        try {
          setIsLoading(true);
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('client_id', clientId)
            .eq('email', email)
            .maybeSingle();

          if (error) {
            console.error('Error checking existing customer:', error);
            return;
          }

          if (data) {
            setExistingCustomer(data);
            // Actualizar el formulario con los datos del cliente existente
            form.reset({
              customer_type: data.customer_type || 'person',
              first_name: data.first_name || '',
              last_name: data.last_name || '',
              company_name: data.company_name || '',
              email: data.email || '',
              phone: data.phone || '',
              rut: data.rut || '',
              address: data.address || '',
              birth_date: data.birth_date || '',
              bank_name: data.bank_name || '',
              account_type: data.account_type || '',
              account_number: data.account_number || '',
              account_holder_name: data.account_holder_name || '',
              account_holder_rut: data.account_holder_rut || '',
            });
            // Expand banking section if there's banking data
            if (data.bank_name || data.account_number) {
              setShowBankingInfo(true);
            }
          } else {
            setExistingCustomer(null);
          }
        } catch (error) {
          console.error('Error checking existing customer:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    const debounce = setTimeout(() => {
      checkExistingCustomer();
    }, 500);

    return () => clearTimeout(debounce);
  }, [form.watch('email'), clientId]);

  const onSubmit = async (values: CustomerFormValues) => {
    if (!clientId) {
      toast({
        title: 'Error',
        description:
          'No se pudo identificar el cliente. Por favor inténtalo de nuevo.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      let result;

      if (existingCustomer) {
        // Actualizar cliente existente
        const { data, error } = await supabase
          .from('customers')
          .update({
            customer_type: values.customer_type,
            first_name: values.first_name || null,
            last_name: values.last_name || null,
            company_name: values.company_name || null,
            email: values.email || null,
            phone: values.phone || null,
            rut: values.rut || null,
            address: values.address || null,
            birth_date: values.birth_date || null,
            bank_name: values.bank_name || null,
            account_type: values.account_type || null,
            account_number: values.account_number || null,
            account_holder_name: values.account_holder_name || null,
            account_holder_rut: values.account_holder_rut || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingCustomer.id)
          .select()
          .single();

        if (error) throw error;
        result = data;

        toast({
          title: 'Cliente actualizado',
          description: 'El cliente ha sido actualizado exitosamente',
        });
      } else {
        // Crear nuevo cliente
        const { data, error } = await supabase
          .from('customers')
          .insert({
            client_id: clientId,
            customer_type: values.customer_type,
            first_name: values.first_name || null,
            last_name: values.last_name || null,
            company_name: values.company_name || null,
            email: values.email || null,
            phone: values.phone || null,
            rut: values.rut || null,
            address: values.address || null,
            birth_date: values.birth_date || null,
            bank_name: values.bank_name || null,
            account_type: values.account_type || null,
            account_number: values.account_number || null,
            account_holder_name: values.account_holder_name || null,
            account_holder_rut: values.account_holder_rut || null,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;

        posthog.capture({
          distinctId: userId || 'anonymous',
          event: 'customer_created',
          properties: { client_id: clientId },
        });

        toast({
          title: 'Cliente creado',
          description: 'El cliente ha sido creado exitosamente',
        });
      }

      form.reset();

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error: any) {
      console.error('Error saving customer:', error);

      // Determinar mensaje de error específico
      let errorMessage = 'No se pudo guardar el cliente. Inténtalo de nuevo.';

      if (error?.message) {
        // Errores comunes de Supabase
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          errorMessage = 'Ya existe un cliente con este email o RUT.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
        } else if (error.message.includes('JWT') || error.message.includes('token')) {
          errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página.';
        } else if (error.code === 'PGRST301' || error.message.includes('permission')) {
          errorMessage = 'No tienes permisos para realizar esta acción.';
        } else {
          // Mostrar el error técnico para debugging
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast({
        variant: 'destructive',
        title: 'Error al guardar',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    form.handleSubmit(onSubmit)();
  };

  const customerType = form.watch('customer_type');

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className='space-y-4'>
        {!initialData && existingCustomer && (
          <div className='bg-cyan-50 border border-cyan-100 p-3 rounded-xl text-[13px] text-cyan-800'>
            Se encontró un cliente existente con este email. Los cambios
            actualizarán su información.
          </div>
        )}

        {/* Tipo de cliente: persona natural o empresa */}
        <div>
          <FormLabel className='text-[13px] text-slate-700'>Tipo de cliente</FormLabel>
          <div className='grid grid-cols-2 gap-2 mt-1.5'>
            <button
              type='button'
              onClick={() => form.setValue('customer_type', 'person', { shouldValidate: false })}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors',
                customerType !== 'company'
                  ? 'border-sky-400 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <User className='h-4 w-4' />
              Persona
            </button>
            <button
              type='button'
              onClick={() => form.setValue('customer_type', 'company', { shouldValidate: false })}
              className={cn(
                'flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors',
                customerType === 'company'
                  ? 'border-sky-400 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              )}
            >
              <Building2 className='h-4 w-4' />
              Empresa
            </button>
          </div>
        </div>

        {customerType === 'company' ? (
          <FormField
            control={form.control}
            name='company_name'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-[13px] text-slate-700'>Razón social <span className='text-red-500'>*</span></FormLabel>
                <FormControl>
                  <Input placeholder='Comercial Ejemplo SpA' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className='grid grid-cols-2 gap-3'>
            <FormField
              control={form.control}
              name='first_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-[13px] text-slate-700'>Nombre <span className='text-red-500'>*</span></FormLabel>
                  <FormControl>
                    <Input placeholder='Juan' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='last_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-[13px] text-slate-700'>Apellido <span className='text-red-500'>*</span></FormLabel>
                  <FormControl>
                    <Input placeholder='Pérez' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <div className='grid grid-cols-2 gap-3'>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-[13px] text-slate-700'>Email</FormLabel>
                <FormControl>
                  <Input
                    type='email'
                    placeholder='correo@ejemplo.com'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='phone'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-[13px] text-slate-700'>Teléfono</FormLabel>
                <FormControl>
                  <Input placeholder='+56 9 1234 5678' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className='grid grid-cols-2 gap-3'>
          <FormField
            control={form.control}
            name='rut'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-[13px] text-slate-700'>RUT</FormLabel>
                <FormControl>
                  <Input placeholder='12.345.678-9' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='address'
            render={({ field }) => (
              <FormItem>
                <FormLabel className='text-[13px] text-slate-700'>Dirección</FormLabel>
                <FormControl>
                  <Input placeholder='Av. Ejemplo 123, Santiago' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name='birth_date'
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-[13px] text-slate-700'>Fecha de Nacimiento</FormLabel>
              <FormControl>
                <Input type='date' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Banking Information Section */}
        <Collapsible open={showBankingInfo} onOpenChange={setShowBankingInfo}>
          <CollapsibleTrigger asChild>
            <Button
              type='button'
              variant='outline'
              className='w-full flex items-center justify-between rounded-xl text-[13px]'
            >
              <span className='flex items-center gap-2'>
                <Building2 className='h-4 w-4 text-slate-500' />
                Información Bancaria
              </span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  showBankingInfo ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className='space-y-4 pt-4'>
            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='bank_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[13px] text-slate-700'>Nombre del Banco</FormLabel>
                    <FormControl>
                      <Input placeholder='Banco Estado' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='account_type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[13px] text-slate-700'>Tipo de Cuenta</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder='Seleccionar tipo' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value='corriente'>Cuenta Corriente</SelectItem>
                        <SelectItem value='ahorro'>Cuenta de Ahorro</SelectItem>
                        <SelectItem value='vista'>Cuenta Vista</SelectItem>
                        <SelectItem value='rut'>Cuenta RUT</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name='account_number'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-[13px] text-slate-700'>Número de Cuenta</FormLabel>
                  <FormControl>
                    <Input placeholder='1234567890' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='grid grid-cols-2 gap-3'>
              <FormField
                control={form.control}
                name='account_holder_name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[13px] text-slate-700'>Nombre del Titular</FormLabel>
                    <FormControl>
                      <Input placeholder='Juan Pérez' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name='account_holder_rut'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[13px] text-slate-700'>RUT del Titular</FormLabel>
                    <FormControl>
                      <Input placeholder='12.345.678-9' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Button
          type='button'
          className='w-full gap-2 rounded-xl bg-sky-400 hover:bg-sky-500'
          disabled={isLoading}
          onClick={handleButtonClick}
        >
          {isLoading ? (
            <>
              <Loader2 className='h-4 w-4 animate-spin' />
              <span className='text-[13px]'>Guardando...</span>
            </>
          ) : (
            <>
              <Check className='h-4 w-4' />
              <span className='text-[13px]'>
                {existingCustomer ? 'Actualizar Cliente' : 'Crear Cliente'}
              </span>
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

export default CustomerForm;
