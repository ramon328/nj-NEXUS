import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Image as ImageIcon } from 'lucide-react';
import ImageCropModal from './ImageCropModal';

interface ImageUploadProps {
  value: File | string | null;
  onChange: (value: File | null) => void;
  onMultipleChange?: (files: File[]) => void;
  label?: string | React.ReactNode;
  className?: string;
  multiple?: boolean;
  enableCrop?: boolean; // Nueva prop para habilitar el recorte
  aspectRatio?: number; // Nueva prop para el aspect ratio deseado
}

const ImageUpload = ({
  value,
  onChange,
  onMultipleChange,
  label = 'Subir imagen',
  className = '',
  multiple = false,
  enableCrop = false,
  aspectRatio = 16 / 9,
}: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [tempImageFile, setTempImageFile] = useState<File | null>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      multiple &&
      onMultipleChange &&
      e.target.files &&
      e.target.files.length > 0
    ) {
      const filesArray = Array.from(e.target.files);
      onMultipleChange(filesArray);
    } else {
      const file = e.target.files?.[0] || null;

      if (file && enableCrop) {
        // Siempre mostrar el modal de recorte para mantener consistencia
        setTempImageFile(file);
        setShowCropModal(true);
      } else if (file) {
        onChange(file);
      }
    }

    if (e.target.value) e.target.value = '';
  };

  const handleRemove = () => {
    onChange(null);
  };

  const handleCropComplete = (croppedFile: File) => {
    onChange(croppedFile);
    setTempImageFile(null);
  };

  const imageUrl = value
    ? typeof value === 'string'
      ? value
      : URL.createObjectURL(value)
    : null;

  return (
    <>
      <div className={`relative ${className}`}>
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          multiple={multiple}
          className='hidden'
          onChange={handleChange}
        />

        {imageUrl ? (
          <div className='relative'>
            <img
              src={imageUrl}
              alt='Uploaded'
              className='w-full h-60 object-cover rounded-md'
            />
            <Button
              type='button'
              variant='destructive'
              size='icon'
              className='absolute top-2 right-2 h-8 w-8'
              onClick={handleRemove}
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        ) : (
          <div
            onClick={handleClick}
            className='w-full h-full flex items-center justify-center gap-2 border border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all duration-150 py-6'
          >
            <ImageIcon className='w-5 h-5 text-slate-300' />
            <span className='text-sm text-slate-500'>{label}</span>
          </div>
        )}
      </div>

      {/* Modal de recorte */}
      <ImageCropModal
        open={showCropModal}
        onOpenChange={setShowCropModal}
        imageFile={tempImageFile}
        onCropComplete={handleCropComplete}
        aspectRatio={aspectRatio}
      />
    </>
  );
};

export default ImageUpload;
