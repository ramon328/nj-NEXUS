import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export type AccountData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
};

function emailValid(e: string) {
  return /^\S+@\S+\.\S+$/.test((e || '').trim());
}

function normalizeClMobile(raw: string): string | null {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('569')) return '+569' + digits.slice(3);
  if (digits.length === 9 && digits.startsWith('9')) return '+569' + digits.slice(1);
  return null;
}

interface Props {
  value: AccountData;
  onChange: (patch: Partial<AccountData>) => void;
  isCreatingAccount?: boolean;
}

export const PasswordStep: React.FC<Props> = ({ value, onChange, isCreatingAccount }) => {
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const firstErr = value.firstName !== undefined && value.firstName.trim() === '';
  const lastErr = value.lastName !== undefined && value.lastName.trim() === '';
  const emailErr = value.email !== '' && !emailValid(value.email);
  const phoneE164 = useMemo(() => normalizeClMobile(value.phone), [value.phone]);
  const phoneErr = value.phone !== '' && !phoneE164;
  const passErr = value.password !== '' && (value.password.length < 8 || !/[0-9]/.test(value.password));
  const confirmErr = confirm !== '' && confirm !== value.password;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-2">
        <div className="flex items-center justify-center w-14 h-14 border border-gray-300 rounded-lg flex-shrink-0">
          <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-slate-900">Crear cuenta</h2>
          <p className="text-slate-600">Nombre, correo, teléfono y contraseña</p>
        </div>
      </div>
      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre(s)*</Label>
          <Input id="firstName" value={value.firstName}
                 onChange={(e) => onChange({ firstName: e.target.value })}
                 placeholder="Ej. Juan" className={`h-11 ${firstErr ? 'border-red-500' : ''}`} />
          {firstErr && <p className="text-sm text-red-500">Nombre requerido</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido(s)*</Label>
          <Input id="lastName" value={value.lastName}
                 onChange={(e) => onChange({ lastName: e.target.value })}
                 placeholder="Ej. Pérez" className={`h-11 ${lastErr ? 'border-red-500' : ''}`} />
          {lastErr && <p className="text-sm text-red-500">Apellido requerido</p>}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico*</Label>
          <Input id="email" type="email" value={value.email}
                 onChange={(e) => onChange({ email: e.target.value.trim().toLowerCase() })}
                 placeholder="tucorreo@dominio.com"
                 className={`h-11 ${emailErr ? 'border-red-500' : ''}`} />
          {emailErr && <p className="text-sm text-red-500">Correo inválido</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono móvil</Label>
          <Input id="phone" type="tel" value={value.phone}
                 onChange={(e) => onChange({ phone: e.target.value })}
                 placeholder="9 1234 5678"
                 className={`h-11 ${phoneErr ? 'border-red-500' : ''}`} />
          {phoneErr && <p className="text-sm text-red-500">Formato esperado: +56 9 XXXXXXXX</p>}
          {!phoneErr && value.phone && phoneE164 && (
            <p className="text-xs text-slate-500">Se guardará como <b>{phoneE164}</b></p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Contraseña*</Label>
          <div className="relative">
            <Input id="password" type={show1 ? 'text' : 'password'} value={value.password}
                   onChange={(e) => onChange({ password: e.target.value })}
                   placeholder="Mínimo 8 caracteres y un número"
                   className={`h-11 pr-10 ${passErr ? 'border-red-500' : ''}`} />
            <Button type="button" variant="ghost" size="icon"
              onClick={() => setShow1(v => !v)}
              className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent">
              {show1 ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
            </Button>
          </div>
          {passErr && <p className="text-sm text-red-500">Mínimo 8 caracteres y al menos un número</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirmar contraseña*</Label>
          <div className="relative">
            <Input id="confirm" type={show2 ? 'text' : 'password'} value={confirm}
                   onChange={(e) => setConfirm(e.target.value)}
                   placeholder="Confirma tu contraseña"
                   className={`h-11 pr-10 ${confirmErr ? 'border-red-500' : ''}`} />
            <Button type="button" variant="ghost" size="icon"
              onClick={() => setShow2(v => !v)}
              className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent">
              {show2 ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
            </Button>
          </div>
          {confirmErr && <p className="text-sm text-red-500">Las contraseñas no coinciden</p>}
        </div>

        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Requisitos de contraseña:</strong>
          </p>
          <ul className="text-sm text-blue-700 mt-2 space-y-1">
            <li>• Mínimo 8 caracteres</li>
            <li>• Al menos un número</li>
          </ul>
        </div>
      </div>

      {isCreatingAccount && (
        <p className="text-sm text-slate-500">Creando cuenta…</p>
      )}
    </div>
  );
};
