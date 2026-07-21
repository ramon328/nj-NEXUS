import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  VehicleCreationData,
  VehicleAcquisition,
  VehicleMedia,
  VehicleDocument,
  VehicleSales,
} from '@/types/vehicleCreation';
import { Vehicle, VehicleType, VEHICLE_TYPE_HIDDEN_FIELDS } from '@/types/vehicle';
import { initialVehicleData } from '@/utils/vehicleDataUtils';
import { createVehicle, checkDuplicateVehicle } from '@/services/vehicleService';

export const useVehicleCreation = () => {
  const { user, clientId } = useAuth();
  const [vehicleData, setVehicleData] =
    useState<VehicleCreationData>(initialVehicleData);
  const [tempMedia, setTempMedia] = useState<VehicleMedia | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateBasicInfo = (basicInfo: Partial<Vehicle>) => {
    setVehicleData((prev) => {
      // If price is being updated and min_price is not set, update min_price with the same value
      if (basicInfo.price && !prev.sales.minPrice) {
        return {
          ...prev,
          basicInfo: { ...prev.basicInfo, ...basicInfo },
          sales: { ...prev.sales, minPrice: basicInfo.price },
        };
      }
      return { ...prev, basicInfo: { ...prev.basicInfo, ...basicInfo } };
    });
    return true;
  };

  const updateMedia = (media: VehicleMedia) => {
    // Store the media data in the vehicleData state
    setVehicleData((prev) => ({ ...prev, media: { ...prev.media, ...media } }));
    console.log('Media updated:', media);
    return true;
  };

  const updateAcquisition = (acquisition: VehicleAcquisition) => {
    setVehicleData((prev) => ({
      ...prev,
      acquisition: { ...prev.acquisition, ...acquisition },
    }));
    return true;
  };

  const updateSales = (sales: VehicleSales) => {
    setVehicleData((prev) => ({ ...prev, sales: { ...prev.sales, ...sales } }));
    return true;
  };

  const updateDocuments = (documents: VehicleDocument[]) => {
    setVehicleData((prev) => ({ ...prev, documents }));
    return true;
  };

  const validateRequiredFields = () => {
    const { basicInfo, acquisition, sales } = vehicleData;
    const vType = ((basicInfo as any).vehicle_type || 'car') as VehicleType;
    const hiddenFields = VEHICLE_TYPE_HIDDEN_FIELDS[vType] || [];
    const isRequired = (field: string) => !hiddenFields.includes(field);

    const requiredErrors = [];

    // Basic info validations - skip hidden fields based on vehicle type
    if (isRequired('license_plate') && !basicInfo.license_plate)
      requiredErrors.push('La patente del vehículo es requerida');
    if (!basicInfo.brand_id)
      requiredErrors.push('La marca del vehículo es requerida');
    if (!basicInfo.model_id)
      requiredErrors.push('El modelo del vehículo es requerido');
    if (!basicInfo.year)
      requiredErrors.push('El año del vehículo es requerido');
    if (!basicInfo.mileage)
      requiredErrors.push('El kilometraje del vehículo es requerido');
    if (isRequired('transmission') && !basicInfo.transmission)
      requiredErrors.push('La transmisión del vehículo es requerida');
    if (!basicInfo.category_id)
      requiredErrors.push('La categoría del vehículo es requerida');

    // Sales/pricing validations - check both sales and basicInfo for backwards compatibility
    const price = sales?.price ?? basicInfo.price;
    const statusId = sales?.statusId ?? basicInfo.status_id;

    if (!price)
      requiredErrors.push('El precio del vehículo es requerido');
    if (!statusId)
      requiredErrors.push('El estado del vehículo es requerido');

    // Acquisition validations
    if (acquisition.isConsigned) {
      if (!acquisition.consignmentCustomerId)
        requiredErrors.push('El cliente de consignación es requerido');
      if (!acquisition.consignmentAgreedPrice)
        requiredErrors.push('El precio acordado de consignación es requerido');
    } else {
      if (!acquisition.purchasePrice)
        requiredErrors.push('El precio de compra es requerido');
    }

    return requiredErrors;
  };

  const saveVehicle = async (): Promise<number | null> => {
    if (!user) {
      throw new Error(
        'No se pudo identificar el usuario. Por favor inicie sesión nuevamente.'
      );
    }

    if (!clientId) {
      throw new Error(
        'No se pudo identificar el cliente. Por favor contacte al administrador.'
      );
    }

    setIsLoading(true);

    try {
      const validationErrors = validateRequiredFields();

      if (validationErrors.length > 0) {
        throw new Error(
          `Por favor complete los siguientes campos: ${validationErrors.join(
            ', '
          )}`
        );
      }

      // Bloqueo final: si la patente ya existe para este cliente, abortar.
      // El check visual en BasicInfoSection es solo warning; sin este chequeo
      // el usuario podía crear el mismo vehículo dos veces y dejar el segundo
      // huérfano (sin consignment_id, sin compra), apareciendo como
      // "consignado fantasma" en el listado.
      // Excepción: si todas las coincidencias están Vendidas es una recompra
      // (el auto se vendió y volvió a entrar) y se permite crear la unidad
      // nueva; revivir el vehículo vendido no es opción porque su venta es
      // historial real y vehicles_sales solo admite una venta por vehículo.
      const plate = vehicleData.basicInfo.license_plate?.trim();
      if (plate) {
        const duplicate = await checkDuplicateVehicle(plate, clientId);
        if (duplicate && !duplicate.sold_only) {
          throw new Error(
            `Ya existe un vehículo con la patente ${plate} en tu inventario. Edita el existente en lugar de crear uno nuevo.`
          );
        }
      }

      // If we have temporary media data that hasn't been committed to vehicleData yet, update it now
      if (tempMedia) {
        updateMedia(tempMedia);
      }

      console.log('Saving vehicle with data:', vehicleData);
      console.log('Media being saved:', vehicleData.media);

      return await createVehicle(vehicleData, { ...user, clientId });
    } catch (error) {
      console.error('Error in saveVehicle:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    vehicleData,
    tempMedia,
    setTempMedia,
    updateBasicInfo,
    updateMedia,
    updateAcquisition,
    updateSales,
    updateDocuments,
    saveVehicle,
    isLoading,
  };
};
