import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createUser, updateUser, UserFormData } from './UserAuthService';
import { useTranslation } from 'react-i18next';
import posthog from '@/utils/posthog';
import { useAuth } from '@/contexts/AuthContext';
import { useRoles } from '@/hooks/useRoles';
import { useDealerships } from '@/hooks/useDealerships';

import { Drawer, DrawerContent, DrawerContentRight } from '@/components/ui/drawer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const buildSchema = (t: any) =>
  z.object({
    email: z.string().email({ message: t('form.validation.emailInvalid') }),
    password: z
      .string()
      .min(6, { message: t('form.validation.passwordMin') })
      .optional(),
    first_name: z
      .string()
      .min(1, { message: t('form.validation.firstNameRequired') }),
    last_name: z
      .string()
      .min(1, { message: t('form.validation.lastNameRequired') }),
    rol: z.string().min(1, { message: t('form.validation.roleRequired') }),
    selectedRoleIds: z.array(z.number()).optional(),
    selectedDealershipIds: z.array(z.number()).optional(),
    phone: z.string().optional(),
  });

type UserFormValues = z.infer<ReturnType<typeof buildSchema>>;

type User = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  rol: string;
  role_id?: number | null;
  client_id: number | null;
  auth_id: string;
  phone?: string;
  client?: {
    name: string;
  } | null;
};

interface UserDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  user: User | null;
  clientId: number;
}

