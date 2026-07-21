import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';

export type UserProfileData = {
  firstName: string;
  lastName: string;
  email: string;
};

interface Props {
  value: UserProfileData;
  onChange: (patch: Partial<UserProfileData>) => void;
}

export const UserProfileStep: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm">
          <User className="h-6 w-6 text-slate-700" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-slate-900 leading-tight">
            Perfil de usuario
          </h2>
          <p className="text-slate-600">
            Proporciona algunos datos personales
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Nombre(s) <span className="text-red-500">*</span></Label>
            <Input
              id="firstName"
              value={value.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              placeholder="Ej. Nicolás"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Apellido(s) <span className="text-red-500">*</span></Label>
            <Input
              id="lastName"
              value={value.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              placeholder="Ej. Moreno Ávila"
              className="h-11"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="userEmail">Correo electrónico <span className="text-red-500">*</span></Label>
          <Input
            id="userEmail"
            type="email"
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="tu.correo@ejemplo.com"
            className="h-11"
          />
        </div>
      </div>
    </div>
  );
};
