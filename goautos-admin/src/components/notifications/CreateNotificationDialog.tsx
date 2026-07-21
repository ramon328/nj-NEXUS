import { useState, useEffect, useCallback } from 'react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, Search, Zap, CheckCircle, Info, Megaphone, Send, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: number;
  auth_id: string;
  first_name: string;
  last_name: string;
  email: string;
  rol: string;
}

const ICON_OPTIONS = [
  { value: 'bell', label: 'Campana', icon: Bell },
  { value: 'info', label: 'Info', icon: Info },
  { value: 'zap', label: 'Rayo', icon: Zap },
  { value: 'search', label: 'Buscar', icon: Search },
  { value: 'check-circle', label: 'Check', icon: CheckCircle },
  { value: 'megaphone', label: 'Megáfono', icon: Megaphone },
];

type TargetType = 'all' | 'role' | 'user';

interface CreateNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateNotificationDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateNotificationDialogProps) {
  const { clientId, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [icon, setIcon] = useState('bell');
  const [url, setUrl] = useState('');
  const [targetType, setTargetType] = useState<TargetType>('all');
  const [targetRole, setTargetRole] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  // Fetch team members for the user selector
  useEffect(() => {
    if (!open || !clientId) return;

    const fetchTeam = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, auth_id, first_name, last_name, email, rol')
        .eq('client_id', clientId)
        .order('first_name');

      if (data) setTeamMembers(data);
    };

    fetchTeam();
  }, [open, clientId]);

  const resetForm = useCallback(() => {
    setTitle('');
    setBody('');
    setIcon('bell');
    setUrl('');
    setTargetType('all');
    setTargetRole('');
    setTargetUserId('');
  }, []);

  const handleClose = (value: boolean) => {
    if (!value) resetForm();
    onOpenChange(value);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: 'Error', description: 'El título es requerido', variant: 'destructive' });
      return;
    }
    if (!body.trim()) {
      toast({ title: 'Error', description: 'El mensaje es requerido', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      client_id: clientId,
      type: 'general',
      title: title.trim(),
      body: body.trim(),
      icon,
      url: url.trim() || null,
      data: {},
      created_by: user?.id || null,
      target_user_id: null,
      target_role: null,
    };

    if (targetType === 'role' && targetRole) {
      payload.target_role = targetRole;
    } else if (targetType === 'user' && targetUserId) {
      payload.target_user_id = targetUserId;
    }

    const { error } = await supabase.from('notifications').insert(payload);

    if (error) {
      setIsSubmitting(false);
      console.error('Error creating notification:', error);
      toast({ title: 'Error', description: 'No se pudo enviar la notificación', variant: 'destructive' });
      return;
    }

    // Trigger push queue processing (fallback if pg_net trigger is not active)
    supabase.functions.invoke('send-push-notification', {
      body: { processQueue: true },
    }).catch(() => { /* silent — pg_net trigger handles this normally */ });

    setIsSubmitting(false);
    toast({ title: 'Notificación enviada', description: 'Se ha enviado correctamente (in-app + push)' });
    resetForm();
    onOpenChange(false);
    onCreated();
  }, [title, body, icon, url, targetType, targetRole, targetUserId, clientId, user?.id, onOpenChange, onCreated, resetForm]);

  // Unique roles from team members
  const roles = [...new Set(teamMembers.map((m) => m.rol))].filter(Boolean);

  return (
    <Drawer open={open} onOpenChange={handleClose} direction="right">
      <DrawerContentRight className="md:min-w-[480px]">
        <div className="flex flex-col h-full">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
                e.preventDefault();
              }
            }}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-[16px] font-semibold text-slate-900">
                Enviar notificación
              </h2>
            </div>

            {/* Form Content */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
              <div className="space-y-5">
                {/* Notification content section */}
                <div className="flex items-center gap-2 pb-1">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-cyan-50 text-cyan-600">
                    <Send className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-800">
                    Contenido
                  </span>
                </div>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-[13px] text-slate-700 font-medium">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Reunión de equipo mañana"
                    maxLength={100}
                  />
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <label className="text-[13px] text-slate-700 font-medium">
                    Mensaje <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Escribe el contenido de la notificación..."
                    rows={3}
                    maxLength={500}
                    className="resize-none"
                  />
                  <p className="text-[11px] text-slate-400 text-right">{body.length}/500</p>
                </div>

                {/* Icon selector */}
                <div className="space-y-1.5">
                  <label className="text-[13px] text-slate-700 font-medium">Icono</label>
                  <div className="flex gap-2">
                    {ICON_OPTIONS.map((opt) => {
                      const IconComp = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setIcon(opt.value)}
                          title={opt.label}
                          className={cn(
                            'h-9 w-9 rounded-lg flex items-center justify-center transition-colors border',
                            icon === opt.value
                              ? 'bg-primary/10 border-primary/30 text-primary'
                              : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                          )}
                        >
                          <IconComp className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* URL (optional) */}
                <div className="space-y-1.5">
                  <label className="text-[13px] text-slate-700 font-medium">
                    Enlace (opcional)
                  </label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="/vehiculos o /ventas"
                  />
                  <p className="text-[11px] text-slate-400">
                    Ruta interna a la que navega al hacer click
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-100" />

                {/* Target section */}
                <div className="flex items-center gap-2 pb-1">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-50 text-blue-600">
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-800">
                    Destinatario
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[13px] text-slate-700 font-medium">Enviar a</label>
                    <Select value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los usuarios</SelectItem>
                        <SelectItem value="role">Un rol específico</SelectItem>
                        <SelectItem value="user">Un usuario específico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Role selector */}
                  {targetType === 'role' && (
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-slate-700 font-medium">Rol</label>
                      <Select value={targetRole} onValueChange={setTargetRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r === 'admin' ? 'Administrador' : r === 'seller' ? 'Vendedor' : r === 'jefe' ? 'Jefe' : r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* User selector */}
                  {targetType === 'user' && (
                    <div className="space-y-1.5">
                      <label className="text-[13px] text-slate-700 font-medium">Usuario</label>
                      <Select value={targetUserId} onValueChange={setTargetUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map((m) => (
                            <SelectItem key={m.auth_id} value={m.auth_id}>
                              {m.first_name} {m.last_name} ({m.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => handleClose(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-[13px]">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span className="text-[13px]">Enviar notificación</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DrawerContentRight>
    </Drawer>
  );
}
