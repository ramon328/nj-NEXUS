import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a file to Supabase Storage and returns its public URL.
 *
 * @param file The file to upload.
 * @param bucket The name of the storage bucket.
 * @param pathPrefix Optional prefix for the file path within the bucket (e.g., 'logos/').
 * @returns The public URL of the uploaded file.
 * @throws If the upload fails.
 */
export const uploadFile = async (
  file: File,
  bucket: string,
  pathPrefix: string = ''
): Promise<string> => {
  const fileExtension = file.name.split('.').pop();
  const uniqueFileName = `${uuidv4()}.${fileExtension}`;
  const filePath = `${pathPrefix}${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // Don't overwrite existing files (though unlikely with UUID)
    });

  if (uploadError) {
    console.error('Supabase Storage upload error:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  if (!data?.publicUrl) {
    console.error('Supabase Storage getPublicUrl error: No publicUrl found');
    throw new Error('Failed to get public URL for the uploaded file.');
  }

  return data.publicUrl;
};
