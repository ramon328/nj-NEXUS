import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemCreated: (id: string) => void;
  itemType: string;
  brandId?: string | null;
  isModelSelect?: boolean;
  onModelCreated?: () => Promise<void>;
}

const CreateItemDialog = ({
  open,
  onOpenChange,
  onItemCreated,
  itemType,
  brandId = null,
  isModelSelect = false,
  onModelCreated,
}: CreateItemDialogProps) => {
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateNewItem = async () => {
    if (!newItemName.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre no puede estar vacío',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      if (isModelSelect && brandId) {
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

          if (onModelCreated) {
            console.log('Refetching models because model already exists');
            await onModelCreated();
          }

          console.log('Model already exists, using ID:', existingModel.id);
          onItemCreated(existingModel.id.toString());
          onOpenChange(false);
          setNewItemName('');
          return;
        }

        const { data, error } = await supabase
          .from('models')
          .insert({
            name: uppercaseModelName,
            brand_id: brandId,
            code: code,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          toast({
            title: 'Éxito',
            description: 'Modelo creado exitosamente',
          });

          console.log('New model created with ID:', data.id);

          if (onModelCreated) {
            console.log('Calling onModelCreated to refresh models list');
            await onModelCreated();
            console.log('Models list refreshed, now setting the created model');
          }

          onItemCreated(data.id.toString());
        }
      } else {
        // Lógica para crear color
        // 1. Buscar si ya existe el color (ignorando mayúsculas/minúsculas y espacios)
        const colorNameNormalized = newItemName.trim().toLowerCase();
        const { data: existingColors, error: searchError } = await supabase
          .from('colors')
          .select('id, name');
        if (searchError) throw searchError;
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
          return;
        }
        // 2. Insertar si no existe
        const { data, error } = await supabase
          .from('colors')
          .insert({ name: newItemName })
          .select()
          .single();
        if (error) {
          throw error;
        }
        if (data) {
          toast({
            title: 'Éxito',
            description: 'Color creado exitosamente',
          });
          onItemCreated(data.id.toString());
        }
      }

      onOpenChange(false);
      setNewItemName('');
    } catch (error) {
      console.error('Error creating new item:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el nuevo item',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]' guardClose>
        <DialogHeader>
          <DialogTitle className='text-xl'>
            {isModelSelect ? '🚗 Crear nuevo modelo' : `Crear nuevo ${itemType.toLowerCase()}`}
          </DialogTitle>
          {isModelSelect && brandId && (
            <p className='text-sm text-muted-foreground mt-2'>
              El modelo se creará asociado a la marca seleccionada
            </p>
          )}
        </DialogHeader>
        <div className='py-4'>
          <label className='text-sm font-medium mb-2 block'>
            Nombre del {isModelSelect ? 'modelo' : itemType.toLowerCase()}
          </label>
          <Input
            placeholder={`Ejemplo: ${
              isModelSelect ? 'Corolla, Civic, 320i' : 'Nombre'
            }`}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newItemName.trim() && !isCreating) {
                handleCreateNewItem();
              }
            }}
            autoFocus
            className='w-full'
          />
          {isModelSelect && (
            <p className='text-xs text-muted-foreground mt-2'>
              El nombre se guardará en mayúsculas automáticamente
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => {
              onOpenChange(false);
              setNewItemName('');
            }}
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateNewItem}
            disabled={isCreating || !newItemName.trim()}
            className='bg-sky-500 hover:bg-sky-600'
          >
            {isCreating ? (
              <>
                <span className='mr-2'>Creando...</span>
                <div className='h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
              </>
            ) : (
              'Crear'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateItemDialog;
