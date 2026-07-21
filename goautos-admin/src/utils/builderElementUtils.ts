
import { v4 as uuidv4 } from 'uuid';
import { BuilderElement, ElementType, ElementVariant } from '@/types/siteBuilder';

export const createNewElement = (
  type: ElementType,
  variant?: ElementVariant
): BuilderElement => {
  const newElement: BuilderElement = {
    id: uuidv4(),
    type,
  };

  switch (type) {
    case 'heading':
      newElement.content = 'Título nuevo';
      break;
    case 'paragraph':
      newElement.content = 'Este es un párrafo de ejemplo. Haz clic para editar el texto.';
      break;
    case 'image':
      newElement.src = 'https://via.placeholder.com/400x200';
      break;
    case 'button':
      newElement.content = 'Botón';
      break;
    case 'container':
      newElement.children = [];
      break;
    case 'vehicles-list':
      newElement.variant = variant || 'grid';
      break;
    case 'initial-fold':
      newElement.variant = variant || 'centered-hero';
      break;
    case 'navbar':
      newElement.variant = variant || 'simple';
      break;
    case 'mailing-list':
      newElement.variant = variant || 'simple';
      break;
    case 'footer':
      newElement.variant = variant || 'simple';
      break;
    case 'content':
      newElement.variant = variant || 'grid';
      break;
    case 'benefits':
      newElement.variant = variant || 'icons';
      break;
    case 'about-us':
      newElement.variant = variant || 'simple';
      break;
  }

  return newElement;
};
