import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/useI18n';
import FileUploadZone from './upload/FileUploadZone';
import FilePreview from './upload/FilePreview';
import { useExcelUpload } from './upload/useExcelUpload';

interface ExcelUploadDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const ExcelUploadDrawer = ({
  open,
  onClose,
}: ExcelUploadDrawerProps) => {
  const { tCommon } = useI18n();
  const {
    file,
    previewData,
    totalRecords,
    categorizedCount,
    loading,
    currentStep,
    handleFileChange,
    handleUpload,
    resetFile,
  } = useExcelUpload();

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className='h-[85vh]'>
        <DrawerHeader>
          <DrawerTitle className='font-semibold text-xl'>
            {tCommon('clients.bulk.title')}
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className='p-6 flex-1 overflow-y-auto'>
          {loading && currentStep ? (
            <div className='flex flex-col items-center justify-center h-full space-y-4'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <div className='text-center'>
                <h3 className='text-lg font-medium mb-2'>{currentStep}</h3>
                <p className='text-sm text-gray-600'>
                  {currentStep.includes('embeddings')
                    ? tCommon('clients.bulk.embeddingsNote')
                    : tCommon('clients.bulk.processing')}
                </p>
              </div>
            </div>
          ) : !file ? (
            <FileUploadZone onFileChange={handleFileChange} />
          ) : (
            <FilePreview
              file={file}
              previewData={previewData}
              totalRecords={totalRecords}
              categorizedCount={categorizedCount}
              onChangeFile={resetFile}
            />
          )}
        </ScrollArea>

        <DrawerFooter>
          <div className='flex justify-end space-x-4'>
            <Button variant='outline' onClick={onClose} disabled={loading}>
              {loading ? tCommon('actions.processing') : tCommon('buttons.cancel')}
            </Button>
            {file && !loading && (
              <Button onClick={handleUpload} disabled={loading}>
                {tCommon('clients.bulk.confirm')}
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
