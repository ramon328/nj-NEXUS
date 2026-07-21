import { VehicleMedia } from '@/types/vehicleCreation';
import { ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MediaCardProps {
  media: VehicleMedia;
}

const MediaCard = ({ media }: MediaCardProps) => {
  const { t } = useTranslation('common');

  const mainImagePreview = media.mainImage
    ? typeof media.mainImage === 'string'
      ? media.mainImage
      : URL.createObjectURL(media.mainImage)
    : null;

  const gallery = media.gallery || [];
  const galleryCount = gallery.length;

  const previewImages = gallery.slice(0, 4);
  const remainingCount = galleryCount - 4;

  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-slate-700">
            {t('addVehicle.media.title', { defaultValue: 'Multimedia' })}
          </h3>
          {galleryCount > 0 && (
            <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {galleryCount} {galleryCount === 1 ? 'foto' : 'fotos'}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Main image */}
        <div className="mb-3">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Imagen principal</p>
          {mainImagePreview ? (
            <div className="w-full h-32 bg-slate-100 rounded-lg overflow-hidden">
              <img
                src={mainImagePreview}
                alt="Imagen principal"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-32 bg-slate-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-400">Sin imagen</p>
              </div>
            </div>
          )}
        </div>

        {/* Gallery preview */}
        {galleryCount > 0 && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-2">Galería</p>
            <div className="grid grid-cols-4 gap-1.5">
              {previewImages.map((image, index) => (
                <div
                  key={index}
                  className="aspect-square bg-slate-100 rounded overflow-hidden relative"
                >
                  <img
                    src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                    alt={`Galería ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {index === 3 && remainingCount > 0 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">
                        +{remainingCount}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No photos message */}
        {galleryCount === 0 && !mainImagePreview && (
          <div className="text-center py-4">
            <ImageIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              {t('addVehicle.media.noImages', { defaultValue: 'No se agregaron fotos' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaCard;
