import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  Zap,
  Users,
  Car,
  ShoppingCart,
  Package,
  Bell,
  Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/utils/edgeFunctionErrors';

interface PushNotificationSettings {
  smart_alert: boolean;
  new_lead: boolean;
  vehicle_request: boolean;
  sale: boolean;
  inventory: boolean;
  general: boolean;
}

const DEFAULT_SETTINGS: PushNotificationSettings = {
  smart_alert: true,
  new_lead: true,
  vehicle_request: true,
  sale: true,
  inventory: true,
  general: true,
};

const NOTIFICATION_TYPES: {
  key: keyof PushNotificationSettings;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    key: 'smart_alert',
    label: 'Alertas inteligentes',
    description: 'Sugerencias de IA sobre inventario, precios y oportunidades',
    icon: Zap,
  },
  {
    key: 'new_lead',
    label: 'Nuevos leads',
    description: 'Cuando llega un nuevo lead o contacto al sistema',
    icon: Users,
  },
  {
    key: 'vehicle_request',
    label: 'Solicitudes de vehículos',
    description: 'Actualizaciones sobre solicitudes y consultas de vehículos',
    icon: Car,
  },
  {
    key: 'sale',
    label: 'Ventas y reservas',
    description: 'Cuando se completa una venta o se realiza una reserva',
    icon: ShoppingCart,
  },
  {
    key: 'inventory',
    label: 'Inventario',
    description: 'Cambios en el stock, vehículos publicados o actualizados',
    icon: Package,
  },
  {
    key: 'general',
    label: 'Notificaciones generales',
    description: 'Avisos del sistema y comunicados internos',
    icon: Bell,
  },
];

export default function NotificationPreferencesConfig() {
  const { clientId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PushNotificationSettings>(DEFAULT_SETTINGS);
  const [masterEnabled, setMasterEnabled] = useState(true);

  useEffect(() => {
    if (!clientId) return;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('push_notification_settings')
          .eq('id', clientId)
          .single();

        if (error) throw error;

        if (data?.push_notification_settings) {
          const stored = data.push_notification_settings as PushNotificationSettings;
          setSettings({ ...DEFAULT_SETTINGS, ...stored });
          // Master is off only if ALL are off
          setMasterEnabled(Object.values({ ...DEFAULT_SETTINGS, ...stored }).some(Boolean));
        }
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [clientId]);

  const toggleSetting = (key: keyof PushNotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMasterToggle = async (checked: boolean) => {
    setMasterEnabled(checked);
    const newSettings = Object.fromEntries(
      Object.keys(settings).map((k) => [k, checked])
    ) as PushNotificationSettings;
    setSettings(newSettings);

    // Auto-save master toggle
    try {
      await supabase
        .from('clients')
        .update({ push_notification_settings: newSettings })
        .eq('id', clientId);
      toast.success(checked ? 'Todas las notificaciones activadas' : 'Todas las notificaciones desactivadas');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleSave = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({ push_notification_settings: settings })
        .eq('id', clientId);

      if (error) throw error;

      setMasterEnabled(Object.values(settings).some(Boolean));
      toast.success('Preferencias guardadas');
    } catch (err: any) {
      console.error('Error saving preferences:', err);
      toast.error(friendlyError(err) || 'Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Tipos de notificaciones</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Elige qué notificaciones quieres recibir en la app y como push
          </p>
        </div>
        <Switch
          checked={masterEnabled}
          onCheckedChange={handleMasterToggle}
        />
      </div>

      {/* Notification items */}
      <div className="rounded-xl border border-slate-200/60 divide-y divide-slate-100">
        {NOTIFICATION_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <div key={type.key} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-700">{type.label}</p>
                  <p className="text-xs text-slate-400 truncate">{type.description}</p>
                </div>
              </div>
              <Switch
                checked={settings[type.key]}
                onCheckedChange={() => toggleSetting(type.key)}
                disabled={!masterEnabled}
              />
            </div>
          );
        })}
      </div>

      {/* Save button */}
      <Button
        variant="outline"
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Guardar preferencias
      </Button>
    </div>
  );
}
