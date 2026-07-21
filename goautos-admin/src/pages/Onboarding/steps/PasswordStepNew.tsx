import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react';

export type PasswordData = {
  password: string;
  confirmPassword: string;
};

interface Props {
  value: PasswordData;
  onChange: (patch: Partial<PasswordData>) => void;
}

function validatePassword(password: string) {
  return {
    minLength: password.length >= 8,
    hasNumber: /[0-9]/.test(password),
  };
}

export const PasswordStepNew: React.FC<Props> = ({ value, onChange }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validation = useMemo(() => validatePassword(value.password), [value.password]);
  const isPasswordValid = validation.minLength && validation.hasNumber;
  const confirmMatches = value.confirmPassword !== '' && value.password === value.confirmPassword;
  const confirmError = value.confirmPassword !== '' && value.password !== value.confirmPassword;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-white shadow-sm">
          <Lock className="h-6 w-6 text-slate-700" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-slate-900 leading-tight">
            Crea tu contraseña
          </h2>
          <p className="text-slate-600 text-sm mt-1">
            Mínimo 8 caracteres y al menos un número
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Contraseña */}
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={value.password}
              onChange={(e) => onChange({ password: e.target.value })}
              placeholder="••••••••"
              className="h-11 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-500" />
              ) : (
                <Eye className="h-4 w-4 text-gray-500" />
              )}
            </Button>
          </div>
        </div>

        {/* Requisitos de contraseña */}
        {value.password && (
          <div className="rounded-lg border bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700 mb-2">Requisitos de contraseña:</p>
            <ul className="space-y-1.5">
              <li className={`flex items-center gap-2 text-sm ${validation.minLength ? 'text-emerald-600' : 'text-slate-600'}`}>
                {validation.minLength ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Mínimo 8 caracteres
              </li>
              <li className={`flex items-center gap-2 text-sm ${validation.hasNumber ? 'text-emerald-600' : 'text-slate-600'}`}>
                {validation.hasNumber ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
                Al menos un número
              </li>
            </ul>
          </div>
        )}

        {/* Confirmar contraseña */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmar contraseña <span className="text-red-500">*</span></Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={value.confirmPassword}
              onChange={(e) => onChange({ confirmPassword: e.target.value })}
              placeholder="••••••••"
              className={`h-11 pr-10 ${confirmError ? 'border-red-500' : confirmMatches ? 'border-emerald-500' : ''}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowConfirm(v => !v)}
              className="absolute right-0 top-0 h-11 w-11 hover:bg-transparent"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4 text-gray-500" />
              ) : (
                <Eye className="h-4 w-4 text-gray-500" />
              )}
            </Button>
          </div>
          {confirmError && (
            <p className="text-sm text-red-500">Las contraseñas no coinciden</p>
          )}
          {confirmMatches && (
            <p className="text-sm text-emerald-600 flex items-center gap-1">
              <Check className="h-4 w-4" /> Las contraseñas coinciden
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
