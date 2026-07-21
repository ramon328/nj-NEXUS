import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FileText, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TermsContent } from './TermsContent';
import { PrivacyContent } from './PrivacyContent';

interface Props {
  open: boolean;
}

export function TermsAcceptanceDialog({ open }: Props) {
  const { client, user, refreshClient, signOut } = useAuth();
  const [tab, setTab] = useState<'terms' | 'privacy'>('terms');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (!accepted || !client?.id || !user?.id) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('clients')
      .update({
        terms_accepted_at: new Date().toISOString(),
        terms_accepted_by: user.id,
      })
      .eq('id', client.id);

    if (error) {
      toast.error('No se pudo registrar la aceptación. Reintenta o contacta a soporte.');
      console.error('[TermsAcceptanceDialog] update failed:', error);
      setSubmitting(false);
      return;
    }
    await refreshClient();
    toast.success('Términos aceptados. ¡Bienvenido!');
  };

  const handleReject = async () => {
    await signOut();
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="max-w-3xl gap-0 p-0 [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-xl">Términos y Política de Privacidad</DialogTitle>
          <DialogDescription>
            Para continuar usando GoAuto debes leer y aceptar nuestros términos y la política de privacidad.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b px-6">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab('terms')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === 'terms'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <FileText className="h-4 w-4" />
              Términos y Condiciones
            </button>
            <button
              type="button"
              onClick={() => setTab('privacy')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                tab === 'privacy'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Política de Privacidad
            </button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto px-6 py-5">
          {tab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>

        <div className="space-y-3 border-t bg-muted/30 px-6 py-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox
              checked={accepted}
              onCheckedChange={(v) => setAccepted(v === true)}
              disabled={submitting}
              className="mt-0.5"
            />
            <span>
              He leído y acepto los <strong>Términos y Condiciones</strong> y la{' '}
              <strong>Política de Privacidad</strong> de GoAuto en nombre de{' '}
              <span className="font-semibold">{client?.name ?? 'mi automotora'}</span>.
            </span>
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={handleReject} disabled={submitting}>
              No acepto, cerrar sesión
            </Button>
            <Button onClick={handleAccept} disabled={!accepted || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aceptar y continuar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
