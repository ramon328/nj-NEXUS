import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Bucket name for vehicle images
const BUCKET_NAME = 'vehicle-images';

/**
 * Uploads a single file to Supabase storage
 */
export const uploadImage = async (
  file: File,
  path: string
): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    console.log(`Uploading file to ${BUCKET_NAME}/${filePath}`);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Changed to true to prevent filename collisions
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    console.log('File uploaded successfully. Public URL:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
};

/**
 * Uploads multiple files to Supabase storage
 */
export const uploadGallery = async (files: File[]): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) => uploadImage(file, 'gallery'));
    const results = await Promise.all(uploadPromises);
    return results.filter((url): url is string => url !== null);
  } catch (error) {
    console.error('Error in uploadGallery:', error);
    return [];
  }
};

/**
 * Deletes a file from Supabase storage by its public URL.
 */
export const deleteImageByUrl = async (publicUrl: string): Promise<boolean> => {
  if (!publicUrl) return false;

  try {
    // Extract the file path from the public URL
    // Example URL: https://<project-ref>.supabase.co/storage/v1/object/public/vehicle-images/vehicles/gallery/image.jpg
    // We need: vehicles/gallery/image.jpg
    const urlParts = publicUrl.split('/');
    const bucketNameIndex = urlParts.indexOf(BUCKET_NAME);
    if (bucketNameIndex === -1 || bucketNameIndex + 1 >= urlParts.length) {
      console.error('Could not determine file path from URL:', publicUrl);
      return false;
    }
    const filePath = urlParts.slice(bucketNameIndex + 1).join('/');

    console.log(`Attempting to delete file from ${BUCKET_NAME}/${filePath}`);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      console.error('Error deleting file from storage:', error);
      // It might be an error if the file doesn't exist, which could be fine in some cases.
      // For now, we treat any error as a failure.
      return false;
    }

    console.log('File deleted successfully from storage:', filePath);
    return true;
  } catch (error) {
    console.error('Error in deleteImageByUrl:', error);
    return false;
  }
};
