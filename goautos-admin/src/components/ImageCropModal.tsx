import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Crop as CropIcon } from 'lucide-react';

interface ImageCropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  onCropComplete: (croppedFile: File) => void;
  aspectRatio?: number; // Por defecto 16:9 para formato horizontal
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  open,
  onOpenChange,
  imageFile,
  onCropComplete,
  aspectRatio = 16 / 9,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Cargar la imagen cuando se abre el modal
  React.useEffect(() => {
    if (imageFile && open) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile, open]);

  // Función para centrar el crop inicial
  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const crop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          aspectRatio,
          width,
          height
        ),
        width,
        height
      );
      setCrop(crop);
    },
    [aspectRatio]
  );

  // Función para aplicar el recorte
  const applyCrop = async () => {
    if (!imgRef.current || !completedCrop) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    // Convertir canvas a File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const croppedFile = new File(
            [blob],
            imageFile?.name || 'cropped-image.jpg',
            {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }
          );
          onCropComplete(croppedFile);
          onOpenChange(false);
        }
      },
      'image/jpeg',
      0.9
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-hidden'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <CropIcon className='h-5 w-5' />
            Recortar Imagen Principal
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Área de recorte. Sin overflow-auto (evita scroll/arrastre dentro del
              modal) y con la imagen acotada por altura de viewport para que quepa
              completa: antes maxHeight:'100%' contra un padre sin altura no
              limitaba nada y forzaba scroll. */}
          <div className='flex justify-center'>
            <div className='flex max-w-full items-center justify-center overflow-hidden rounded-lg border'>
              {imageSrc && (
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspectRatio}
                  minWidth={100}
                  minHeight={100}
                  keepSelection
                >
                  <img
                    ref={imgRef}
                    alt='Crop me'
                    src={imageSrc}
                    style={{
                      display: 'block',
                      maxWidth: '100%',
                      maxHeight: '62vh',
                      objectFit: 'contain',
                    }}
                    onLoad={onImageLoad}
                  />
                </ReactCrop>
              )}
            </div>
          </div>

          {/* Información y botones */}
          <div className='text-center space-y-2'>
            <p className='text-sm text-muted-foreground'>
              Ajusta el área de recorte para que la imagen se vea horizontal. El
              formato recomendado es 4:3.
            </p>
            <div className='flex justify-center gap-2'>
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={applyCrop} disabled={!completedCrop}>
                Aplicar Recorte
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropModal;
