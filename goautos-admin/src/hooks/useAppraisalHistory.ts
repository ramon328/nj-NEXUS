import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AppraisalRecord {
  id: number;
  query: string;
  vehicle_details: any;
  price_analysis: any;
  estimated_range: { low: number; high: number } | null;
  confidence: 'high' | 'medium' | 'low';
  sources: any[];
  appraisal_result: string;
  created_at: string;
  created_by: string;
}

export const useAppraisalHistory = (clientId: number | undefined) => {
  const [history, setHistory] = useState<AppraisalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('appraisals')
        .select('id, query, vehicle_details, price_analysis, estimated_range, confidence, sources, appraisal_result, created_at, created_by')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data as AppraisalRecord[]) || []);
    } catch (err) {
      console.error('Error fetching appraisal history:', err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [clientId]);

  return { history, loading, refetch: fetchHistory };
};
