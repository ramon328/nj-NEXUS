
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
        // Fetch brand name
        const brandIdStr = typeof basicInfo.brand_id === 'number' 
          ? basicInfo.brand_id.toString() 
          : basicInfo.brand_id;
        
        const { data: brandData, error: brandError } = await supabase
          .from('brands')
          .select('name')
          .eq('id', brandIdStr)
          .single();

        if (brandError || !brandData) {
          console.error('Error fetching brand:', brandError);
          return;
        }

        // Fetch model name
        const modelIdNum = typeof basicInfo.model_id === 'string'
          ? parseInt(basicInfo.model_id, 10)
          : basicInfo.model_id;
        
        const { data: modelData, error: modelError } = await supabase
          .from('models')
          .select('name')
          .eq('id', modelIdNum)
          .single();

        if (modelError || !modelData) {
          console.error('Error fetching model:', modelError);
          return;
        }

        // Format price
        const price = typeof basicInfo.price === 'string'
          ? parseFloat(basicInfo.price)
          : basicInfo.price;
        
        const formattedPriceStr = new Intl.NumberFormat('es-CL', {
          style: 'currency',
          currency: 'CLP'
        }).format(price);

        setBrandName(brandData.name || '');
        setModelName(modelData.name || '');
        setFormattedPrice(formattedPriceStr);
      } catch (error) {
        console.error('Error in useVehicleMarketingDetails:', error);
      }
    };

    fetchVehicleDetails();
  }, [basicInfo]);

  return { brandName, modelName, formattedPrice };
};
