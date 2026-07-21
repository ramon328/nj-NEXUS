import React, { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { UserFormData } from '../UserAuthService';
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
import { useToast } from '@/hooks/use-toast';
import { User } from '@/types/user';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User as UserIcon, Shield, Building2, Check } from 'lucide-react';

export type UserFormValues = z.infer<ReturnType<typeof buildSchema>>;

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
    client_id: z.string().optional(),
  });

interface UserFormProps {
  onSubmit: (values: UserFormValues) => Promise<void>;
  isLoading: boolean;
  user: User | null;
  clients: { id: number; name: string }[];
  onClose: () => void;
}

const UserForm = ({
  onSubmit,
  isLoading,
  user,
  clients,
  onClose,
}: UserFormProps) => {
  const { userRole } = useAuth();
  const { t } = useTranslation('team');
  const schema = useMemo(() => buildSchema(t), [t]);
  const form = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: user?.email || '',
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      rol: user?.rol || '',
      client_id: user?.client_id ? String(user.client_id) : undefined,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Account Section */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-400" />
            Cuenta
          </h4>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600 text-sm">
                  {t('form.labels.email')} <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={t('form.placeholders.email')}
                    {...field}
                    disabled={!!user}
                    className={`h-11 ${user ? 'bg-gray-100' : ''}`}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!user && (
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600 text-sm flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 text-gray-400" />
                    {t('form.labels.password')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder={t('form.placeholders.password')} className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Personal Info Section */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-gray-400" />
            Información Personal
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600 text-sm">
                    {t('form.labels.firstName')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('form.placeholders.firstName')} className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600 text-sm">
                    {t('form.labels.lastName')} <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t('form.placeholders.lastName')} className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Role & Client Section */}
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Shield className="h-4 w-4 text-gray-400" />
            Permisos
          </h4>

          <FormField
            control={form.control}
            name="rol"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600 text-sm">
                  {t('form.labels.role')} <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder={t('form.placeholders.role')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {userRole === 'superadmin' && (
                      <SelectItem value="superadmin">{t('form.roles.superadmin')}</SelectItem>
                    )}
                    <SelectItem value="admin">{t('form.roles.admin')}</SelectItem>
                    <SelectItem value="seller">{t('form.roles.seller')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {userRole === 'superadmin' && (
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-600 text-sm flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                    {t('form.labels.client')}
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t('form.placeholders.client')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{t('form.client.none')}</SelectItem>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={String(client.id)}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose} className="w-full sm:w-auto">
            {t('common:buttons.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90">
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
      </form>
    </Form>
  );
};

export default UserForm;
