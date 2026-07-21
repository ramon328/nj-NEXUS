import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const TaskApprovalSettings: React.FC = () => {
  const { clientId, refreshClient } = useAuth();
  const [enabled, setEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('tasks_require_approval')
        .eq('id', clientId)
        .single();
      if (!active) return;
      if (error) {
        console.error('Error loading tasks_require_approval:', error);
        toast.error('No se pudo cargar la configuración de tareas.');
      } else {
        setEnabled(!!data?.tasks_require_approval);
      }
      setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [clientId]);

  const handleToggle = async (next: boolean) => {
    if (!clientId || isSaving) return;
    const previous = enabled;
    setEnabled(next);
    setIsSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({ tasks_require_approval: next })
      .eq('id', clientId);
    setIsSaving(false);
    if (error) {
      console.error('Error saving tasks_require_approval:', error);
      setEnabled(previous);
      toast.error('No se pudo guardar el cambio.');
      return;
    }
    await refreshClient();
    toast.success(
      next
        ? 'Aprobación de tareas activada. Los usuarios no-admin enviarán las tareas a aprobación.'
        : 'Aprobación de tareas desactivada. Los usuarios completan tareas directamente.'
    );
  };

  return (
    <Card className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
      <CardHeader>
        <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight flex items-center gap-2'>
          <ClipboardCheck className='h-4 w-4 text-slate-500' />
          Tareas
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='flex items-start justify-between gap-4 rounded-xl border border-slate-200/60 p-4'>
          <div className='flex-1 min-w-0'>
            <p className='text-[14px] font-medium text-slate-900'>
              Requerir aprobación del administrador
            </p>
            <p className='text-[12px] text-slate-500 mt-1'>
              Cuando está activo, las tareas que un vendedor (o cualquier usuario no
              administrador) marca como completadas pasan a "Pendiente de aprobación".
              Un admin tiene que aprobarlas o rechazarlas explícitamente para que se
              consideren cerradas. Los administradores se autoaprueban.
            </p>
          </div>
          <div className='flex items-center pt-1'>
            {isLoading ? (
              <Loader2 className='h-4 w-4 animate-spin text-slate-400' />
            ) : (
              <Switch
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={isSaving}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskApprovalSettings;
