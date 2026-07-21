import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LuTrash2,
  LuEye,
  LuUpload,
  LuFile,
} from 'react-icons/lu';
import { ExtraPageConfig, ExtraPageFile } from '@/types/document-template';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ExtraPageEditorProps {
  config: ExtraPageConfig;
  onChange: (config: ExtraPageConfig) => void;
  templateType: string;
}

const ExtraPageEditor: React.FC<ExtraPageEditorProps> = ({
  config,
  onChange,
  templateType,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { clientId } = useAuth();

  const BUCKET_NAME = 'vehicle-images';
  const DOCUMENTS_PATH = 'documents/extra-pages';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadedFiles: ExtraPageFile[] = [];

      for (const file of Array.from(files)) {
        const fileType = file.type;
        const isPdf = fileType === 'application/pdf';
        const isWord = fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                       fileType === 'application/msword';

        if (!isPdf && !isWord) {
          toast({
            title: 'Tipo de archivo no válido',
            description: `El archivo "${file.name}" no es un PDF o Word`,
            variant: 'destructive',
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `${DOCUMENTS_PATH}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          toast({
            title: 'Error al subir archivo',
            description: `No se pudo subir "${file.name}"`,
            variant: 'destructive',
          });
          continue;
        }

        const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

        uploadedFiles.push({
          id: uuidv4(),
          name: file.name,
          url: data.publicUrl,
          type: isPdf ? 'pdf' : 'word',
          uploadedAt: new Date().toISOString(),
        });
      }

      if (uploadedFiles.length > 0) {
        const newConfig: ExtraPageConfig = {
          enabled: true,
          files: [...(config.files || []), ...uploadedFiles],
        };

        console.log('New config after upload:', JSON.stringify(newConfig));

        // Update local state (will be saved when user clicks Save)
        onChange(newConfig);

        toast({
          title: 'Archivos subidos',
          description: `Se subieron ${uploadedFiles.length} archivo(s) correctamente. No olvides hacer clic en "Guardar cambios"`,
        });
      }
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al subir los archivos',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const deleteFile = async (file: ExtraPageFile) => {
    try {
      // Delete from storage
      const urlParts = file.url.split('/');
      const bucketNameIndex = urlParts.indexOf(BUCKET_NAME);
      if (bucketNameIndex !== -1 && bucketNameIndex + 1 < urlParts.length) {
        const filePath = urlParts.slice(bucketNameIndex + 1).join('/');
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
      }

      const remainingFiles = (config.files || []).filter((f) => f.id !== file.id);

      const newConfig: ExtraPageConfig = {
        enabled: remainingFiles.length > 0, // Auto disable if no files
        files: remainingFiles,
      };

      console.log('New config after delete:', JSON.stringify(newConfig));

      // Update local state (will be saved when user clicks Save)
      onChange(newConfig);

      toast({
        title: 'Archivo eliminado',
        description: 'El archivo se eliminó. No olvides hacer clic en "Guardar cambios"',
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el archivo',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="border-2 border-blue-300 bg-blue-50/30">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Hojas Extras (PDF/Word)</h3>
              <p className="text-sm text-gray-600 mt-1">
                Sube documentos PDF o Word que se agregarán como páginas extras al final de la nota de venta
              </p>
            </div>
          </div>

          {/* Upload section */}
          <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-medium">Archivos</h4>
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      multiple
                      onChange={handleFileUpload}
                      disabled={isUploading}
                    />
                    <Button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      size="sm"
                      className="gap-2"
                      disabled={isUploading}
                    >
                      <LuUpload className="h-4 w-4" />
                      {isUploading ? 'Subiendo...' : 'Subir Archivos'}
                    </Button>
                  </div>
                </div>

                {(!config.files || config.files.length === 0) && (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                    <LuFile className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium mb-1">
                      No hay archivos subidos
                    </p>
                    <p className="text-sm text-gray-500">
                      Los archivos aparecerán como páginas extras en la nota de venta
                    </p>
                  </div>
                )}

                {config.files && config.files.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 bg-white p-4 rounded-lg border">
                    {config.files.map((file) => (
                      <Card key={file.id} className="bg-gray-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className={`p-2 rounded-lg ${
                                file.type === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
                              }`}>
                                <LuFile className={`h-5 w-5 ${
                                  file.type === 'pdf' ? 'text-red-600' : 'text-blue-600'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {file.type === 'pdf' ? 'PDF' : 'Word'} • {new Date(file.uploadedAt).toLocaleDateString('es-ES')}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(file.url, '_blank')}
                              >
                                <LuEye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteFile(file)}
                              >
                                <LuTrash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Los archivos PDF/Word se mostrarán como páginas adicionales al final de cada nota de venta. Los PDFs se visualizarán embebidos y los documentos Word se podrán descargar.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExtraPageEditor;
