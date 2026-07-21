
import { supabase } from '@/integrations/supabase/client';

export const fetchCustomersData = async (
  brandId?: string | number,
  modelId?: string | number,
  price?: string | number
) => {
  const brandIdStr = typeof brandId === 'number' ? brandId.toString() : brandId;
  const modelIdNum = typeof modelId === 'string' ? parseInt(modelId, 10) : modelId;
  const priceNum = typeof price === 'string' ? parseFloat(price) : (price || 0);

  const { data: brandData } = await supabase
    .from('brands')
    .select('name')
    .eq('id', brandIdStr)
    .maybeSingle();

  const { data: modelData } = await supabase
    .from('models')
    .select('name')
    .eq('id', modelIdNum)
    .maybeSingle();

  return {
    brandName: brandData?.name || '',
    modelName: modelData?.name || '',
    priceNum
  };
};
