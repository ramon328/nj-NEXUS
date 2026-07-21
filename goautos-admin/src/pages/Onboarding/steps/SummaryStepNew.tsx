import React from 'react';
import { CheckCircle, User, Building2, MapPin, Lock } from 'lucide-react';
import type { UserProfileData } from './UserProfileStep';
import type { CompanyInfoData } from './CompanyInfoStep';
import type { LocationData } from './LocationStep';
import type { PasswordData } from './PasswordStepNew';

interface Props {
  userProfile: UserProfileData;
  companyInfo: CompanyInfoData;
  location: LocationData;
  password: PasswordData;
}

export const SummaryStepNew: React.FC<Props> = ({
  userProfile,
  companyInfo,
  location,
  password,
}) => {
  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Resumen del registro
          </h2>
          <p className="text-sm text-slate-500">Verifica tu información</p>
        </div>
      </div>

      {/* Card única con toda la información */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {/* Usuario */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Usuario</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-slate-500">Nombre</span>
              <p className="font-medium text-slate-900 truncate">{userProfile.firstName} {userProfile.lastName}</p>
            </div>
            <div>
              <span className="text-slate-500">Correo</span>
              <p className="font-medium text-slate-900 truncate">{userProfile.email}</p>
            </div>
          </div>
        </div>

        {/* Automotora */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Automotora</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <div>
              <span className="text-slate-500">Nombre</span>
              <p className="font-medium text-slate-900 truncate">{companyInfo.name}</p>
            </div>
            <div>
              <span className="text-slate-500">Teléfono</span>
              <p className="font-medium text-slate-900">{companyInfo.countryCode} {companyInfo.phone}</p>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">Correo</span>
              <p className="font-medium text-slate-900 truncate">{companyInfo.email}</p>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ubicación</span>
          </div>
          <p className="text-sm font-medium text-slate-900 truncate">{location.address}</p>
        </div>

        {/* Contraseña - solo indicador */}
        <div className="p-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            <span className="text-sm text-slate-600">Contraseña configurada</span>
            <CheckCircle className="h-4 w-4 text-emerald-500 ml-auto" />
          </div>
        </div>
      </div>

      {/* CTA compacto */}
      <p className="text-xs text-center text-slate-500">
        Al hacer clic en <strong>"Crear cuenta"</strong> se creará tu cuenta
      </p>
    </div>
  );
};
