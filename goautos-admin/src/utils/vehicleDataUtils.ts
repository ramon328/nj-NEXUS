import { VehicleCreationData, VehicleMedia } from '@/types/vehicleCreation';
import { uploadImage, uploadGallery } from './fileUploadUtils';
import Compressor from 'compressorjs';

/**
 * Processes the media data and uploads files if needed
 */
export const processVehicleMedia = async (
  media: VehicleMedia
): Promise<{
  mainImageUrl: string | null;
  galleryUrls: string[];
}> => {
  try {
    const compressionOptions = {
      quality: 0.6,
      maxWidth: 1600,
      maxHeight: 900,
    };

    const convertBlobToFile = (blob: Blob, originalFile: File): File => {
      return new File([blob], originalFile.name, {
        type: blob.type,
        lastModified: originalFile.lastModified,
      });
    };

    // Process main image
    let mainImageUrl = null;
    if (media.mainImage) {
      if (media.mainImage instanceof File) {
        try {
          const originalMainImageFile = media.mainImage;
          const compressedResult = await new Promise<File | Blob>(
            (resolve, reject) => {
              new Compressor(originalMainImageFile, {
                ...compressionOptions,
                success: resolve,
                error: reject,
              });
            }
          );
          const fileToUpload =
            compressedResult instanceof File
              ? compressedResult
              : convertBlobToFile(compressedResult, originalMainImageFile);
          mainImageUrl = await uploadImage(fileToUpload, 'main');
          if (!mainImageUrl) {
            // It already throws in uploadImage, but good to be explicit or handle differently if needed
            throw new Error('Failed to upload main image after compression');
          }
        } catch (error) {
          console.error('Error compressing or uploading main image:', error);
          // Decide fallback: upload original, or rethrow, or set mainImageUrl to null
          // For now, rethrowing to indicate failure in media processing
          throw new Error(
            `Failed to process main image: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } else if (typeof media.mainImage === 'string') {
        mainImageUrl = media.mainImage;
      }
    }

    // Process gallery images
    let galleryUrls: string[] = [];
    if (media.gallery && media.gallery.length > 0) {
      const filesToCompressPromises = media.gallery
        .filter((item): item is File => item instanceof File)
        .map(async (file) => {
          try {
            const compressedResult = await new Promise<File | Blob>(
              (resolve, reject) => {
                new Compressor(file, {
                  ...compressionOptions,
                  success: resolve,
                  error: reject,
                });
              }
            );
            return compressedResult instanceof File
              ? compressedResult
              : convertBlobToFile(compressedResult, file);
          } catch (error) {
            console.error(
              `Error compressing gallery image ${file.name}:`,
              error
            );
            return null; // Or original file as fallback: return file;
          }
        });

      const compressedFiles = (
        await Promise.all(filesToCompressPromises)
      ).filter((f): f is File => f !== null);
      const existingUrls = media.gallery.filter(
        (item): item is string => typeof item === 'string'
      );

      if (compressedFiles.length > 0) {
        const uploadedUrls = await uploadGallery(compressedFiles);
        if (uploadedUrls.length !== compressedFiles.length) {
          console.warn(
            `Not all gallery images were uploaded successfully. Expected: ${compressedFiles.length}, Uploaded: ${uploadedUrls.length}`
          );
        }
        galleryUrls = [...existingUrls, ...uploadedUrls];
      } else {
        galleryUrls = existingUrls;
      }
    }

    return { mainImageUrl, galleryUrls };
  } catch (error) {
    console.error('Error in processVehicleMedia:', error);
    throw new Error(
      `Failed to process vehicle media: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Initial vehicle data state
 */
export const initialVehicleData: VehicleCreationData = {
  basicInfo: {},
  media: {
    mainImage: null,
    gallery: [],
  },
  acquisition: {
    isConsigned: false,
    documentType: 'purchase',
  },
  documents: [],
  sales: {
    sellerId: null,
    minPrice: null,
  },
};
