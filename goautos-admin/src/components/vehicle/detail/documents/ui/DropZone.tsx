import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

interface DropZoneProps {
  files: FileList | null;
  onChange: (files: FileList | null) => void;
  maxFiles?: number;
}

const DropZone = ({ files, onChange, maxFiles = 1 }: DropZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useTranslation('vehicleDocuments');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length > maxFiles) {
        toast({
          title: t('upload.form.drop.maxFilesTitle', { max: maxFiles }),
          description: t('upload.form.drop.maxFilesDescription', { max: maxFiles }),
          variant: 'destructive',
        });
        return;
      }
      onChange(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > maxFiles) {
        toast({
          title: t('upload.form.drop.maxFilesTitle', { max: maxFiles }),
          description: t('upload.form.drop.maxFilesDescription', { max: maxFiles }),
          variant: 'destructive',
        });
        return;
      }
      onChange(e.dataTransfer.files);
    }
  };

  return (
    <div
      className={`border border-dashed rounded-md p-10 text-center ${
        isDragging ? 'border-primary bg-primary/10' : 'border-muted'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type='file'
        id='document-upload'
        className='hidden'
        onChange={handleFileChange}
        accept='.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
      />

      <div className='flex flex-col items-center'>
        <div className='w-16 h-16 mb-4 text-muted-foreground flex items-center justify-center'>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='48'
            height='48'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' />
            <polyline points='14 2 14 8 20 8' />
            <line x1='16' y1='13' x2='8' y2='13' />
            <line x1='16' y1='17' x2='8' y2='17' />
            <line x1='10' y1='9' x2='8' y2='9' />
          </svg>
        </div>

        <Button
          type='button'
          variant='outline'
          className='mb-2'
          onClick={() => document.getElementById('document-upload')?.click()}
        >
          <Upload className='h-4 w-4 mr-2' />
          {t('upload.form.drop.selectButton')}
        </Button>

        <p className='text-sm text-muted-foreground'>
          {t('upload.form.drop.hint', { max: maxFiles })}
        </p>

        {files && files.length > 0 && (
          <div className='mt-4 text-left w-full'>
            <p className='text-sm font-medium mb-2'>{t('upload.form.drop.selectedHeader')}</p>
            <ul className='text-sm text-muted-foreground space-y-1'>
              {Array.from(files)
                .slice(0, 1)
                .map((file, index) => (
                  <li key={index} className='flex items-center'>
                    <svg
                      xmlns='http://www.w3.org/2000/svg'
                      className='h-4 w-4 mr-2'
                      fill='none'
                      viewBox='0 0 24 24'
                      stroke='currentColor'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                      />
                    </svg>
                    {file.name}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default DropZone;
