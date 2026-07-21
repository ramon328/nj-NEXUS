import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

export type CompanyInfoData = {
  name: string;
  phone: string;
  email: string;
  countryCode: string;
};

interface Props {
  value: CompanyInfoData;
  onChange: (patch: Partial<CompanyInfoData>) => void;
}

const COUNTRY_CODES = [
  { code: '+56', country: 'Chile', flag: '🇨🇱' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷' },
  { code: '+51', country: 'Perú', flag: '🇵🇪' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴' },
  { code: '+52', country: 'México', flag: '🇲🇽' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨' },
  { code: '+598', country: 'Uruguay', flag: '🇺🇾' },
];

export const CompanyInfoStep: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm">
          <Building2 className="h-6 w-6 text-slate-700" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-slate-900 leading-tight">
            Información de tu automotora
          </h2>
          <p className="text-slate-600">
            Cuéntanos sobre tu negocio
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dealerName">Nombre de tu automotora <span className="text-red-500">*</span></Label>
          <Input
            id="dealerName"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ej. Sarret Cars Boutique"
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dealerPhone">Teléfono de la automotora <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Select
              value={value.countryCode || '+56'}
              onValueChange={(val) => onChange({ countryCode: val })}
            >
              <SelectTrigger className="w-[140px] h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_CODES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              id="dealerPhone"
              type="tel"
              value={value.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="9 1234 5678"
              className="flex-1 h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dealerEmail">Correo electrónico de la automotora <span className="text-red-500">*</span></Label>
          <Input
            id="dealerEmail"
            type="email"
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="contacto@tuautomotora.com"
            className="h-11"
          />
        </div>
      </div>
    </div>
  );
};
