import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download } from 'lucide-react';
import JSZip from 'jszip';

type DownloadButtonProps = {
  mainImage?: string;
  gallery?: string[];
  brandName?: string;
  modelName?: string;
  year?: number;
};

const DownloadButton = ({
  mainImage,
  gallery,
  brandName,
  modelName,
  year,
}: DownloadButtonProps) => {
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error al descargar la imagen:', error);
    }
  };

  const downloadAllImages = async () => {
    if (!mainImage && (!gallery || gallery.length === 0)) return;

    try {
      const zip = new JSZip();
      const images = mainImage
        ? [mainImage, ...(gallery || [])]
        : gallery || [];
      const folderName = `${brandName}-${modelName}-${year}`
        .replace(/\s+/g, '-')
        .toLowerCase();

      // Crear una carpeta en el ZIP
      const folder = zip.folder(folderName);

      if (!folder) {
        throw new Error('No se pudo crear la carpeta en el ZIP');
      }

      // Descargar y agregar cada imagen al ZIP
      for (let i = 0; i < images.length; i++) {
        const imageUrl = images[i];
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const filename = `imagen-${i + 1}.jpg`;
        folder.file(filename, blob);
      }

      // Generar y descargar el ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error al crear el archivo ZIP:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='secondary'
          size='icon'
          className='absolute top-2 right-2 z-10 bg-white/90 hover:bg-white'
        >
          <Download className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {mainImage && (
          <DropdownMenuItem
            onClick={() =>
              handleDownload(
                mainImage,
                `${brandName}-${modelName}-${year}-principal.jpg`
              )
            }
          >
            Descargar imagen principal
          </DropdownMenuItem>
        )}
        {gallery && gallery.length > 0 && (
          <DropdownMenuItem onClick={downloadAllImages}>
            Descargar todas las imágenes (ZIP)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default DownloadButton;
