import { useState } from 'react';
import {
  BuilderElement,
  ElementType,
  ElementVariant,
} from '@/types/siteBuilder';
import { createNewElement } from '@/utils/builderElementUtils';

export const useSiteElements = () => {
  const [elements, setElements] = useState<BuilderElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const addElement = (
    type: ElementType,
    position?: number | string,
    variant?: ElementVariant,
    options?: { backgroundColor?: string }
  ) => {
    const newElement = createNewElement(type, variant);

    // Aplicar opciones adicionales como el color de fondo
    if (options) {
      if (options.backgroundColor) {
        newElement.backgroundColor = options.backgroundColor;
      }
    }

    // Aquí verificamos si position es un número (posición directa) o string (targetId)
    if (typeof position === 'number') {
      // Insertar en una posición específica por índice
      const newElements = [...elements];
      newElements.splice(position, 0, newElement);
      setElements(newElements);
    } else if (typeof position === 'string') {
      // position es un targetId, necesitamos la posición relativa ('before' o 'after')
      // Este es el caso para la compatibilidad hacia atrás
      const targetId = position;
      const positionRelative = variant as unknown as 'before' | 'after';

      const targetIndex = elements.findIndex((el) => el.id === targetId);
      if (targetIndex !== -1) {
        const newElements = [...elements];
        const insertIndex =
          positionRelative === 'after' ? targetIndex + 1 : targetIndex;
        newElements.splice(insertIndex, 0, newElement);
        setElements(newElements);
      } else {
        // Fallback a agregar al final si no se encuentra el objetivo
        setElements([...elements, newElement]);
      }
    } else {
      // Solo agregar al final
      setElements([...elements, newElement]);
    }

    setSelectedElement(newElement.id);
    return newElement.id;
  };

  const updateElement = (id: string, updates: Partial<BuilderElement>) => {
    setElements(
      elements.map((element, index) => {
        // Si es el elemento que estamos actualizando
        if (element.id === id) {
          // Si no tiene posición aún, o si debemos actualizarla explícitamente
          const position =
            updates.position !== undefined
              ? updates.position
              : element.position !== undefined
              ? element.position
              : index;

          return {
            ...element,
            ...updates,
            position,
          };
        }
        // Para otros elementos, asegurarnos de que tengan posición
        return element.position !== undefined
          ? element
          : { ...element, position: index };
      })
    );
  };

  const removeElement = (id: string) => {
    setElements(elements.filter((element) => element.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  };

  const moveElement = (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' = 'after'
  ) => {
    if (draggedId === targetId) return;

    const draggedIndex = elements.findIndex((el) => el.id === draggedId);
    const targetIndex = elements.findIndex((el) => el.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newElements = [...elements];
    const [draggedElement] = newElements.splice(draggedIndex, 1);

    // Calculate the correct insertion index
    let insertIndex = position === 'after' ? targetIndex + 1 : targetIndex;

    // If we're moving from a position before the target, and the target position
    // has shifted up because of the element removal, we need to adjust
    if (draggedIndex < targetIndex) {
      insertIndex -= 1;
    }

    newElements.splice(insertIndex, 0, draggedElement);
    setElements(newElements);
  };

  return {
    elements,
    setElements,
    selectedElement,
    setSelectedElement,
    addElement,
    updateElement,
    removeElement,
    moveElement,
  };
};
