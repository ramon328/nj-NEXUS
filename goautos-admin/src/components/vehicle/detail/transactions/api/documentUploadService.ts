
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads documents to Supabase storage and returns the public URLs
 */
export const uploadVehicleDocuments = async (
  vehicleId: number, 
  files: FileList | null
): Promise<string[]> => {
  if (!files || files.length === 0) return [];

  const uploadedUrls: string[] = [];

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${vehicleId}/${uuidv4()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('vehicle-documents')
        .upload(fileName, file);
        
      if (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Error al subir archivo',
          description: `No se pudo subir ${file.name}`,
          variant: 'destructive',
        });
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('vehicle-documents')
        .getPublicUrl(fileName);
        
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  } catch (error) {
    console.error('Error uploading documents:', error);
    toast({
      title: 'Error',
      description: 'No se pudieron subir algunos documentos',
      variant: 'destructive',
    });
    return uploadedUrls;
  }
};
