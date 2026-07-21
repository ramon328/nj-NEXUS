
import React from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadZoneProps {
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const FileUploadZone = ({ onFileChange }: FileUploadZoneProps) => {
  return (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-12">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="bg-gray-50 rounded-full p-4">
          <FileSpreadsheet className="h-8 w-8 text-gray-400" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="font-medium text-gray-900">
            Selecciona un archivo Excel
          </h3>
          <p className="text-sm text-gray-500">
            Formato permitido: .xlsx
          </p>
        </div>
        <Button asChild>
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={onFileChange}
            />
            <Upload className="h-4 w-4 mr-2" />
            Seleccionar Archivo
          </label>
        </Button>
      </div>
    </div>
  );
};

export default FileUploadZone;
