import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { LucideIcon, Trash2, RefreshCw, Loader2 } from 'lucide-react';
import { ReactNode } from 'react';

type IntegrationCardProps = {
  id: number;
  title: string;
  subtitle: string;
  createdAt: string;
  icon: LucideIcon;
  onDelete: (id: number) => void;
  gradientFrom?: string;
  gradientTo?: string;
  extraActions?: ReactNode;
  expiresAt?: string;
  onRenew?: (id: number) => void;
  isRenewing?: boolean;
  // 'expiry' (default): muestra Activo/Expirado + "Expira en Xh" + botón Renovar
  //   (lo usa ChileAutos). 'simple': oculta el detalle técnico del token, que el
  //   sistema renueva solo en cada acción; muestra "Conectado" y solo ofrece
  //   "Reconectar" cuando la conexión murió de verdad (needsReconnect).
  statusMode?: 'expiry' | 'simple';
  needsReconnect?: boolean;
  onReconnect?: (id: number) => void;
  isReconnecting?: boolean;
};

export function IntegrationCard({
  id,
  title,
  subtitle,
  createdAt,
  icon: Icon,
  onDelete,
  gradientFrom = 'from-blue-600',
  gradientTo = 'to-indigo-600',
  extraActions,
  expiresAt,
  onRenew,
  isRenewing = false,
  statusMode = 'expiry',
  needsReconnect = false,
  onReconnect,
  isReconnecting = false,
}: IntegrationCardProps) {
  const formattedDate = formatDistanceToNow(new Date(createdAt), {
    addSuffix: true,
    locale: es,
  });

  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  const expiresIn = expiresAt
    ? formatDistanceToNow(new Date(expiresAt), {
        addSuffix: true,
        locale: es,
      })
    : null;

  return (
    <Card className='overflow-hidden border border-border'>
      <div className={`h-2 bg-gradient-to-r ${gradientFrom} ${gradientTo}`} />
      <CardHeader className='flex flex-row items-center gap-4 pb-2'>
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientFrom} ${gradientTo} flex items-center justify-center flex-shrink-0`}
        >
          <Icon className='h-5 w-5 text-white' />
        </div>
        <div className='flex-1'>
          <CardTitle className='text-base font-medium'>{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className='space-y-2'>
        <p className='text-sm text-muted-foreground'>
          Conectado {formattedDate}
        </p>
        {statusMode === 'simple' ? (
          <div className='flex items-center gap-2'>
            <Badge variant={needsReconnect ? 'destructive' : 'secondary'} className='text-xs'>
              {needsReconnect ? 'Desconectado' : 'Conectado'}
            </Badge>
            {needsReconnect && (
              <span className='text-xs text-muted-foreground'>
                Necesita reconectarse
              </span>
            )}
          </div>
        ) : (
          expiresAt && (
            <div className='flex items-center gap-2'>
              <Badge variant={isExpired ? 'destructive' : 'secondary'} className='text-xs'>
                {isExpired ? 'Expirado' : 'Activo'}
              </Badge>
              <span className='text-xs text-muted-foreground'>
                {isExpired ? `Expiró ${expiresIn}` : `Expira ${expiresIn}`}
              </span>
            </div>
          )
        )}
      </CardContent>
      <CardFooter className='border-t bg-muted/20 p-2 flex justify-between gap-2'>
        {extraActions}
        {statusMode === 'simple'
          ? needsReconnect && onReconnect && (
              <Button
                variant='ghost'
                className='hover:bg-primary/10 hover:text-primary transition-colors text-sm h-8'
                onClick={() => onReconnect(id)}
                disabled={isReconnecting}
              >
                {isReconnecting ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                    Reconectando...
                  </>
                ) : (
                  <>
                    <RefreshCw className='h-4 w-4 mr-1' />
                    Reconectar
                  </>
                )}
              </Button>
            )
          : onRenew && (
              <Button
                variant='ghost'
                className='hover:bg-primary/10 hover:text-primary transition-colors text-sm h-8'
                onClick={() => onRenew(id)}
                disabled={isRenewing}
              >
                {isRenewing ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                    Renovando...
                  </>
                ) : (
                  <>
                    <RefreshCw className='h-4 w-4 mr-1' />
                    Renovar
                  </>
                )}
              </Button>
            )}
        <Button
          variant='ghost'
          className='ml-auto hover:bg-destructive/10 hover:text-destructive transition-colors text-sm h-8'
          onClick={() => onDelete(id)}
        >
          <Trash2 className='h-4 w-4 mr-1' />
          Desconectar
        </Button>
      </CardFooter>
    </Card>
  );
}
