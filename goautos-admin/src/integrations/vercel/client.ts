import { supabase } from '@/integrations/supabase/client';

// Registro DNS que Vercel pide para verificar la propiedad de un dominio.
export interface VercelVerificationRecord {
  type: string; // TXT, CNAME, A...
  domain: string; // dónde crear el registro
  value: string; // valor del registro
  reason?: string;
}

export interface VercelDomainStatus {
  name: string;
  // Propiedad del dominio verificada en Vercel (resuelve los challenges TXT).
  // OJO: verified=true NO significa que el sitio ya cargue; falta el DNS.
  verified: boolean;
  // true si el DNS todavía NO apunta a Vercel (registro A/CNAME faltante o malo).
  // El dominio está realmente ACTIVO sólo cuando verified && !misconfigured.
  misconfigured?: boolean;
  // Registros que el cliente debe crear en su DNS para verificar (si aplica).
  verification?: VercelVerificationRecord[];
}

// El dominio está sirviendo tráfico real sólo cuando la propiedad está
// verificada Y el DNS apunta a Vercel.
export const isDomainActive = (s: VercelDomainStatus): boolean =>
  !!s.verified && s.misconfigured === false;

// Toda la gestión de dominios pasa por la edge function `vercel-domain`, que
// guarda el token de Vercel server-side (no se expone en el bundle del cliente).
const invokeVercelDomain = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('vercel-domain', {
    body,
  });
  if (error) {
    // Cuando la función responde con un status de error, supabase-js expone el
    // cuerpo en error.context. Intentamos sacar el mensaje real.
    let message = error.message;
    try {
      const ctxBody = await (error as any).context?.json?.();
      if (ctxBody?.error) message = ctxBody.error;
    } catch (_e) {
      // ignore
    }
    throw new Error(message || 'Error al comunicarse con el servidor de dominios');
  }
  if (data?.error) throw new Error(data.error);
  return data;
};

// Agrega un dominio PERSONALIZADO (no *.goauto.cl) al proyecto de Vercel y
// devuelve su estado real (verified + misconfigured).
export const addCustomDomain = (domain: string): Promise<VercelDomainStatus> =>
  invokeVercelDomain({ action: 'add', domain });

// Consulta el estado real de un dominio (propiedad + DNS).
export const getCustomDomainStatus = (
  domain: string
): Promise<VercelDomainStatus> => invokeVercelDomain({ action: 'status', domain });

// Desconecta (elimina) un dominio del proyecto de Vercel.
export const removeCustomDomain = async (domain: string): Promise<void> => {
  await invokeVercelDomain({ action: 'remove', domain });
};

// Onboarding: crea el subdominio {formattedName}.goauto.cl en el proyecto.
export const createDomain = async (formattedName: string) =>
  invokeVercelDomain({ action: 'add-subdomain', name: formattedName });
