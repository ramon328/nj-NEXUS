import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { UseFormReturn } from 'react-hook-form';
import { ClientFormValues } from '../ClientSchema';
import { Sun, Moon } from 'lucide-react';

interface ThemeFieldsProps {
  form: UseFormReturn<ClientFormValues>;
}

const ColorField = ({
  label,
  field,
  defaultColor,
}: {
  label: string;
  field: any;
  defaultColor: string;
}) => (
  <FormItem>
    <FormLabel className="text-gray-600 text-sm">{label}</FormLabel>
    <FormControl>
      <div className="flex gap-2">
        <Input
          placeholder="Ej: #facc14"
          className="h-10 flex-1"
          {...field}
        />
        <div className="relative">
          <Input
            type="color"
            className="w-12 h-10 p-1 cursor-pointer rounded-lg border-2 border-gray-200"
            value={field.value || defaultColor}
            onChange={(e) => field.onChange(e.target.value)}
          />
        </div>
      </div>
    </FormControl>
    <FormMessage />
  </FormItem>
);

const ThemeFields = ({ form }: ThemeFieldsProps) => {
  return (
    <div className="space-y-5">
      {/* Light Theme */}
      <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
        <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100">
            <Sun className="h-4 w-4 text-amber-600" />
          </div>
          Tema Claro
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="theme_light_primary"
            render={({ field }) => (
              <ColorField
                label="Color Primario"
                field={field}
                defaultColor="#facc14"
              />
            )}
          />

          <FormField
            control={form.control}
            name="theme_light_secondary"
            render={({ field }) => (
              <ColorField
                label="Color Secundario"
                field={field}
                defaultColor="#ffffff"
              />
            )}
          />
        </div>
      </div>

      {/* Dark Theme */}
      <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
        <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-900">
            <Moon className="h-4 w-4 text-indigo-400" />
          </div>
          Tema Oscuro
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="theme_dark_primary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-400 text-sm">Color Primario</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: #facc14"
                      className="h-10 flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      {...field}
                    />
                    <Input
                      type="color"
                      className="w-12 h-10 p-1 cursor-pointer rounded-lg border-2 border-gray-700 bg-gray-800"
                      value={field.value || '#facc14'}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="theme_dark_secondary"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-400 text-sm">Color Secundario</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ej: #1f2937"
                      className="h-10 flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                      {...field}
                    />
                    <Input
                      type="color"
                      className="w-12 h-10 p-1 cursor-pointer rounded-lg border-2 border-gray-700 bg-gray-800"
                      value={field.value || '#ffffff'}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* Color preview hint */}
      <p className="text-xs text-gray-500 text-center">
        Los colores se aplicarán automáticamente al sitio web del cliente
      </p>
    </div>
  );
};

export default ThemeFields;
