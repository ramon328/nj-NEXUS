
import {
  InitialFoldVariant,
  NavbarVariant,
  MailingListVariant,
  FooterVariant,
  ContentVariant,
  BenefitsVariant,
  AboutUsVariant,
} from '@/types/builder';

export type ElementType =
  | 'heading'
  | 'paragraph'
  | 'image'
  | 'button'
  | 'container'
  | 'vehicles-list'
  | 'initial-fold'
  | 'navbar'
  | 'mailing-list'
  | 'footer'
  | 'content'
  | 'benefits'
  | 'about-us';

export type VehicleCardVariant =
  | 'grid'
  | 'compact'
  | 'featured'
  | 'horizontal'
  | 'minimal'
  | 'gallery';

export type ElementVariant =
  | VehicleCardVariant
  | InitialFoldVariant
  | NavbarVariant
  | MailingListVariant
  | FooterVariant
  | ContentVariant
  | BenefitsVariant
  | AboutUsVariant;

export interface BuilderElement {
  id: string;
  type: ElementType;
  content?: string;
  src?: string;
  style?: React.CSSProperties;
  children?: BuilderElement[];
  variant?: ElementVariant;
  metadata?: { [key: string]: string }; // Added metadata field for custom attributes
  backgroundColor?: string; // Added backgroundColor property for sections
  cleanHtml?: string; // HTML limpio para visualización sin controles de edición
  position?: number; // Posición del elemento para ordenación
}

export interface SiteContextType {
  elements: BuilderElement[];
  setElements: (elements: BuilderElement[]) => void;
  addElement: (
    type: ElementType,
    position?: number | string,
    variant?: ElementVariant,
    options?: { backgroundColor?: string }
  ) => string | void;
  updateElement: (id: string, updates: Partial<BuilderElement>) => void;
  removeElement: (id: string) => void;
  selectedElement: string | null;
  setSelectedElement: (id: string | null) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  handleDrop: (e: React.DragEvent, position: number) => void;
  isDragging: boolean;
  setIsDragging: (isDragging: boolean) => void;
  moveElement: (
    draggedId: string,
    targetId: string,
    position?: 'before' | 'after'
  ) => void;

  // Nuevas propiedades para la gestión del sitio web
  isEnabled: boolean;
  setIsEnabled: (isEnabled: boolean) => void;
  isLoading: boolean;
  isSaving: boolean;
  saveHomePageHtml: () => Promise<void>;
  loadWebsiteConfig: () => Promise<void>;
  loadSavedElements: () => Promise<boolean>;
  configId: string | null;
  hasLoadedElements: boolean;
}
