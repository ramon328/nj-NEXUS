import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Bell, Send, Smartphone, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { friendlyError } from '@/utils/edgeFunctionErrors';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useState } from 'react';

export default function PushNotificationsConfig() {
  const {
    isSupported,
    permissionState,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  const [toggling, setToggling] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      if (checked) {
        const success = await subscribe();
        if (success) {
          toast.success('Notificaciones push activadas en este dispositivo');
        } else if (permissionState === 'denied') {
          toast.error('Permisos bloqueados. Actívalos desde la configuración del navegador.');
        } else {
          toast.error('No se pudieron activar las notificaciones');
        }
      } else {
        const success = await unsubscribe();
        if (success) {
          toast.success('Notificaciones push desactivadas en este dispositivo');
        }
      }
    } catch (error) {
      console.error('Toggle push error:', error);
      toast.error(friendlyError(error, 'send-push-notification'));
    } finally {
      setToggling(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await sendTest();
      toast.success('Notificación de prueba enviada');
    } catch (error) {
      console.error('Test push error:', error);
      toast.error(friendlyError(error, 'send-push-notification'));
    } finally {
      setTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSupported) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Las notificaciones push no están disponibles en este navegador.
          Usa Chrome, Edge, Firefox o Safari 16.4+ para activarlas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Notificaciones Push</h2>
          <p className="text-sm text-muted-foreground">
            Recibe alertas nativas en este dispositivo cuando lleguen nuevos leads
          </p>
        </div>
      </div>

      {/* Status Card when active */}
      {isSubscribed && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium">Notificaciones activas</p>
                  <p className="text-sm text-muted-foreground">Este dispositivo recibirá alertas</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
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

      {/* Permission blocked warning */}
      {permissionState === 'denied' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Los permisos de notificación están bloqueados. Para activarlos, ve a la configuración
            de tu navegador → Sitios → Notificaciones y permite las notificaciones para este sitio.
          </AlertDescription>
        </Alert>
      )}

      {/* Toggle Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Activar en este dispositivo
              </CardTitle>
              <CardDescription>
                Las notificaciones push se activan por dispositivo. Actívalas en cada
                dispositivo donde quieras recibirlas.
              </CardDescription>
            </div>
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={toggling || permissionState === 'denied'}
            />
          </div>
        </CardHeader>
      </Card>

      {/* Info */}
      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          Las notificaciones push funcionan incluso cuando la app está cerrada.
          Se envían automáticamente cuando llega un nuevo lead u otro evento importante.
        </AlertDescription>
      </Alert>
    </div>
  );
}
