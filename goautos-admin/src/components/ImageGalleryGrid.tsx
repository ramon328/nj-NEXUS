import React, { useCallback, useMemo, memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ImageGalleryGridProps {
  images: (File | string)[];
  onRemove: (index: number) => void;
  onAdd: (file: File) => void;
  onAddMultiple?: (files: File[]) => void;
  onReorder: (newOrder: (File | string)[]) => void;
  maxImages: number;
}

// IDs estables por imagen (siguen a la imagen, no al índice) para que dnd-kit
// anime el item correcto durante el reorden. Las URLs son estables; los File se
// identifican por nombre+tamaño+fecha, con sufijo si se repiten.
function useImageIds(images: (File | string)[]): string[] {
  return useMemo(() => {
    const seen: Record<string, number> = {};
    return images.map((img) => {
      const base =
        typeof img === 'string'
          ? img
          : `${img.name}-${img.size}-${img.lastModified}`;
      const n = (seen[base] = (seen[base] || 0) + 1);
      return n > 1 ? `${base}#${n}` : base;
    });
  }, [images]);
}

// Imagen arrastrable con selector de posición y botón de borrar.
const SortableImageItem = memo(
  ({
    id,
    image,
    index,
    totalImages,
    onRemove,
    onMoveToPosition,
  }: {
    id: string;
    image: File | string;
    index: number;
    totalImages: number;
    onRemove: (index: number) => void;
    onMoveToPosition: (fromIndex: number, toIndex: number) => void;
  }) => {
    const [showPositionSelector, setShowPositionSelector] = useState(false);
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id });

    const imageSrc = useMemo(() => {
      return typeof image === 'string' ? image : URL.createObjectURL(image);
    }, [image]);

    // Revoca el object URL de los File al desmontar (evita fugas de memoria).
    React.useEffect(() => {
      return () => {
        if (typeof image !== 'string') URL.revokeObjectURL(imageSrc);
      };
    }, [image, imageSrc]);

    const handleRemove = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove(index);
      },
      [onRemove, index]
    );

    const handlePositionChange = useCallback(
      (newPosition: string) => {
        const newIndex = parseInt(newPosition) - 1;
        if (newIndex !== index) onMoveToPosition(index, newIndex);
        setShowPositionSelector(false);
      },
      [index, onMoveToPosition]
    );

    const handleNumberClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setShowPositionSelector((v) => !v);
    }, []);

    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
      zIndex: isDragging ? 30 : undefined,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className='relative aspect-[4/3] overflow-hidden rounded-md border-2 border-gray-200 transition-colors hover:border-primary'
      >
        {/* La imagen es el "handle" de arrastre: los botones encima siguen clicables. */}
        <img
          src={imageSrc}
          alt={`Gallery image ${index + 1}`}
          className='h-full w-full touch-none cursor-grab rounded-md object-cover active:cursor-grabbing'
          draggable={false}
          loading='lazy'
          {...attributes}
          {...listeners}
        />

        {/* Selector de posición (portada = 1) */}
        <div className='absolute left-1 top-1 z-20'>
          {showPositionSelector ? (
            <Select
              value={(index + 1).toString()}
              onValueChange={handlePositionChange}
            >
              <SelectTrigger className='h-6 w-12 border-0 bg-black/60 text-xs font-bold text-white/90'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: totalImages }, (_, i) => (
                  <SelectItem key={i} value={(i + 1).toString()}>
                    {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Button
              type='button'
              variant='default'
              size='sm'
              className='h-6 w-6 rounded-full border-0 bg-black/60 p-0 text-xs font-bold text-white/90 hover:bg-black/70'
              onClick={handleNumberClick}
            >
              {index + 1}
            </Button>
          )}
        </div>

        {/* Botón borrar */}
        <Button
          type='button'
          size='icon'
          className='absolute right-1 top-1 z-20 h-6 w-6 border-0 bg-black/60 text-white/90 hover:bg-black/70'
          onClick={handleRemove}
        >
          <Trash2 className='h-3 w-3' />
        </Button>

        {/* Pista visual de que se puede arrastrar */}
        <div className='pointer-events-none absolute bottom-1 right-1 z-10 rounded bg-black/40 p-0.5 text-white/70'>
          <GripVertical className='h-3 w-3' />
        </div>
      </div>
    );
  }
);
SortableImageItem.displayName = 'SortableImageItem';

const ImageGalleryGrid = ({
  images,
  onRemove,
  onAdd,
  onAddMultiple,
  onReorder,
  maxImages,
}: ImageGalleryGridProps) => {
  const ids = useImageIds(images);

  // distancia/delay mínimos: un click en los botones no dispara arrastre.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  const handleMoveToPosition = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      onReorder(arrayMove(images, fromIndex, toIndex));
    },
    [images, onReorder]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = ids.indexOf(active.id as string);
      const newIndex = ids.indexOf(over.id as string);
      if (oldIndex < 0 || newIndex < 0) return;
      onReorder(arrayMove(images, oldIndex, newIndex));
    },
    [ids, images, onReorder]
  );

  const handleAddMultiple = useCallback(
    (files: File[]) => {
      if (onAddMultiple) onAddMultiple(files);
    },
    [onAddMultiple]
  );

  return (
    <div className='space-y-4'>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={ids} strategy={rectSortingStrategy}>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
            {images.map((image, index) => (
              <SortableImageItem
                key={ids[index]}
                id={ids[index]}
                image={image}
                index={index}
                totalImages={images.length}
                onRemove={onRemove}
                onMoveToPosition={handleMoveToPosition}
              />
            ))}

            {/* Botón agregar imagen */}
            {images.length < maxImages && (
              <div className='flex aspect-[4/3] max-h-full max-w-full items-center justify-center rounded-md border border-dashed border-slate-200 transition-colors hover:border-slate-300 hover:bg-slate-50'>
                <ImageUpload
                  value={null}
                  onChange={onAdd}
                  onMultipleChange={handleAddMultiple}
                  multiple={true}
                  label={<Plus className='h-5 w-5 text-slate-300' />}
                  className='flex h-full w-full items-center justify-center'
                />
              </div>
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default ImageGalleryGrid;
