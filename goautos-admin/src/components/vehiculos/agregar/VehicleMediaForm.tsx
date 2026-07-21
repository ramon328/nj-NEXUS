import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VehicleMedia } from '@/types/vehicleCreation';
import ImageUpload from '@/components/ImageUpload';
import { toast } from '@/hooks/use-toast';
import ImageGalleryGrid from '@/components/ImageGalleryGrid';
import DocumentUploadModal from '@/components/vehicle/detail/documents/DocumentUploadModal';
import { FileText, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { TransactionsProvider } from '@/components/vehicle/detail/transactions/TransactionsContext';
import { useVehicleCreation } from '@/hooks/useVehicleCreation';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

interface VehicleMediaFormProps {
  initialData: {
    media?: {
      mainImage?: File | string | null;
      gallery?: (File | string)[];
      extraDocuments?: (File | string)[];
    };
  };
  onSave: (data: VehicleMedia) => boolean | Promise<boolean>;
  onTempSave?: (data: VehicleMedia) => void;
  onNext: (data?: VehicleMedia) => void;
  onPrevious: () => void;
  isEditMode?: boolean;
  submitButtonText?: string;
}

// Tipo para documentos con metadatos
interface DocumentWithMetadata {
  file: File;
  title: string;
  description: string;
}

const VehicleMediaForm = ({
  initialData,
  onSave,
  onTempSave,
  onNext,
  onPrevious,
  isEditMode = false,
  submitButtonText,
}: VehicleMediaFormProps) => {
  const { t } = useTranslation('common');
  const [mainImage, setMainImage] = useState<File | string | null>(
    initialData.media?.mainImage || null
  );
  const [gallery, setGallery] = useState<(File | string)[]>(
    initialData.media?.gallery || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { updateMedia } = useVehicleCreation();

  const [extraDocuments, setExtraDocuments] = useState<
    (File | string | DocumentWithMetadata)[]
  >(initialData.media?.extraDocuments || []);

  const MAX_GALLERY_IMAGES = 30;

  // This effect ensures we're always in sync with initialData
  useEffect(() => {
    setMainImage(initialData.media?.mainImage || null);
    setGallery(initialData.media?.gallery || []);
  }, [initialData.media]);

  // This effect updates the temporary state whenever the form data changes
  useEffect(() => {
    if (onTempSave) {
      const mediaData: VehicleMedia = {
        mainImage,
        gallery,
        // preservar metadatos (title, description, type) cuando existan
        extraDocuments,
      };
      onTempSave(mediaData);
    }
  }, [mainImage, gallery, extraDocuments, onTempSave]);

  // Función para actualizar media cuando cambien los datos
  const updateMediaData = () => {
    const mediaData: VehicleMedia = {
      mainImage,
      gallery,
      // conservar documentos con metadatos
      extraDocuments,
    };
    updateMedia(mediaData);
  };

  // Actualizar media cuando cambien los datos principales (sin bucle infinito)
  useEffect(() => {
    updateMediaData();
  }, [mainImage, gallery]);

  // Actualizar media cuando cambien los documentos (con debounce para evitar loops)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateMediaData();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [extraDocuments]);

  useEffect(() => {
    console.log('Documentos temporales actuales en media:', extraDocuments);
  }, [extraDocuments]);

  const handleAddToGallery = (file: File) => {
    if (gallery.length >= MAX_GALLERY_IMAGES) {
      toast({
        title: t('addVehicle.media.toasts.limitReached.title'),
        description: t('addVehicle.media.toasts.limitReached.description', {
          max: MAX_GALLERY_IMAGES,
        }),
        variant: 'destructive',
      });
      return;
    }
    setGallery((prev) => [...prev, file]);
  };

  const handleAddMultipleToGallery = (files: File[]) => {
    const remainingSlots = MAX_GALLERY_IMAGES - gallery.length;
    if (remainingSlots <= 0) {
      toast({
        title: t('addVehicle.media.toasts.limitReached.title'),
        description: t('addVehicle.media.toasts.limitReachedMax', {
          max: MAX_GALLERY_IMAGES,
        }),
        variant: 'destructive',
      });
      return;
    }

    const filesToAdd = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      toast({
        title: t('addVehicle.media.toasts.limitExceeded.title'),
        description: t('addVehicle.media.toasts.limitExceeded.description', {
          remaining: remainingSlots,
          selected: files.length,
        }),
      });
    }

    setGallery((prev) => [...prev, ...filesToAdd]);
  };

  const handleRemoveFromGallery = (index: number) => {
    setGallery((prev) => {
      const newGallery = [...prev];
      newGallery.splice(index, 1);
      return newGallery;
    });
  };

  const handleReorderGallery = (newOrder: (File | string)[]) => {
    setGallery(newOrder);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Imagen principal ahora es opcional - se puede continuar sin ella
      // if (!mainImage && !isEditMode) {
      //   toast({
      //     title: t('addVehicle.media.toasts.mainImageRequired.title'),
      //     description: t(
      //       'addVehicle.media.toasts.mainImageRequired.description'
      //     ),
      //     variant: 'destructive',
      //   });
      //   return;
      // }

      const mediaData: VehicleMedia = {
        mainImage,
        gallery,
        // enviar documentos con metadatos para que el servicio pueda guardarlos
        extraDocuments,
      };

      const success = await onSave(mediaData);

      if (success) {
        onNext(mediaData);
      } else {
        toast({
          title: t('actions.error'),
          description: t('addVehicle.media.toasts.saveError'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error during media submission:', error);
      toast({
        title: t('actions.error'),
        description: t('addVehicle.media.toasts.unexpectedError'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <TransactionsProvider vehicle={{}}>
      <div className='space-y-4 max-w-4xl mx-auto'>
        {/* Header compacto con mensaje inline */}
        <div className="hidden md:flex items-center justify-between gap-4 pb-1">
          <h2 className="text-base font-semibold text-slate-800">
            {t('addVehicle.media.title', { defaultValue: 'Multimedia' })}
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            {t('addVehicle.media.optionalTitle', { defaultValue: 'Paso opcional' })}
          </span>
        </div>

        {/* Grid: Imagen principal y Documentos */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {/* Imagen Principal */}
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {t('addVehicle.media.mainImage', { defaultValue: 'Imagen principal' })}
                </span>
                <span className="text-xs text-slate-400">(opcional)</span>
                <span className="text-xs text-slate-400">(4:3)</span>
              </div>
            </div>
            <div className="p-4">
              <ImageUpload
                value={mainImage}
                onChange={setMainImage}
                label={t('addVehicle.media.uploadMainImage', { defaultValue: 'Subir imagen' })}
                enableCrop={true}
                aspectRatio={4 / 3}
              />
            </div>
          </div>

          {/* Documentos */}
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {t('addVehicle.media.documentsTitle', { defaultValue: 'Documentos' })}
                </span>
                <span className="text-xs text-slate-400">(opcional)</span>
              </div>
            </div>
            <div className="p-4">
              <div
                onClick={() => setShowUploadModal(true)}
                className='w-full flex items-center justify-center gap-2 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 py-6'
              >
                <FileText className='w-5 h-5 text-slate-300' />
                <span className='text-sm text-slate-500'>
                  {t('addVehicle.media.addDocuments', { defaultValue: 'Agregar documentos' })}
                </span>
              </div>
              <DocumentUploadModal
                open={showUploadModal}
                onOpenChange={setShowUploadModal}
                vehicleId={null}
                mode='temporary'
                onTempDocumentsAdded={(files, title, description) => {
                  if (files) {
                    const docsArr = Array.from(files).map((file) => ({
                      file,
                      title,
                      description,
                    }));
                    setExtraDocuments(docsArr);
                  }
                }}
                onDocumentAdded={() => setShowUploadModal(false)}
              />
              {extraDocuments.length > 0 && (
                <div className='mt-3 space-y-1.5'>
                  <p className='text-xs font-medium text-gray-500'>
                    {t('addVehicle.media.selectedDocuments', { defaultValue: 'Documentos:' })}
                  </p>
                  <div className='space-y-1'>
                    {extraDocuments.map((doc, idx) => (
                      <div key={idx} className='flex items-center justify-between gap-2 px-2 py-1.5 bg-gray-50 rounded'>
                        <div className='flex items-center gap-2 min-w-0'>
                          <FileText className='w-3.5 h-3.5 text-gray-400 flex-shrink-0' />
                          <span className='text-xs text-gray-700 truncate'>
                            {typeof doc === 'string'
                              ? doc.split('/').pop()
                              : doc && typeof doc === 'object' && 'file' in doc
                              ? (doc as DocumentWithMetadata).file.name
                              : (doc as File).name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setExtraDocuments((prev) => prev.filter((_, i) => i !== idx))}
                          className='p-0.5 rounded hover:bg-gray-200 transition-colors'
                        >
                          <X className='w-3 h-3 text-gray-400' />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Galería */}
        <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {t('addVehicle.media.galleryTitle', { defaultValue: 'Galería de fotos' })}
                </span>
                <span className="text-xs text-slate-400">(opcional)</span>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100">
                <span className="text-xs font-medium text-slate-600">{gallery.length}</span>
                <span className="text-xs text-slate-400">/ {MAX_GALLERY_IMAGES}</span>
              </div>
            </div>
          </div>
          <div className="p-4">
            <ImageGalleryGrid
              images={gallery}
              onRemove={handleRemoveFromGallery}
              onAdd={handleAddToGallery}
              onAddMultiple={handleAddMultipleToGallery}
              onReorder={handleReorderGallery}
              maxImages={MAX_GALLERY_IMAGES}
            />
          </div>
        </div>

        {/* Acciones */}
        <div className='flex items-center justify-between gap-3 pt-3 border-t border-slate-100'>
          <Button
            type='button'
            variant='ghost'
            onClick={onPrevious}
            disabled={isSubmitting}
            className="gap-2 text-slate-600 hover:text-slate-900 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('buttons.previous', { defaultValue: 'Anterior' })}
          </Button>
          <Button
            type='button'
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-sky-400 hover:bg-sky-500 text-white shadow-sm rounded-xl"
          >
            {isSubmitting
              ? t('actions.saving', { defaultValue: 'Guardando...' })
              : submitButtonText || t('buttons.next', { defaultValue: 'Continuar' })}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </TransactionsProvider>
  );
};

export default VehicleMediaForm;
