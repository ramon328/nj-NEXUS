import React, { ReactNode, useState, useMemo } from 'react';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Control, UseFormReturn } from 'react-hook-form';
import { ChevronsUpDown, Check, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useModels } from '@/hooks/useModels';
import { useVersions } from '@/hooks/useVersions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AutocompleteSelectProps {
  name: string;
  control: Control<any>;
  label: ReactNode;
  placeholder?: string;
  options: { id: string | number; name: string | null }[];
  disabled?: boolean;
  description?: string;
  onChange?: (value: string, optionName?: string | null) => void;
  allowCreate?: boolean;
  brandId?: string | null;
  isModelSelect?: boolean;
  showCreateOption?: boolean;
  form?: UseFormReturn<any>;
  isColorSelect?: boolean;
  isVersionSelect?: boolean;
  modelId?: number | null;
  className?: string;
}

const AutocompleteSelect = ({
  name,
  control,
  label,
  placeholder = 'Seleccionar',
  options = [],
  disabled = false,
  description,
  onChange,
  brandId = null,
  isModelSelect = false,
  showCreateOption = false,
  form,
  isColorSelect = false,
  isVersionSelect = false,
  modelId = null,
  className,
}: AutocompleteSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Solo usar useModels cuando es un selector de modelos
  const { models, refetchModels } = useModels(isModelSelect ? brandId : null);

  // Solo usar useVersions cuando es un selector de versiones
  const { versions, refetchVersions } = useVersions(
    isVersionSelect ? modelId : null
  );

  // Usamos las opciones del prop o las del hook según el tipo de selector
  const effectiveOptions = isModelSelect
    ? models
    : isVersionSelect
    ? versions
    : options;

  const safeOptions = useMemo(() => {
    return Array.isArray(effectiveOptions)
      ? effectiveOptions.filter(
          (opt) => opt && typeof opt === 'object' && opt.id != null
        )
      : [];
  }, [effectiveOptions]);

  const filteredOptions = useMemo(() => {
    return safeOptions.filter(
      (option) =>
        !searchTerm.trim() ||
        (option.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [safeOptions, searchTerm]);

  const handleOptionSelect = (optionId: string, optionName?: string | null) => {
    if (form) {
      form.setValue(name, optionId);
    }
    // Resolver el nombre de la opción si no se entregó explícitamente, para que
    // el consumidor pueda capturar el texto (ej: version_name) aunque la opción
    // recién se haya creado.
    const resolvedName =
      optionName !== undefined
        ? optionName
        : safeOptions.find((opt) => String(opt.id) === String(optionId))?.name ??
          null;
    if (onChange) onChange(optionId, resolvedName);
    setSearchTerm('');
    setOpen(false);
  };

  const handleCreateInline = async () => {
    if (!newItemName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      if (isModelSelect && brandId) {
        // Get brand name
        const { data: brandData } = await supabase
          .from('brands')
          .select('name')
          .eq('id', brandId)
          .single();

        if (!brandData || !brandData.name) {
          throw new Error('No se pudo encontrar la marca seleccionada');
        }

        const uppercaseModelName = newItemName.toUpperCase();
        const brandName = brandData.name.toLowerCase().replace(/\s+/g, '_');
        const modelNameForCode = newItemName.toLowerCase().replace(/\s+/g, '_');
        const code = `${brandName}_${modelNameForCode}`;

        // Check if model already exists
        const { data: existingModel } = await supabase
          .from('models')
          .select('id, name')
          .eq('code', code)
          .eq('brand_id', brandId)
          .single();

        if (existingModel) {
          toast({
            title: 'Modelo ya existe',
            description: 'Este modelo ya está registrado',
          });
          handleOptionSelect(existingModel.id.toString());
          setNewItemName('');
          return;
        }

        // Create new model
        const { data, error } = await supabase
          .from('models')
          .insert({
            name: uppercaseModelName,
            brand_id: brandId,
            code: code,
          })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          toast({
            title: 'Éxito',
            description: `Modelo "${uppercaseModelName}" creado exitosamente`,
          });
          // Refetch models and select the new one
          if (refetchModels) await refetchModels();
          handleOptionSelect(data.id.toString());
          setNewItemName('');
        }
      } else if (isColorSelect) {
        // Check if color exists
        const colorNameNormalized = newItemName.trim().toLowerCase();
        const { data: existingColors } = await supabase
          .from('colors')
          .select('id, name');

        const existingColor = (existingColors || []).find(
          (c: { id: number; name: string }) =>
            c.name.trim().toLowerCase() === colorNameNormalized
        );

        if (existingColor) {
          toast({
            title: 'Color ya existe',
            description: 'Este color ya está registrado, se seleccionará automáticamente',
          });
          handleOptionSelect(existingColor.id.toString());
          setNewItemName('');
          return;
        }

        // Create new color
        const { data, error } = await supabase
          .from('colors')
          .insert({ name: newItemName.trim() })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          toast({
            title: 'Éxito',
            description: `Color "${newItemName}" creado exitosamente`,
          });
          handleOptionSelect(data.id.toString(), data.name);
          setNewItemName('');
        }
      } else if (isVersionSelect && modelId) {
        const versionName = newItemName.trim();

        // Revisar si ya existe una versión con ese name + model_id (evita duplicar)
        const versionNameNormalized = versionName.toLowerCase();
        const { data: existingVersions } = await (supabase as any)
          .from('versions')
          .select('id, name')
          .eq('model_id', modelId);

        const existingVersion = (existingVersions || []).find(
          (v: { id: number; name: string | null }) =>
            (v.name || '').trim().toLowerCase() === versionNameNormalized
        );

        if (existingVersion) {
          toast({
            title: 'Versión ya existe',
            description:
              'Esta versión ya está registrada, se seleccionará automáticamente',
          });
          handleOptionSelect(
            existingVersion.id.toString(),
            existingVersion.name
          );
          setNewItemName('');
          return;
        }

        // Crear nueva versión
        const { data, error } = await (supabase as any)
          .from('versions')
          .insert({ name: versionName, model_id: modelId })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          toast({
            title: 'Éxito',
            description: `Versión "${versionName}" creada exitosamente`,
          });
          // Refetch versions para que la lista local incluya la nueva
          if (refetchVersions) await refetchVersions();
          handleOptionSelect(data.id.toString(), data.name);
          setNewItemName('');
        }
      }
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el item',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col mt-2">
          <FormLabel>{label}</FormLabel>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={cn(
                    'w-full justify-between font-normal h-9',
                    !field.value && 'text-gray-300',
                    className
                  )}
                  disabled={disabled}
                  onClick={() => setOpen(true)}
                >
                  {field.value
                    ? safeOptions.find(
                        (option) => String(option.id) === String(field.value)
                      )?.name || placeholder
                    : placeholder}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
              <div className="flex flex-col w-full">
                {/* Search input */}
                <div className="p-2 border-b">
                  <Input
                    placeholder={`Buscar ${typeof label === 'string' ? label.toLowerCase() : ''}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8"
                  />
                </div>

                {/* Create new option (for models, colors and versions) */}
                {showCreateOption && (isModelSelect || isColorSelect || isVersionSelect) && (
                  <div className="p-2 bg-sky-50 border-b border-sky-200">
                    <p className="text-xs font-medium text-sky-900 mb-2">
                      {isModelSelect
                        ? '🚗 Crear nuevo modelo'
                        : isColorSelect
                        ? '🎨 Crear nuevo color'
                        : '🏷️ Crear nueva versión'}
                    </p>
                    <div className="flex gap-2">
                      <Input
                        placeholder={
                          isModelSelect
                            ? 'Ej: Corolla, Civic...'
                            : isColorSelect
                            ? 'Ej: Rojo, Azul...'
                            : 'Ej: 5.3 LT Trail Boss'
                        }
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateInline();
                          }
                        }}
                        disabled={
                          isCreating ||
                          (isModelSelect && !brandId) ||
                          (isVersionSelect && !modelId)
                        }
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleCreateInline}
                        disabled={
                          isCreating ||
                          !newItemName.trim() ||
                          (isModelSelect && !brandId) ||
                          (isVersionSelect && !modelId)
                        }
                        className="h-8 bg-sky-500 hover:bg-sky-600 text-white px-3"
                      >
                        {isCreating ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    {isModelSelect && !brandId && (
                      <p className="text-xs text-amber-600 mt-1">
                        Selecciona una marca primero
                      </p>
                    )}
                    {isVersionSelect && !modelId && (
                      <p className="text-xs text-amber-600 mt-1">
                        Selecciona un modelo primero
                      </p>
                    )}
                  </div>
                )}

                {/* Options list */}
                <ScrollArea className="h-60">
                  <div className="p-2">
                    {filteredOptions.length > 0 ? (
                      <>
                        {isModelSelect && (
                          <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Modelos existentes
                          </div>
                        )}
                        {filteredOptions.map((option) => (
                          <div
                            key={option.id}
                            className={cn(
                              'flex items-center rounded-md px-2 py-2 cursor-pointer hover:bg-slate-100 capitalize transition-colors',
                              String(option.id) === String(field.value) && 'bg-slate-100'
                            )}
                            onClick={() => handleOptionSelect(String(option.id))}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                String(option.id) === String(field.value)
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            <span>{option.name || ''}</span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="px-2 py-6 text-center">
                        <p className="text-sm text-muted-foreground">
                          {searchTerm
                            ? 'No se encontraron resultados'
                            : 'No hay opciones disponibles'}
                        </p>
                        {(isModelSelect || isColorSelect || isVersionSelect) && showCreateOption && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Usa el formulario de arriba para crear uno nuevo
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {description && (
            <FormDescription className="text-xs">{description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default AutocompleteSelect;
