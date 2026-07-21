import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { VehicleDocument } from '@/types/vehicleCreation';

interface DocumentsCardProps {
  documents: VehicleDocument[];
}

const DocumentsCard = ({ documents }: DocumentsCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos Adicionales</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc, index) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium">
                    {doc.type === 'purchase' && 'Contrato de Compra'}
                    {doc.type === 'consignment' && 'Contrato de Consignación'}
                    {doc.type === 'other' && 'Otro'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Estado: {doc.status === 'pending' ? 'Pendiente' : 'Completado'}
                  </div>
                  {doc.notes && (
                    <div className="text-xs mt-1">{doc.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No hay documentos adicionales.</div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentsCard;
