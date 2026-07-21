import React from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useI18n } from '@/hooks/useI18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { ClientFormValues } from '../ClientSchema';
import { Building2, Globe, Image, Languages, DollarSign } from 'lucide-react';

interface BasicInfoFieldsProps {
  form: UseFormReturn<ClientFormValues>;
}

const BasicInfoFields = ({ form }: BasicInfoFieldsProps) => {
  const { tForm } = useI18n();

  return (
    <div className="space-y-5">
      {/* Name & Domain - Essential fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                {tForm('labels.name')} <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={tForm('placeholders.enterName')}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="domain"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                {tForm('labels.domain')} <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="ejemplo.com"
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Logos */}
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Image className="h-4 w-4 text-gray-400" />
          Imágenes de marca
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="favicon"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600 text-sm">
                  Favicon URL
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={tForm('placeholders.enterUrl')}
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logo"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600 text-sm">
                  Logo URL
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={tForm('placeholders.enterUrl')}
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logo_dark"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-gray-600 text-sm">
                  Logo Dark URL
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={tForm('placeholders.enterUrl')}
                    className="h-10"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                {tForm('labels.currency')}
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || 'CLP'}
              >
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={tForm('placeholders.selectOption')}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CLP">CLP - Peso Chileno</SelectItem>
                  <SelectItem value="USD">USD - Dólar</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="default_language"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-700 flex items-center gap-2">
                <Languages className="h-4 w-4 text-gray-400" />
                {tForm('labels.language')}
              </FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || 'es'}
              >
                <FormControl>
                  <SelectTrigger className="h-11">
                    <SelectValue
                      placeholder={tForm('placeholders.selectOption')}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default BasicInfoFields;
