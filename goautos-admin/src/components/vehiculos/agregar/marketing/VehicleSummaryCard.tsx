
import React from 'react';
import { Card } from '@/components/ui/card';

interface VehicleSummaryCardProps {
  brandName: string;
  modelName: string;
  formattedPrice: string;
}

const VehicleSummaryCard = ({ brandName, modelName, formattedPrice }: VehicleSummaryCardProps) => {
  return (
    <Card className="p-6 bg-muted/50">
      <h3 className="font-medium mb-2">Vehículo seleccionado:</h3>
      <div className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Marca:</span>
          <span className="font-medium">{brandName || 'Cargando...'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Modelo:</span>
          <span className="font-medium">{modelName || 'Cargando...'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Precio:</span>
          <span className="font-medium">{formattedPrice}</span>
        </div>
      </div>
    </Card>
  );
};

export default VehicleSummaryCard;
