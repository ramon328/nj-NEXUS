import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscriptionService } from '@/services/subscriptionService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Calendar, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const SubscriptionStatus: React.FC = () => {
  const { clientId } = useAuth();
  const { data: subscription, isLoading, refetch } = useSubscription(clientId);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!clientId) return;

    setIsCancelling(true);
    try {
      await subscriptionService.cancelSubscription(clientId);
      toast({
        title: 'Suscripción cancelada',
        description: 'Tu suscripción ha sido cancelada exitosamente',
      });
      refetch();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al cancelar suscripción',
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription?.has_active_subscription) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-lg">Sin suscripción activa</CardTitle>
          <CardDescription>
            Necesitas una suscripción para publicar tu sitio web
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.href = '/subscribe'}>
            Activar suscripción
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'trial':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Prueba gratis</Badge>;
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Activo</Badge>;
      case 'past_due':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Pago pendiente</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  const getDaysRemaining = () => {
    if (subscription.trial_ends_at && subscription.status === 'trial') {
      const trialEndsAt = new Date(subscription.trial_ends_at);
      const now = new Date();
      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysRemaining;
    }
    return null;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Tu suscripción</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.status === 'trial' && daysRemaining !== null && (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Periodo de prueba</p>
              <p className="text-sm text-gray-600">
                {daysRemaining > 0
                  ? `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''} restantes`
                  : 'Último día de prueba'
                }
              </p>
            </div>
          </div>
        )}

        {subscription.next_payment_date && subscription.status === 'active' && (
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="font-medium">Próximo pago</p>
              <p className="text-sm text-gray-600">
                {formatDistanceToNow(new Date(subscription.next_payment_date), {
                  addSuffix: true,
                  locale: es
                })}
              </p>
            </div>
          </div>
        )}

        {subscription.card_last_four && (
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="font-medium">Método de pago</p>
              <p className="text-sm text-gray-600">
                •••• •••• •••• {subscription.card_last_four}
              </p>
            </div>
          </div>
        )}

        {subscription.amount && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              Monto mensual: <span className="font-semibold">${subscription.amount.toLocaleString('es-CL')} {subscription.currency}</span>
            </p>
          </div>
        )}

        {subscription.status !== 'cancelled' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full" size="sm">
                Cancelar suscripción
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Cancelar suscripción?</AlertDialogTitle>
                <AlertDialogDescription>
                  Al cancelar tu suscripción, no podrás publicar tu sitio web.
                  Puedes reactivarla en cualquier momento.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>No, mantener</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isCancelling ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    'Sí, cancelar'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
};
