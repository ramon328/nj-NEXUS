import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Shield, Loader2 } from 'lucide-react';

interface RequiredFields {
  tech_inspection_expiry: boolean;
  circulation_permit_expiry: boolean;
  emissions_expiry: boolean;
  municipality_permit_expiry: boolean;
}

const DEFAULT_CONFIG: RequiredFields = {
  tech_inspection_expiry: false,
  circulation_permit_expiry: false,
  emissions_expiry: false,
  municipality_permit_expiry: false,
};

const FIELD_LABELS: Record<keyof RequiredFields, { es: string; desc: string }> = {
  tech_inspection_expiry: {
    es: 'Revisión Técnica',
    desc: 'Vencimiento de la revisión técnica vehicular',
  },
  circulation_permit_expiry: {
    es: 'Permiso de Circulación',
    desc: 'Vencimiento del permiso de circulación',
  },
  emissions_expiry: {
    es: 'SOAP',
    desc: 'Vencimiento del Seguro Obligatorio (SOAP)',
  },
  municipality_permit_expiry: {
    es: 'Municipalidad',
    desc: 'Municipalidad donde se sacó el permiso de circulación',
  },
};

export const VehicleDocsConfig = () => {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<RequiredFields>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!clientId) return;
    const { data, error } = await supabase
      .from('clients')
      .select('required_vehicle_fields')
      .eq('id', clientId)
      .single();

    if (!error && data?.required_vehicle_fields) {
      setConfig({ ...DEFAULT_CONFIG, ...data.required_vehicle_fields });
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const handleToggle = async (field: keyof RequiredFields) => {
    if (!clientId) return;
    setSaving(true);

    const updated = { ...config, [field]: !config[field] };
    setConfig(updated);

    const { error } = await supabase
      .from('clients')
      .update({ required_vehicle_fields: updated })
      .eq('id', clientId);

    setSaving(false);

    if (error) {
      setConfig(config); // revert
      toast({ title: 'Error', description: 'No se pudo guardar', variant: 'destructive' });
    } else {
      toast({
        title: updated[field] ? 'Campo obligatorio' : 'Campo opcional',
        description: `${FIELD_LABELS[field].es} ahora es ${updated[field] ? 'obligatorio' : 'opcional'}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
          <Shield className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-slate-900">Documentación obligatoria</h3>
          <p className="text-[12px] text-slate-400">
            Elige qué documentos son obligatorios al agregar un vehículo
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/60 divide-y divide-slate-100 overflow-hidden">
        {(Object.keys(FIELD_LABELS) as Array<keyof RequiredFields>).map((field) => (
          <div
            key={field}
            className="flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50/50 transition-colors"
          >
            <div>
              <p className="text-[13px] font-medium text-slate-700">
                {FIELD_LABELS[field].es}
              </p>
              <p className="text-[11px] text-slate-400">
                {FIELD_LABELS[field].desc}
              </p>
            </div>
            <Switch
              checked={config[field]}
              onCheckedChange={() => handleToggle(field)}
              disabled={saving}
            />
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-400 px-1">
        Los campos marcados como obligatorios se exigirán al crear o editar un vehículo. Los campos opcionales seguirán disponibles pero sin ser requeridos.
      </p>
    </div>
  );
};

export default VehicleDocsConfig;
