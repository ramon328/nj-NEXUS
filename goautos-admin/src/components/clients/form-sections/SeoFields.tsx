import React from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { UseFormReturn } from 'react-hook-form';
import { ClientFormValues } from '../ClientSchema';
import { FileText, Type, Tags } from 'lucide-react';

interface SeoFieldsProps {
  form: UseFormReturn<ClientFormValues>;
}

const SeoFields = ({ form }: SeoFieldsProps) => {
  return (
    <div className="space-y-5">
      {/* SEO Info Card */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> Una buena configuración SEO ayuda a que el sitio aparezca mejor posicionado en Google y otros buscadores.
        </p>
      </div>

      {/* SEO Title */}
      <FormField
        control={form.control}
        name="seo_title"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700 flex items-center gap-2">
              <Type className="h-4 w-4 text-gray-400" />
              Título SEO
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: Automotora XYZ - Los mejores autos usados en Chile"
                className="h-11"
                {...field}
              />
            </FormControl>
            <p className="text-xs text-gray-500 mt-1">
              Aparece en la pestaña del navegador y en resultados de búsqueda
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* SEO Description */}
      <FormField
        control={form.control}
        name="seo_description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              Descripción SEO
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="Ej: Encuentra el auto de tus sueños en Automotora XYZ. Amplio stock de vehículos usados con garantía..."
                className="min-h-[100px] resize-none"
                {...field}
              />
            </FormControl>
            <p className="text-xs text-gray-500 mt-1">
              Descripción que aparece en los resultados de Google (máx. 160 caracteres recomendados)
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* SEO Keywords */}
      <FormField
        control={form.control}
        name="seo_keywords"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-700 flex items-center gap-2">
              <Tags className="h-4 w-4 text-gray-400" />
              Palabras Clave
            </FormLabel>
            <FormControl>
              <Input
                placeholder="Ej: autos usados, automotora, vehículos seminuevos, financiamiento"
                className="h-11"
                {...field}
              />
            </FormControl>
            <p className="text-xs text-gray-500 mt-1">
              Palabras clave separadas por coma para mejorar el posicionamiento
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default SeoFields;
