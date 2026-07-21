
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TemplateType } from '@/types/document-template';

// Extend the Document type to include terms_and_conditions
export interface Document {
  id: number;
  type: string;
  client_id: number;
  vehicle_id: number;
  customer_id?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  terms_and_conditions?: string;
}

/**
 * Fetches document template terms and conditions based on client ID and template type
 */
export const fetchDocumentTerms = async (
  clientId: number | undefined, 
  templateType: TemplateType
): Promise<string> => {
  if (!clientId) return '';
  
  try {
    const { data, error } = await supabase
      .from('document_templates')
      .select('terms_and_conditions')
      .eq('client_id', clientId)
      .eq('template_type', templateType)
      .single();
      
    if (error) {
      console.error(`Error fetching ${templateType} template:`, error);
      return '';
    }
    
    return data?.terms_and_conditions || '';
  } catch (error) {
    console.error(`Error in fetchDocumentTerms for ${templateType}:`, error);
    return '';
  }
};

/**
 * Enhances a document object with terms_and_conditions from templates
 */
export const enhanceDocumentWithTerms = async (
  document: any, 
  clientId: number | undefined, 
  templateType: TemplateType
): Promise<any> => {
  if (!document) return null;
  
  const terms = await fetchDocumentTerms(clientId, templateType);
  
  return {
    ...document,
    terms_and_conditions: terms
  };
};

export const useDocumentWithTerms = (
  documentId: number | undefined,
  clientId: number | undefined,
  templateType: TemplateType,
  isOpen: boolean = true
) => {
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<Document | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId || !clientId || !isOpen) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vehicles_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (error) {
          throw error;
        }

        const enhancedDoc = await enhanceDocumentWithTerms(data, clientId, templateType);
        setDocument(enhancedDoc);
      } catch (error) {
        console.error('Error fetching document with terms:', error);
        setDocument(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, clientId, templateType, isOpen]);

  return { document, loading };
};
