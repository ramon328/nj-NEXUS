import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { optimizeAndUploadBuilderImage } from '@/utils/builderImageUpload';

interface ImageSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
  value,
  onChange,
  label = 'Seleccionar Imagen',
  placeholder = 'Arrastra una imagen aquí o haz clic para seleccionar',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file || !file.type.startsWith('image/')) return;
      // Vista previa local inmediata mientras se optimiza y sube.
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      setIsUploading(true);
      try {
        // Optimiza (redimensiona + WebP) y sube a Storage; guarda la URL, no base64.
        const url = await optimizeAndUploadBuilderImage(file);
        setPreview(url);
        onChange(url);
      } catch (err) {
        console.error('Error al subir la imagen:', err);
        setPreview(value || null);
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(localPreview);
      }
    },
    [onChange, value]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value;
      onChange(url);
      if (url) {
        setPreview(url);
      }
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setPreview(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onChange]);

  const handleSelectFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className='space-y-3'>
      {/* Drag & Drop Zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400',
          preview && 'border-green-500 bg-green-50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelectFile}
      >
        <input
          ref={fileInputRef}
          type='file'
          accept='image/*'
          onChange={handleFileInputChange}
          className='hidden'
        />

        {preview ? (
          <div className='space-y-3'>
            <div className='relative inline-block'>
              <img
                src={preview}
                alt='Preview'
                className='max-w-full max-h-32 rounded-md object-cover'
                onError={() => setPreview(null)}
              />
              {isUploading && (
                <div className='absolute inset-0 flex items-center justify-center rounded-md bg-black/40'>
                  <Loader2 className='h-6 w-6 animate-spin text-white' />
                </div>
              )}
              <Button
                type='button'
                variant='destructive'
                size='sm'
                className='absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full'
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              >
                <X size={12} />
              </Button>
            </div>
            <p className='text-sm text-gray-600'>
              {isUploading ? 'Optimizando y subiendo…' : 'Imagen seleccionada ✓'}
            </p>
          </div>
        ) : (
          <div className='space-y-2'>
            <Upload className='mx-auto h-8 w-8 text-gray-400' />
            <p className='text-sm text-gray-600'>{placeholder}</p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={(e) => {
                e.stopPropagation();
                handleSelectFile();
              }}
            >
              <ImageIcon className='h-4 w-4 mr-2' />
              Seleccionar archivo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
