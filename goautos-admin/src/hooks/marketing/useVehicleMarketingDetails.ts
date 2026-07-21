
import { useState, useEffect } from 'react';
import { fetchCustomersData } from './utils/customerUtils';

export const useVehicleMarketingDetails = (basicInfo?: {
  brand_id?: string | number;
  model_id?: string | number;
  price?: string | number;
}) => {
  const [brandName, setBrandName] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [formattedPrice, setFormattedPrice] = useState<string>('');

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      if (!basicInfo?.brand_id || !basicInfo?.model_id || !basicInfo?.price) {
        console.log('Missing vehicle details for marketing form', basicInfo);
        return;
      }

      try {
        const { brandName: fetchedBrand, modelName: fetchedModel, priceNum } = 
          await fetchCustomersData(basicInfo.brand_id, basicInfo.model_id, basicInfo.price);

        setBrandName(fetchedBrand || '');
        setModelName(fetchedModel || '');
        setFormattedPrice(new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP'
        }).format(priceNum));
        
      } catch (error) {
        console.error('Error in useVehicleMarketingDetails:', error);
      }
    };

    fetchVehicleDetails();
  }, [basicInfo]);

  return { brandName, modelName, formattedPrice };
};
