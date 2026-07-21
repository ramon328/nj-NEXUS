import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useMeliCloseStore } from '@/stores/meliCloseStore';

/**
 * Diálogo global (montado una vez en App). Cuando un auto con avisos activos en
 * MercadoLibre se marca como Vendido, pregunta si cerrar también esas
 * publicaciones en ML. Nada se cierra sin confirmación explícita del usuario.
 */
export function MeliCloseOnSoldDialog() {
  const pending = useMeliCloseStore((s) => s.pending);
  const dismiss = useMeliCloseStore((s) => s.dismiss);
  const [closing, setClosing] = useState(false);

  if (!pending) return null;
  const n = pending.postIds.length;
  const plural = n > 1;

  const handleConfirm = async () => {
    setClosing(true);
    let ok = 0;
    for (const id of pending.postIds) {
      try {
        const { data, error } = await supabase.functions.invoke(
          'update-mercadolibre-publication-status',
          { body: { publicationId: id, action: 'close' } }
        );
        if (!error && !(data as { error?: string })?.error) ok++;
      } catch (e) {
        console.warn('[MeLi close] error closing publication', id, e);
      }
    }
    setClosing(false);
    dismiss();
    toast({
      title:
        ok > 0
          ? `Aviso${ok > 1 ? 's' : ''} cerrado${ok > 1 ? 's' : ''} en MercadoLibre`
          : 'No se pudo cerrar en MercadoLibre',
      description: `${ok}/${n} publicación(es) cerrada(s).`,
      variant: ok > 0 ? undefined : 'destructive',
    });
  };

  return (
    <AlertDialog
      open={!!pending}
      onOpenChange={(o) => {
        if (!o && !closing) dismiss();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            ¿Cerrar {plural ? 'las publicaciones' : 'la publicación'} en MercadoLibre?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {pending.title ? <strong>{pending.title}</strong> : 'Este auto'} tiene {n}{' '}
            {plural ? 'avisos vigentes' : 'aviso vigente'} en MercadoLibre (activo{plural ? 's' : ''} o
            pausado{plural ? 's' : ''}). Como lo marcaste como vendido, ¿quieres cerrar
            {plural ? 'los' : 'lo'} también para que no siga{plural ? 'n' : ''} a la venta?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={closing}>No, dejar abierto{plural ? 's' : ''}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            disabled={closing}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
          >
            {closing ? 'Cerrando...' : `Sí, cerrar en ML`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
