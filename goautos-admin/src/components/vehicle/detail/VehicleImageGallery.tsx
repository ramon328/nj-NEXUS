import { useState, useMemo } from 'react';
import DownloadButton from './DownloadButton';
import ThumbRow from './ThumbRow';
import VehicleImagesModal from './VehicleImagesModal';

type VehicleImageGalleryProps = {
  mainImage?: string;
  gallery?: string[];
  brandName?: string;
  modelName?: string;
  year?: number;
};

const VehicleImageGallery = ({
  mainImage,
  gallery,
  brandName,
  modelName,
  year,
}: VehicleImageGalleryProps) => {
  // Combinar imagen principal con galería
  const images = useMemo(
    () => (mainImage ? [mainImage, ...(gallery || [])].filter(Boolean) : []),
    [mainImage, gallery]
  );

  // Estado del modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentModalImage, setCurrentModalImage] = useState<string>('');

  const handleImageClick = (img?: string) => {
    setCurrentModalImage(img || images[0]);
    setIsModalOpen(true);
  };

  if (!mainImage) return null;

  const singleImage = images.length <= 1;

  return (
    <div className={singleImage ? 'h-full' : ''}>
      <div className={`rounded-2xl overflow-hidden border border-slate-200/60 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] flex items-center justify-center relative ${singleImage ? 'h-full min-h-[220px]' : 'h-[220px] sm:h-[280px] md:h-[320px]'}`}>
        <img
          src={mainImage}
          alt={`${brandName} ${modelName}`}
          className='h-full w-full object-cover cursor-pointer'
          onClick={() => handleImageClick(mainImage)}
        />
        <DownloadButton
          mainImage={mainImage}
          gallery={gallery}
          brandName={brandName}
          modelName={modelName}
          year={year}
        />
      </div>

      {/* Fila de miniaturas responsive */}
      {images.length > 1 && (
        <div className='mt-3'>
          <ThumbRow
            images={images}
            onOpenModal={handleImageClick}
            gap={12}
            aspect={10 / 7}
            minThumb={92}
            maxThumb={148}
            maxCols={6}
          />
        </div>
      )}

      {/* Modal de imágenes */}
      <VehicleImagesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentImage={currentModalImage || images[0] || ''}
        images={images}
        onImageChange={setCurrentModalImage}
      />
    </div>
  );
};

export default VehicleImageGallery;
