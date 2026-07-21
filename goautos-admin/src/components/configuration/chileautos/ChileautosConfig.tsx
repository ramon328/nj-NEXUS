import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, ExternalLink, RefreshCw, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { useChileautosIntegration } from '@/hooks/chileautos';
import { useChileautosListings } from '@/hooks/chileautos';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ChileautosConfig = () => {
  const { t } = useTranslation('common');
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [credentials, setCredentials] = useState({
    seller_identifier: '',
  });

  const {
    integration,
    isLoading,
    isConnected,
    hasError,
    connect,
    isConnecting,
    updateConfig,
    isUpdatingConfig,
    disconnect,
    isDisconnecting,
    refreshToken,
    isRefreshingToken,
  } = useChileautosIntegration();

  const {
    publishedCount,
    pendingCount,
    errorCount,
    bulkSync,
    isBulkSyncing,
  } = useChileautosListings();

  const handleConnect = async () => {
    if (!credentials.seller_identifier) {
      return;
    }

    connect(credentials, {
      onSuccess: () => {
        setIsConnectDialogOpen(false);
        setCredentials({ seller_identifier: '' });
      },
    });
  };

  const handleDisconnect = () => {
    if (confirm('¿Estás seguro de que quieres desconectar ChileAutos? Los vehículos publicados permanecerán en ChileAutos pero ya no podrás gestionarlos desde aquí.')) {
      disconnect();
    }
  };

  const handleConfigChange = (key: string, value: boolean | string) => {
    updateConfig({ [key]: value });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-neutral-100 dark:to-neutral-400 bg-clip-text text-transparent">
            ChileAutos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Publica y gestiona tus vehículos en ChileAutos directamente desde GoAuto
          </p>
        </div>
        {isConnected && (
          <Button
            variant="outline"
            onClick={() => bulkSync()}
            disabled={isBulkSyncing}
          >
            {isBulkSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar Todo
              </>
            )}
          </Button>
        )}
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Car className="w-8 h-8 text-white" />
          </div>
          <div className="text-center max-w-md">
            <h3 className="text-xl font-medium mb-2">Conecta tu cuenta de ChileAutos</h3>
            <p className="text-muted-foreground mb-6">
              Conecta tu cuenta de ChileAutos para publicar y gestionar tus vehículos
              automáticamente. Solo necesitas tu Seller Identifier (GUID) proporcionado
              por ChileAutos.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white">
                    <Car className="h-4 w-4 mr-2" />
                    Conectar ChileAutos
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Conectar ChileAutos</DialogTitle>
                    <DialogDescription>
                      Ingresa el identificador de tu automotora en ChileAutos.
                      Lo puedes solicitar a soporte-dealer@chileautos.cl
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="seller_identifier">Seller Identifier (GUID)</Label>
                      <Input
                        id="seller_identifier"
                        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        value={credentials.seller_identifier}
                        onChange={(e) =>
                          setCredentials({ ...credentials, seller_identifier: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Este es el identificador único de tu automotora en ChileAutos.
                        Lo puedes solicitar a soporte-dealer@chileautos.cl
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsConnectDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleConnect}
                      disabled={
                        isConnecting ||
                        !credentials.seller_identifier
                      }
                      className="bg-gradient-to-r from-orange-500 to-red-600"
                    >
                      {isConnecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        'Conectar'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button variant="outline" asChild>
                <a
                  href="https://www.chileautos.cl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ir a ChileAutos
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Card */}
          <IntegrationCard
            id={integration!.id}
            title="ChileAutos"
            subtitle={`Seller: ${integration!.seller_identifier.slice(0, 8)}...`}
            createdAt={integration!.created_at}
            icon={Car}
            gradientFrom="from-orange-500"
            gradientTo="to-red-600"
            onDelete={handleDisconnect}
            onRenew={() => refreshToken()}
            isRenewing={isRefreshingToken}
            expiresAt={integration!.token_expires_at || undefined}
            extraActions={
              <div className="flex items-center gap-2">
                <Badge variant={hasError ? 'destructive' : 'default'}>
                  {hasError ? 'Error' : 'Activo'}
                </Badge>
              </div>
            }
          />

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Publicados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{publishedCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Con errores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              </CardContent>
            </Card>
          </div>

          {/* Last sync info */}
          {integration!.last_sync_at && (
            <p className="text-sm text-muted-foreground">
              Última sincronización:{' '}
              {formatDistanceToNow(new Date(integration!.last_sync_at), {
                addSuffix: true,
                locale: es,
              })}
            </p>
          )}

          {/* Error message */}
          {hasError && integration!.last_error && (
            <Card className="border-destructive">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-destructive">
                  Error de integración
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{integration!.last_error}</p>
              </CardContent>
            </Card>
          )}

          {/* Configuration */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="config">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  Configuración de sincronización
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sincronización automática</Label>
                      <p className="text-sm text-muted-foreground">
                        Sincronizar automáticamente cuando se agregue un vehículo
                      </p>
                    </div>
                    <Switch
                      checked={integration!.sync_on_publish}
                      onCheckedChange={(checked) =>
                        handleConfigChange('sync_on_publish', checked)
                      }
                      disabled={isUpdatingConfig}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Actualizar al editar</Label>
                      <p className="text-sm text-muted-foreground">
                        Actualizar en ChileAutos cuando se modifique un vehículo
                      </p>
                    </div>
                    <Switch
                      checked={integration!.sync_on_update}
                      onCheckedChange={(checked) =>
                        handleConfigChange('sync_on_update', checked)
                      }
                      disabled={isUpdatingConfig}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Marcar vendido automáticamente</Label>
                      <p className="text-sm text-muted-foreground">
                        Marcar como vendido en ChileAutos cuando se venda el vehículo
                      </p>
                    </div>
                    <Switch
                      checked={integration!.sync_on_sold}
                      onCheckedChange={(checked) =>
                        handleConfigChange('sync_on_sold', checked)
                      }
                      disabled={isUpdatingConfig}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp para leads</Label>
                    <Input
                      id="whatsapp"
                      placeholder="+56 9 1234 5678"
                      defaultValue={integration!.whatsapp_number || ''}
                      onBlur={(e) =>
                        handleConfigChange('whatsapp_number', e.target.value)
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Número de WhatsApp donde recibirás los leads de ChileAutos
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
};

export default ChileautosConfig;
