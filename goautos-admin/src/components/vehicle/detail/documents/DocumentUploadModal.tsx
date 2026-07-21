import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Drawer,
  DrawerContentRight,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import DocumentForm from './ui/DocumentForm';
import { useDocumentUpload } from './hooks/useDocumentUpload';

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: number | null;
  onDocumentAdded: () => void;
  mode?: 'immediate' | 'temporary';
  onTempDocumentsAdded?: (
    files: FileList | null,
    title: string,
    description: string
  ) => void;
}

const DocumentUploadModal = ({
  open,
  onOpenChange,
  vehicleId,
  onDocumentAdded,
  mode = 'immediate',
  onTempDocumentsAdded,
}: DocumentUploadModalProps) => {
  const { t } = useTranslation('vehicleDocuments');
  const {
    title,
    setTitle,
    description,
    setDescription,
    files,
    setFiles,
    isUploading,
    handleSubmit,
  } = useDocumentUpload(vehicleId ?? 0, () => {
    onOpenChange(false);
    onDocumentAdded();
  });

  const handleAdd = () => {
    if (mode === 'temporary') {
      onTempDocumentsAdded?.(files, title, description);
      onOpenChange(false);
    } else {
      handleSubmit();
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContentRight className="md:min-w-[480px]">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 shrink-0">
            <DrawerTitle className="text-[16px] font-semibold text-slate-900">
              {t('upload.title')}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {t('upload.title')}
            </DrawerDescription>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
            <DocumentForm
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              files={files}
              setFiles={setFiles}
            />
          </div>

          {/* Footer */}
          <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0 flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl"
            >
              {t('common:buttons.cancel')}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={isUploading && mode === 'immediate'}
              className="flex-1 rounded-xl"
            >
              {isUploading && mode === 'immediate'
                ? t('upload.adding')
                : t('common:buttons.add')}
            </Button>
          </div>
        </div>
      </DrawerContentRight>
    </Drawer>
  );
};

export default DocumentUploadModal;
