import { Lead } from '@/types/leads';

/**
 * Origen de un lead. Hoy distinguimos los que llegan desde ChileAutos (vía el
 * webhook chileautos-lead-webhook, que deja marcas en search_params) del resto
 * ("otros": web, manual, GAIA, etc. — no tenemos un marcador confiable para
 * separarlos entre sí desde este repo, así que van todos como 'other').
 */
export type LeadOriginKey = 'chileautos' | 'other';

export interface LeadOriginInfo {
  key: LeadOriginKey;
  isChileautos: boolean;
  /** Canal por el que entró el lead de ChileAutos. */
  channel?: 'Formulario' | 'WhatsApp' | 'Llamada';
  /** URL pública de la publicación en ChileAutos (si vino en el payload del lead). */
  publicationUrl?: string | null;
}

export function getLeadOrigin(lead?: Lead | null): LeadOriginInfo {
  // search_params está tipado con los criterios de búsqueda, pero el webhook de
  // ChileAutos guarda ahí campos extra (chileautos_source/_url/_lead_id).
  const sp = (lead?.search_params ?? {}) as Record<string, unknown>;
  const src = typeof sp.chileautos_source === 'string' ? sp.chileautos_source : undefined;
  const isChileautos = !!src || !!sp.chileautos_lead_id;

  if (!isChileautos) {
    return { key: 'other', isChileautos: false };
  }

  let channel: LeadOriginInfo['channel'] = 'Formulario';
  if (src === 'chileautos-whatsapp') channel = 'WhatsApp';
  else if (src === 'chileautos-callconnect') channel = 'Llamada';

  const url = typeof sp.chileautos_url === 'string' ? sp.chileautos_url : null;
  return { key: 'chileautos', isChileautos: true, channel, publicationUrl: url };
}

/**
 * Sello visual "ChileAutos" para distinguir estos leads de un vistazo. No
 * renderiza nada si el lead no es de ChileAutos.
 */
export function LeadOriginBadge({
  lead,
  showChannel = false,
  className = '',
}: {
  lead: Lead;
  showChannel?: boolean;
  className?: string;
}) {
  const origin = getLeadOrigin(lead);
  if (!origin.isChileautos) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-orange-50 text-[10px] font-medium text-orange-700 border border-orange-200/70 ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
      ChileAutos
      {showChannel && origin.channel ? <span className="text-orange-500/80">· {origin.channel}</span> : null}
    </span>
  );
}
