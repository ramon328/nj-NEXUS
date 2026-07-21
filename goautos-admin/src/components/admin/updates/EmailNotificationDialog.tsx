import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  LuMail,
  LuSend,
  LuUsers,
  LuCheck,
  LuLoader,
  LuCircleAlert,
  LuCircleCheck,
} from 'react-icons/lu';
import {
  UpdateWithAuthor,
  sendTestUpdateEmail,
  sendUpdateNotificationToAllAdmins,
  getAdminEmails,
} from '@/services/updatesService';

interface EmailNotificationDialogProps {
  open: boolean;
  onClose: () => void;
  update: UpdateWithAuthor;
}

type Step = 'test' | 'confirm' | 'success';

const EmailNotificationDialog = ({
  open,
  onClose,
  update,
}: EmailNotificationDialogProps) => {
  const [step, setStep] = useState<Step>('test');

  // Early return if no update (but after hooks)
  const shouldRender = open && !!update;
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [isSendingAll, setIsSendingAll] = useState(false);
  const [adminCount, setAdminCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('test');
      setTestEmail('');
      setTestSent(false);
      setIsSendingTest(false);
      setIsSendingAll(false);
      setSentCount(0);
      loadAdminCount();
    }
  }, [open]);

  const loadAdminCount = async () => {
    const emails = await getAdminEmails();
    setAdminCount(emails.length);
  };

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({
        title: 'Error',
        description: 'Ingresa un correo electrónico válido',
        variant: 'destructive',
      });
      return;
    }

    setIsSendingTest(true);
    try {
      const result = await sendTestUpdateEmail(update, testEmail);

      if (result.success) {
        setTestSent(true);
        toast({
          title: 'Correo enviado',
          description: `Se envió el correo de prueba a ${testEmail}`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo enviar el correo de prueba',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al enviar el correo',
        variant: 'destructive',
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendToAll = async () => {
    setIsSendingAll(true);
    try {
      const result = await sendUpdateNotificationToAllAdmins(update);

      if (result.success) {
        setSentCount(result.sentCount);
        setStep('success');
        toast({
          title: 'Éxito',
          description: `Se notificó a ${result.sentCount} administradores`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.error || 'No se pudo enviar la notificación',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error al enviar las notificaciones',
        variant: 'destructive',
      });
    } finally {
      setIsSendingAll(false);
    }
  };

  const typeLabel = update?.type === 'tutorial' ? 'Tutorial' : 'Novedad';

  if (!update) {
    return null;
  }

  return (
    <Dialog open={shouldRender} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LuMail className="w-5 h-5 text-blue-500" />
            Notificar por Email
          </DialogTitle>
          <DialogDescription>
            Envía una notificación por correo sobre esta {typeLabel.toLowerCase()} a todos los administradores.
          </DialogDescription>
        </DialogHeader>

        {step === 'test' && (
          <div className="space-y-6 py-4">
            {/* Update Preview */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{typeLabel}</Badge>
                {update.featured && (
                  <Badge className="bg-yellow-100 text-yellow-700">Destacado</Badge>
                )}
              </div>
              <h4 className="font-semibold text-slate-900">{update.title}</h4>
              <p className="text-sm text-slate-500 line-clamp-2">{update.excerpt}</p>
            </div>

            {/* Admin count info */}
            <div className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50 rounded-lg p-3">
              <LuUsers className="w-4 h-4 text-blue-500" />
              <span>
                Se notificará a <strong>{adminCount}</strong> administradores
              </span>
            </div>

            {/* Test email section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Paso 1: Envía un correo de prueba
              </Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  disabled={isSendingTest}
                />
                <Button
                  onClick={handleSendTest}
                  disabled={isSendingTest || !testEmail}
                  variant={testSent ? 'outline' : 'default'}
                  className="shrink-0"
                >
                  {isSendingTest ? (
                    <LuLoader className="w-4 h-4 animate-spin" />
                  ) : testSent ? (
                    <>
                      <LuCheck className="w-4 h-4 mr-1" />
                      Enviado
                    </>
                  ) : (
                    <>
                      <LuSend className="w-4 h-4 mr-1" />
                      Probar
                    </>
                  )}
                </Button>
              </div>
              {testSent && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  <LuCircleCheck className="w-4 h-4" />
                  Revisa tu bandeja de entrada para verificar el correo
                </p>
              )}
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6 py-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <LuCircleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Confirmar envío masivo</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Estás a punto de enviar un correo a <strong>{adminCount}</strong> administradores
                  notificándoles sobre "{update.title}".
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-6 py-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <LuCircleCheck className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                ¡Notificación enviada!
              </h3>
              <p className="text-slate-500">
                Se ha notificado exitosamente a {sentCount} administradores sobre esta {typeLabel.toLowerCase()}.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'test' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={!testSent}
                className="gap-2"
              >
                <LuUsers className="w-4 h-4" />
                Continuar al envío
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('test')}>
                Volver
              </Button>
              <Button
                onClick={handleSendToAll}
                disabled={isSendingAll}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isSendingAll ? (
                  <>
                    <LuLoader className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <LuSend className="w-4 h-4" />
                    Enviar a {adminCount} admins
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={onClose} className="w-full">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailNotificationDialog;
