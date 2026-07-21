import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  Loader2,
  Bell,
  MessageSquare,
  Users,
  Car,
  CreditCard,
  Calendar,
  Send,
} from 'lucide-react';
import { FaWhatsapp, FaInstagram } from 'react-icons/fa';
import { toast } from 'sonner';
import { friendlyError } from '@/utils/edgeFunctionErrors';

interface NotificationSettings {
  new_lead: boolean;
  new_contact: boolean;
  instagram_message: boolean;
  vehicle_inquiry: boolean;
  financing_request: boolean;
  test_drive_request: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  new_lead: true,
  new_contact: true,
  instagram_message: true,
  vehicle_inquiry: true,
  financing_request: true,
  test_drive_request: true,
};

export default function WhatsAppNotificationsConfig() {
  const { clientId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [isConfigured, setIsConfigured] = useState(false);

  // Fetch existing config
  useEffect(() => {
    if (!clientId) return;

    const fetchConfig = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('notification_whatsapp, whatsapp_notifications_enabled, whatsapp_notification_settings')
          .eq('id', clientId)
          .single();

        if (error) throw error;

        if (data) {
          setPhoneNumber(data.notification_whatsapp || '');
          setNotificationsEnabled(data.whatsapp_notifications_enabled ?? true);
          setSettings(data.whatsapp_notification_settings || DEFAULT_SETTINGS);
          setIsConfigured(!!data.notification_whatsapp);
        }
      } catch (error) {
        console.error('Error fetching WhatsApp config:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [clientId]);

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');

    // If starts with 56 and has 11 digits, it's already formatted
    if (digits.startsWith('56') && digits.length === 11) {
      return `+${digits}`;
    }

    // If 9 digits starting with 9, add +56
    if (digits.length === 9 && digits.startsWith('9')) {
      return `+56${digits}`;
    }

    // If starts with +, keep as is
    if (phone.startsWith('+')) {
      return phone;
    }

    // Default: add +56 prefix
    return `+56${digits}`;
  };

  const handleSave = async () => {
    if (!clientId) return;

    if (!phoneNumber.trim()) {
      toast.error('Ingresa un numero de WhatsApp');
      return;
    }

    setSaving(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      const { error } = await supabase
        .from('clients')
        .update({
          notification_whatsapp: formattedPhone,
          whatsapp_notifications_enabled: notificationsEnabled,
          whatsapp_notification_settings: settings,
        })
        .eq('id', clientId);

      if (error) throw error;

      setPhoneNumber(formattedPhone);
      setIsConfigured(true);
      toast.success('Configuracion guardada');
    } catch (error: any) {
      console.error('Error saving WhatsApp config:', error);
      toast.error(friendlyError(error, 'trigger-whatsapp-notification') || 'Error al guardar configuración de WhatsApp');
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (!clientId || !phoneNumber) return;

    setTesting(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);

      const { data, error } = await supabase.functions.invoke('trigger-whatsapp-notification', {
        body: {
          type: 'test',
          clientId,
          data: {
            message: 'Tus notificaciones de WhatsApp estan configuradas correctamente. Recibiras alertas de nuevos leads, mensajes y mas.',
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Mensaje de prueba enviado');
      } else if (data?.reason) {
        toast.info(data.reason);
      } else {
        throw new Error(data?.error || 'Error al enviar');
      }
    } catch (error: any) {
      console.error('Error sending test:', error);
      toast.error(friendlyError(error, 'trigger-whatsapp-notification'));
    } finally {
      setTesting(false);
    }
  };

  const handleDisable = async () => {
    if (!clientId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          notification_whatsapp: null,
          whatsapp_notifications_enabled: false,
        })
        .eq('id', clientId);

      if (error) throw error;

      setPhoneNumber('');
      setNotificationsEnabled(false);
      setIsConfigured(false);
      toast.success('Notificaciones desactivadas');
    } catch (error: any) {
      toast.error(friendlyError(error) || 'Error al desactivar notificaciones');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
          <FaWhatsapp className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Notificaciones por WhatsApp</h2>
          <p className="text-sm text-muted-foreground">
            Recibe alertas de leads, mensajes y contactos en tu WhatsApp
          </p>
        </div>
      </div>

      {/* Status Card */}
      {isConfigured && notificationsEnabled && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium">Notificaciones activas</p>
                  <p className="text-sm text-muted-foreground">{phoneNumber}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Enviar prueba
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Phone Number Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Numero de WhatsApp
          </CardTitle>
          <CardDescription>
            Ingresa el numero donde quieres recibir las notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="+56 9 1234 5678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving || !phoneNumber.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isConfigured ? 'Actualizar' : 'Activar'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Formato E.164: +56912345678 (se formatea automaticamente)
          </p>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      {isConfigured && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tipos de notificaciones</CardTitle>
                <CardDescription>
                  Elige que notificaciones quieres recibir
                </CardDescription>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={(checked) => {
                  setNotificationsEnabled(checked);
                  // Auto-save when toggling master switch
                  supabase
                    .from('clients')
                    .update({ whatsapp_notifications_enabled: checked })
                    .eq('id', clientId)
                    .then(() => {
                      toast.success(checked ? 'Notificaciones activadas' : 'Notificaciones pausadas');
                    });
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Lead */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Nuevo lead</p>
                  <p className="text-xs text-muted-foreground">
                    Cuando llega un nuevo lead al sistema
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.new_lead}
                onCheckedChange={() => toggleSetting('new_lead')}
                disabled={!notificationsEnabled}
              />
            </div>

            <Separator />

            {/* New Contact */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Nuevo contacto</p>
                  <p className="text-xs text-muted-foreground">
                    Cuando se registra un nuevo contacto o cliente
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.new_contact}
                onCheckedChange={() => toggleSetting('new_contact')}
                disabled={!notificationsEnabled}
              />
            </div>

            <Separator />

            {/* Instagram Message */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                  <FaInstagram className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Mensaje de Instagram</p>
                  <p className="text-xs text-muted-foreground">
                    Cuando recibes un DM en Instagram
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.instagram_message}
                onCheckedChange={() => toggleSetting('instagram_message')}
                disabled={!notificationsEnabled}
              />
            </div>

            <Separator />

            {/* Vehicle Inquiry */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Car className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Consulta de vehiculo</p>
                  <p className="text-xs text-muted-foreground">
                    Cuando alguien pregunta por un vehiculo especifico
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.vehicle_inquiry}
                onCheckedChange={() => toggleSetting('vehicle_inquiry')}
                disabled={!notificationsEnabled}
              />
            </div>

            <Separator />

            {/* Financing Request */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Solicitud de financiamiento</p>
                  <p className="text-xs text-muted-foreground">
                    Cuando alguien solicita financiamiento
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.financing_request}
                onCheckedChange={() => toggleSetting('financing_request')}
                disabled={!notificationsEnabled}
              />
            </div>

            <Separator />

            {/* Test Drive Request */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-cyan-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Solicitud de test drive</p>
                  <p className="text-xs text-muted-foreground">
                    Cuando alguien quiere agendar un test drive
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.test_drive_request}
                onCheckedChange={() => toggleSetting('test_drive_request')}
                disabled={!notificationsEnabled}
              />
            </div>

            {/* Save Settings Button */}
            <div className="pt-4">
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
          </CardContent>
        </Card>
      )}

      {/* Disable Button */}
      {isConfigured && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisable}
            disabled={saving}
            className="text-destructive hover:text-destructive"
          >
            Desactivar notificaciones
          </Button>
        </div>
      )}

      {/* Info */}
      <Alert>
        <MessageSquare className="h-4 w-4" />
        <AlertDescription>
          Las notificaciones se envian a traves de WhatsApp Business de GoAuto.
          No necesitas configurar nada adicional.
        </AlertDescription>
      </Alert>
    </div>
  );
}
