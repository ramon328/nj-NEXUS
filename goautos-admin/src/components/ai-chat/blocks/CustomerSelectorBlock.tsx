import { CustomerPreview } from '@/types/gaia';
import { User, Mail, Phone, CreditCard, MousePointerClick, ChevronRight } from 'lucide-react';

interface CustomerSelectorBlockProps {
  customers: CustomerPreview[];
  prompt: string;
  onSelect: (customer: CustomerPreview) => void;
}

export function CustomerSelectorBlock({ customers, prompt, onSelect }: CustomerSelectorBlockProps) {
  if (!customers || customers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
        <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No se encontraron clientes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-6 h-6 rounded-full bg-cyan-100 flex items-center justify-center flex-shrink-0">
          <MousePointerClick className="w-3.5 h-3.5 text-cyan-600" />
        </div>
        <p className="text-sm font-medium text-slate-700">{prompt}</p>
      </div>

      <div className="flex flex-col gap-2">
        {customers.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white
              hover:border-cyan-200 hover:shadow-sm active:scale-[0.98] transition-all text-left w-full"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-cyan-700">
                {c.first_name?.[0]}{c.last_name?.[0]}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {c.first_name} {c.last_name}
              </p>
              <div className="flex items-center gap-3 mt-0.5">
                {c.email && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 truncate">
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    {c.email}
                  </span>
                )}
                {c.phone && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Phone className="w-3 h-3 flex-shrink-0" />
                    {c.phone}
                  </span>
                )}
                {c.rut && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400">
                    <CreditCard className="w-3 h-3 flex-shrink-0" />
                    {c.rut}
                  </span>
                )}
              </div>
            </div>

            <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