const UserDialog = ({
  open,
  onClose,
  onSave,
  user,
  clientId,
}: UserDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation('team');
  const { userId } = useAuth();
  const schema = useMemo(() => buildSchema(t), [t]);
  const { roles, loading: rolesLoading } = useRoles();
  const { dealerships } = useDealerships();
  // Solo tiene sentido asignar sedes cuando el tenant tiene mas de una.
  const showDealershipField = dealerships.length > 1;
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.innerWidth >= 768
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      rol: '',
      phone: '',
    },
  });

  useEffect(() => {
    const loadUserRoles = async () => {
      if (user) {
        // Construir el valor del rol en el nuevo formato "roleId:rolValue"
        const rolValue = user.role_id && user.role_id > 0
          ? `${user.role_id}:${user.rol || ''}`
          : user.rol || '';

        // Load user's assigned roles from user_roles table
        let userRoleIds: number[] = [];
        try {
          const { data } = await supabase
            .from('user_roles')
            .select('role_id')
            .eq('user_id', user.id);
          if (data && data.length > 0) {
            userRoleIds = data.map((r: any) => r.role_id);
          } else if (user.role_id && user.role_id > 0) {
            userRoleIds = [user.role_id];
          }
        } catch {
          if (user.role_id && user.role_id > 0) {
            userRoleIds = [user.role_id];
          }
        }

        // Load user's assigned dealerships (sedes) from user_dealerships table.
        // Si la tabla no existe o falla, se trata como "sin sedes" (ve todas).
        let userDealershipIds: number[] = [];
        try {
          const { data } = await supabase
            .from('user_dealerships')
            .select('dealership_id')
            .eq('user_id', user.id);
          if (data && data.length > 0) {
            userDealershipIds = data.map((d: any) => d.dealership_id);
          }
        } catch {
          userDealershipIds = [];
        }

        form.reset({
          email: user.email || '',
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          rol: rolValue,
          selectedRoleIds: userRoleIds,
          selectedDealershipIds: userDealershipIds,
          phone: user.phone || '',
        });
      } else {
        form.reset({
          email: '',
          first_name: '',
          last_name: '',
          rol: '',
          selectedRoleIds: [],
          selectedDealershipIds: [],
          phone: '',
        });
      }
    };
    loadUserRoles();
  }, [user, form]);

  const handleCreateUser = async (values: UserFormValues) => {
    // Extraer roleId y rolValue del valor del formulario (formato: "roleId:rolValue")
    const [roleIdStr, rolValue] = values.rol.includes(':')
      ? values.rol.split(':')
      : ['0', values.rol]; // Fallback para valores legacy
    const roleId = parseInt(roleIdStr, 10);

    // Multi-roles: use selectedRoleIds if available, fallback to single roleId
    const roleIds = values.selectedRoleIds && values.selectedRoleIds.length > 0
      ? values.selectedRoleIds
      : roleId > 0 ? [roleId] : [];

    const userData: UserFormData = {
      email: values.email,
      password: !user ? values.password : undefined,
      first_name: values.first_name,
      last_name: values.last_name,
      rol: rolValue,
      phone: values.phone,
      client_id: clientId.toString(),
      role_id: roleIds[0] || undefined,
      role_ids: roleIds,
      // Solo tocar la asignacion de sedes si el campo se muestra (tenant con >1 sede).
      // undefined = no llamar al RPC (retrocompatible); [] = limpiar (ve todas).
      dealership_ids: showDealershipField
        ? values.selectedDealershipIds || []
        : undefined,
    };

    setIsLoading(true);
    try {
      if (!user) {
        // Crear usuario (role_id se asigna dentro del edge function)
        await createUser(userData);

        posthog.capture({
          distinctId: userId || 'anonymous',
          event: 'team_member_created',
          properties: { role: rolValue },
        });

        toast({
          title: t('common:actions.success'),
          description: t('dialog.created'),
        });
      } else {
        // Actualizar usuario
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
          error instanceof Error ? error.message : t('dialog.processError'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Combinar roles del sistema (de la DB) con opciones legacy como fallback
  // Formato: "roleId:rolValue" para poder extraer ambos valores
  const roleOptions = useMemo(() => {
    // Buscar los roles de sistema de la DB (tienen IDs reales)
    const dbAdminRole = roles.find(
      (r) => r.is_system_role && ['admin', 'administrador'].includes(r.name.toLowerCase())
    );
    const dbSellerRole = roles.find(
      (r) => r.is_system_role && ['seller', 'vendedor'].includes(r.name.toLowerCase())
    );

    // Usar IDs reales de la DB cuando existen, fallback a 0 para legacy
    const systemOptions = [
      {
        value: `${dbAdminRole?.id || 0}:admin`,
        label: t('form.roles.admin'),
        isSystem: true,
        roleId: dbAdminRole?.id || 0,
        rolValue: 'admin',
      },
      {
        value: `${dbSellerRole?.id || 0}:seller`,
        label: t('form.roles.seller'),
        isSystem: true,
        roleId: dbSellerRole?.id || 0,
        rolValue: 'seller',
      },
    ];

    // Agregar roles personalizados (no del sistema, no admin/vendedor)
    // Group sub-roles under their parent with visual indentation
    const customRoles = roles
      .filter((role) => !role.is_system_role)
      .filter((role) => !['admin', 'administrador', 'seller', 'vendedor'].includes(role.name.toLowerCase()));

    const topLevel = customRoles.filter((r) => !r.parent_role_id);
    const customOptions: typeof systemOptions = [];

    for (const role of topLevel) {
      customOptions.push({
        value: `${role.id}:${role.name.toLowerCase()}`,
        label: role.name,
        isSystem: false,
        roleId: role.id,
        rolValue: role.name.toLowerCase(),
      });
      // Add sub-roles indented
      const subRoles = customRoles.filter((r) => r.parent_role_id === role.id);
      for (const sub of subRoles) {
        customOptions.push({
          value: `${sub.id}:${sub.name.toLowerCase()}`,
          label: `  ↳ ${sub.name}`,
          isSystem: false,
          roleId: sub.id,
          rolValue: sub.name.toLowerCase(),
        });
      }
    }

    // Add orphan sub-roles of system roles (e.g., sub-roles of Vendedor)
    const systemSubRoles = customRoles.filter(
      (r) => r.parent_role_id && !topLevel.some((tl) => tl.id === r.parent_role_id)
    );
    for (const sub of systemSubRoles) {
      customOptions.push({
        value: `${sub.id}:${sub.name.toLowerCase()}`,
        label: `  ↳ ${sub.name}`,
        isSystem: false,
        roleId: sub.id,
        rolValue: sub.name.toLowerCase(),
      });
    }

    return [...systemOptions, ...customOptions];
  }, [roles, t]);

  const content = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleCreateUser)}
        className="flex flex-col flex-1 min-h-0"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
        {/* Header */}
        <div className="px-4 py-2 sm:px-5 sm:py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-[14px] sm:text-[16px] font-semibold text-slate-900 leading-tight">
            {user ? t('dialog.title.edit') : t('dialog.title.new')}
          </h2>
        </div>

        {/* Form Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-[13px] text-slate-700'>
                    {t('form.labels.email')} <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('form.placeholders.email')}
                      {...field}
                      disabled={!!user}
                      className={user ? 'bg-slate-50' : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!user && (
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-[13px] text-slate-700'>
                      {t('form.labels.password')} <span className='text-red-500'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type='password' placeholder={t('form.placeholders.password')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name='first_name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-[13px] text-slate-700'>
                    {t('form.labels.firstName')} <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('form.placeholders.firstName')} {...field} />
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
                  <FormLabel className='text-[13px] text-slate-700'>
                    {t('form.labels.lastName')} <span className='text-red-500'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('form.placeholders.lastName')} {...field} />
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
                  <FormLabel className='text-[13px] text-slate-700'>{t('form.labels.phone')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('form.placeholders.phone')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Multi-role assignment */}
            <div className="space-y-2">
              <label className='text-[13px] font-medium text-slate-700'>
                {t('form.labels.role')} <span className='text-red-500'>*</span>
              </label>
              {rolesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Cargando roles...</span>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {roleOptions.map((role) => {
                    const selectedIds = form.watch('selectedRoleIds') || [];
                    const isChecked = selectedIds.includes(role.roleId);
                    return (
                      <label
                        key={role.value}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = form.getValues('selectedRoleIds') || [];
                            let updated: number[];
                            if (e.target.checked) {
                              updated = [...current, role.roleId];
                            } else {
                              updated = current.filter((id) => id !== role.roleId);
                            }
                            form.setValue('selectedRoleIds', updated);
                            // Keep legacy rol field in sync (first role)
                            if (updated.length > 0) {
                              const firstRole = roleOptions.find((r) => r.roleId === updated[0]);
                              if (firstRole) form.setValue('rol', firstRole.value);
                            }
                          }}
                          className="rounded border-slate-300 text-blue-600 h-4 w-4"
                        />
                        <span className="text-[13px] text-slate-700">{role.label}</span>
                        {role.isSystem && (
                          <span className="text-[10px] text-slate-400 ml-auto">(Sistema)</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              {(form.watch('selectedRoleIds') || []).length === 0 && (
                <p className="text-[12px] text-red-500">{t('form.validation.roleRequired')}</p>
              )}
            </div>

            {/* Sede(s) — solo si el tenant tiene mas de una sede */}
            {showDealershipField && (
              <div className="space-y-2">
                <label className='text-[13px] font-medium text-slate-700'>
                  Sede(s)
                </label>
                <div className="border border-slate-200 rounded-xl p-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {dealerships.map((dealership) => {
                    const selectedIds = form.watch('selectedDealershipIds') || [];
                    const isChecked = selectedIds.includes(dealership.id);
                    const label = dealership.name || dealership.address || `Sede ${dealership.id}`;
                    return (
                      <label
                        key={dealership.id}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = form.getValues('selectedDealershipIds') || [];
                            const updated = e.target.checked
                              ? [...current, dealership.id]
                              : current.filter((id) => id !== dealership.id);
                            form.setValue('selectedDealershipIds', updated);
                          }}
                          className="rounded border-slate-300 text-blue-600 h-4 w-4"
                        />
                        <span className="text-[13px] text-slate-700">{label}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[12px] text-slate-400">
                  Si no asignas ninguna sede, el usuario ve todas.
                </p>
              </div>
            )}

            {/* Hidden field to keep form validation happy */}
            <input type="hidden" {...form.register('rol')} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <Button variant='outline' type='button' className='h-9 rounded-xl text-[13px]' onClick={onClose}>
              {t('common:buttons.cancel')}
            </Button>
            <Button
              type='submit'
              className='h-9 gap-2 rounded-xl text-[13px] bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('form.buttons.processing')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {user ? t('form.buttons.save') : t('form.buttons.create')}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );

  if (isDesktop) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onClose()} direction="right">
        <DrawerContentRight className="md:min-w-[480px]">
          <div className="flex flex-col h-full">
            {content}
          </div>
        </DrawerContentRight>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh]">
        <div className="flex flex-col h-full max-h-[92vh]">
          {content}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default UserDialog;
