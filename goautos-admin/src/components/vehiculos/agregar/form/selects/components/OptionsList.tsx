import React, { useState } from 'react';
import { Check, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Option {
  id: string | number;
  name: string | null;
}

interface OptionsListProps {
  filteredOptions: Option[];
  selectedValue: string;
  onOptionSelect: (id: string) => void;
  onCreateNew: () => void;
  searchTerm: string;
  isModelSelect?: boolean;
  showCreateOption?: boolean;
  allowCreate?: boolean;
  isColorSelect?: boolean;
  brandId?: string | null;
  onModelCreatedInline?: (id: string, name: string) => void;
}

const OptionsList: React.FC<OptionsListProps> = ({
  filteredOptions,
  selectedValue,
  onOptionSelect,
  onCreateNew,
  searchTerm,
  isModelSelect = false,
  showCreateOption = false,
  allowCreate = false,
  isColorSelect = false,
  brandId = null,
  onModelCreatedInline,
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateInline = async () => {
    if (!newItemName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      if (isModelSelect && brandId) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { toast } = await import('@/hooks/use-toast');

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
          if (onModelCreatedInline) {
            onModelCreatedInline(existingModel.id.toString(), existingModel.name);
          }
          setNewItemName('');
          setIsCreating(false);
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

          if (onModelCreatedInline) {
            onModelCreatedInline(data.id.toString(), data.name);
          }
          setNewItemName('');
        }
      } else if (isColorSelect) {
        const { supabase } = await import('@/integrations/supabase/client');
        const { toast } = await import('@/hooks/use-toast');

        // Check if color exists
        const colorNameNormalized = newItemName.trim().toLowerCase();
        const { data: existingColors } = await supabase
          .from('colors')
          .select('id, name');

        const alreadyExists = (existingColors || []).some(
          (c: { name: string }) =>
            c.name.trim().toLowerCase() === colorNameNormalized
        );

        if (alreadyExists) {
          toast({
            title: 'Color ya existe',
            description: 'Este color ya está registrado',
            variant: 'destructive',
          });
          setIsCreating(false);
          setNewItemName('');
          return;
        }

        // Create new color
        const { data, error } = await supabase
          .from('colors')
          .insert({ name: newItemName })
          .select()
          .single();

        if (error) throw error;

        if (data) {
          toast({
            title: 'Éxito',
            description: `Color "${newItemName}" creado exitosamente`,
          });

          if (onModelCreatedInline) {
            onModelCreatedInline(data.id.toString(), data.name);
          }
          setNewItemName('');
        }
      }
    } catch (error) {
      console.error('Error creating item:', error);
      const { toast: toastFn } = await import('@/hooks/use-toast');
      toastFn({
        title: 'Error',
        description: 'No se pudo crear el item',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <ScrollArea className='h-60 w-full rounded-md border'>
      <div className='p-2'>
        {showCreateOption && (isModelSelect || isColorSelect) && (
          <div className='mb-3 p-2 bg-sky-50 rounded-md border border-sky-200'>
            <p className='text-xs font-medium text-sky-900 mb-2'>
              {isModelSelect ? '🚗 Crear nuevo modelo' : '🎨 Crear nuevo color'}
            </p>
            <div className='flex gap-2'>
              <Input
                placeholder={isModelSelect ? 'Ej: Corolla, Civic...' : 'Ej: Rojo, Azul...'}
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateInline();
                  }
                }}
                disabled={isCreating || (isModelSelect && !brandId)}
                className='h-8 text-sm'
              />
              <Button
                size='sm'
                onClick={handleCreateInline}
                disabled={isCreating || !newItemName.trim() || (isModelSelect && !brandId)}
                className='h-8 bg-sky-500 hover:bg-sky-600 text-white px-3'
              >
                {isCreating ? (
                  <Loader2 className='h-3 w-3 animate-spin' />
                ) : (
                  <Plus className='h-3 w-3' />
                )}
              </Button>
            </div>
            {isModelSelect && (
              <p className='text-xs text-muted-foreground mt-1'>
                Se guardará en MAYÚSCULAS asociado a la marca seleccionada
              </p>
            )}
          </div>
        )}

        {filteredOptions.length > 0 ? (
          <>
            {isModelSelect && (
              <div className='px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                Modelos existentes
              </div>
            )}
            {filteredOptions.map((option) => (
              <div
                key={option.id}
                className={cn(
                  'flex items-center rounded-md px-2 py-2 cursor-pointer hover:bg-slate-100 capitalize transition-colors',
                  String(option.id) === String(selectedValue) && 'bg-slate-100'
                )}
                onClick={() => onOptionSelect(String(option.id))}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    String(option.id) === String(selectedValue)
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
                <span>{option.name || ''}</span>
              </div>
            ))}
          </>
        ) : (
          <div className='px-2 py-6 text-center'>
            <p className='text-sm text-muted-foreground mb-3'>
              {isModelSelect || isColorSelect
                ? 'No se encontraron resultados'
                : 'No hay opciones disponibles'}
            </p>
            {(isModelSelect || isColorSelect) && (
              <p className='text-xs text-muted-foreground'>
                Usa el formulario de arriba para crear uno nuevo
              </p>
            )}
          </div>
        )}

        {allowCreate && !showCreateOption && (
          <div
            className='flex items-center rounded-md px-2 py-2 mt-2 cursor-pointer hover:bg-slate-100 border-t border-slate-200 text-primary'
            onClick={onCreateNew}
          >
            <Plus className='mr-2 h-4 w-4' />
            <span>Crear nuevo {searchTerm ? searchTerm : ''}</span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default OptionsList;
