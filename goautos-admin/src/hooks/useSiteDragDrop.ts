import { useState } from 'react';
import { ElementType, ElementVariant } from '@/types/siteBuilder';

/**
 * Hook para manejar operaciones de arrastrar y soltar de elementos del sitio
 */
export function useSiteDragDrop(
  addElement: (
    type: ElementType,
    position: number,
    variant?: string,
    options?: any
  ) => void
) {
  const [isDragging, setIsDragging] = useState<boolean>(false);

  /**
   * Maneja el evento cuando se suelta un elemento en el canvas
   */
  const handleDrop = (e: React.DragEvent, position: number) => {
    // Prevenir comportamiento por defecto del navegador
    e.preventDefault();
    setIsDragging(false);

    try {
      // Primero intentar leer datos como JSON
      let elementType: ElementType | null = null;
      let elementVariant: string | undefined;
      let backgroundColor: string | undefined;

      try {
        // Primero intentamos leer los datos JSON
        const jsonData = e.dataTransfer.getData('application/json');
        if (jsonData) {
          const data = JSON.parse(jsonData);
          elementType = data.type as ElementType;
          elementVariant = data.variant;
          backgroundColor = data.backgroundColor;
        }
      } catch (error) {
        // Si hay error procesando el JSON, continuamos con el flujo normal
        console.warn(
          'Error parsing drag data as JSON, using text format',
          error
        );
      }

      // Si no pudimos obtener el tipo del JSON, usamos el formato de texto
      if (!elementType) {
        const data = e.dataTransfer.getData('text');
        // Si no hay datos, salimos
        if (!data) return;

        // Parsear los datos según el formato: tipo:variante
        const parts = data.split(':');
        elementType = parts[0] as ElementType;
        elementVariant = parts.length > 1 ? parts[1] : undefined;
      }

      // Agregar el elemento con la información obtenida
      addElement(elementType, position, elementVariant, { backgroundColor });
    } catch (error) {
      console.error('Error al manejar drop:', error);
    }
  };

  return { isDragging, setIsDragging, handleDrop };
}
