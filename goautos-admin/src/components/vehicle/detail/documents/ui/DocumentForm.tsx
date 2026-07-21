
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DropZone from './DropZone';

interface DocumentFormProps {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  files: FileList | null;
  setFiles: (files: FileList | null) => void;
}

const DocumentForm = ({ 
  title, 
  setTitle, 
  description, 
  setDescription, 
  files, 
  setFiles 
}: DocumentFormProps) => {
  const { t } = useTranslation('vehicleDocuments');
  return (
    <div className="space-y-6">
      <div>
        <Input
          placeholder={t('upload.form.title.placeholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-muted/50"
        />
        <div className="text-xs text-muted-foreground mt-1">
          {t('upload.form.title.hint')}
        </div>
      </div>
      
      <div>
        <Textarea
          placeholder={t('upload.form.description.placeholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[120px] bg-muted/50"
        />
        <div className="text-xs text-muted-foreground mt-1">
          {t('upload.form.description.hint')}
        </div>
      </div>
      
      <DropZone 
        files={files}
        onChange={setFiles}
        maxFiles={3}
      />
    </div>
  );
};

export default DocumentForm;
