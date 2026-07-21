import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RequiredFields {
  tech_inspection_expiry: boolean;
  circulation_permit_expiry: boolean;
  emissions_expiry: boolean;
  municipality_permit_expiry: boolean;
}

const DEFAULT: RequiredFields = {
  tech_inspection_expiry: false,
  circulation_permit_expiry: false,
  emissions_expiry: false,
  municipality_permit_expiry: false,
};

export function useRequiredVehicleFields() {
  const { clientId } = useAuth();
  const [requiredFields, setRequiredFields] = useState<RequiredFields>(DEFAULT);

  useEffect(() => {
    if (!clientId) return;

    supabase
      .from('clients')
      .select('required_vehicle_fields')
      .eq('id', clientId)
      .single()
      .then(({ data }) => {
        if (data?.required_vehicle_fields) {
          setRequiredFields({ ...DEFAULT, ...data.required_vehicle_fields });
        }
      });
  }, [clientId]);

  return requiredFields;
}
