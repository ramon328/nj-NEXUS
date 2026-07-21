import { useAuth } from '@/contexts/AuthContext';
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function WebsiteCard() {
  const { client } = useAuth();
  const { i18n } = useTranslation();
  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  if (!client?.domain) return null;

  const websiteUrl = `https://${client.domain}`;

  return (
    <div className="rounded-xl border border-slate-200/60 bg-white px-4 py-2.5 flex items-center gap-3">
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-semibold text-slate-900 hover:text-slate-600 transition-colors truncate"
        >
          {client.domain}
        </a>
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {dv('En línea', 'Online')}
        </span>
      </div>
      <a
        href={websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-700 border border-slate-200 hover:border-slate-300 transition-colors shrink-0"
      >
        <ExternalLink className="w-3 h-3" />
        {dv('Visitar sitio', 'Visit site')}
      </a>
    </div>
  );
}
