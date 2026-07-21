import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type DocumentTemplateType =
  | 'sale'
  | 'purchase'
  | 'consignment'
  | 'reservation'
  | 'quotation'
  | 'close_deal'
  | 'spec_sheet';

/**
 * Returns the set of document template types the current client has configured
 * in `document_templates`. Used to dynamically render the "Crear Nuevo" menu
 * so users only see options for document types they have a plantilla for.
 */
export const useAvailableDocumentTypes = () => {
  const { clientId } = useAuth();
  const [availableTypes, setAvailableTypes] = useState<Set<DocumentTemplateType>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_templates')
        .select('template_type')
        .eq('client_id', clientId);

      if (cancelled) return;

      if (error) {
        console.error('Error fetching available document templates:', error);
        setAvailableTypes(new Set());
      } else {
        const types = new Set<DocumentTemplateType>(
          (data || []).map((row: any) => row.template_type as DocumentTemplateType)
        );
        setAvailableTypes(types);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return { availableTypes, loading };
};

export default useAvailableDocumentTypes;
