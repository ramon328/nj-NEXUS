import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AnalysisPlay {
  title: string;
  why: string;
  impact: 'alto' | 'medio' | 'bajo';
  action_label?: string;
  href?: string;
}

export interface OperationAnalysis {
  headline: string;
  health_label: 'critico' | 'atencion' | 'bien' | 'excelente';
  plays: AnalysisPlay[];
  patterns: string[];
}

/**
 * Llama al "Analista IA" del servidor Mastra (mismo backend que GAIA, Claude Sonnet
 * 4.6). Le mandamos un snapshot de la operación ya armado por el front y devuelve un
 * briefing + jugadas accionables (solo lectura, no ejecuta cambios).
 */
export function useOperationAnalysis() {
  const [analysis, setAnalysis] = useState<OperationAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (context: Record<string, any>) => {
    const mastraUrl = import.meta.env.VITE_MASTRA_URL;
    if (!mastraUrl) {
      setError('El Analista IA no está configurado (falta VITE_MASTRA_URL).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('No hay una sesión activa.');

      const res = await fetch(`${mastraUrl}/api/operation-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ context }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error del servidor (${res.status})`);
      }

      const data = await res.json();
      setAnalysis(data.analysis as OperationAnalysis);
    } catch (e: any) {
      setError(e?.message || 'No se pudo generar el análisis.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysis, loading, error, run };
}
