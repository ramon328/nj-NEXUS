import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import StatusBadge from '@/components/vehiculos/StatusBadge';
import { cancelReservationAndCleanup } from '@/services/reservation';
import { ChevronDown, Check, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

interface VehicleState {
  id: number;
  name: string;
  color?: string | null;
}

interface StatusEditControlProps {
  vehicleId: number;
  currentStatusId?: number | null;
  currentStatusName: string;
  currentStatusColor?: string | null;
  /** Refresca el detalle del vehículo tras el cambio. */
  onUpdated?: () => void;
}

// Estados que requieren su propio flujo (cliente/precio/dialogo). No se pueden
// setear con un simple cambio de status_id desde aquí, así que se redirige al
// menú "Acciones".
const DIALOG_STATES = ['Vendido', 'Reservado'];

/**
 * Badge de estado editable en el Resumen del vehículo. Permite cambiar el estado
 * directamente (feedback Benjamin: "poder editar el estado desde aquí").
 *
 * Guardas:
 * - Salir de "Vendido": bloqueado (el trigger de BD igual lo revierte; hay que
 *   devolver la venta desde Ventas).
 * - Salir de "Reservado": confirma y limpia la reserva + abonos (mismo criterio
 *   que sacar un auto de Reservado en el tablero) vía cancelReservationAndCleanup.
 * - Entrar a "Vendido"/"Reservado": se redirige a "Acciones" (requieren datos).
 */
const StatusEditControl = ({
  vehicleId,
  currentStatusId,
  currentStatusName,
  currentStatusColor,
  onUpdated,
}: StatusEditControlProps) => {
  const { clientId, userData } = useAuth();
  const [states, setStates] = useState<VehicleState[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !clientId || states.length > 0) return;
    supabase
      .from('clients_vehicles_states')
      .select('id, name, color')
      .eq('client_id', clientId)
      .order('order', { ascending: true })
      .then(({ data }) => {
        if (data) setStates(data as VehicleState[]);
      });
  }, [open, clientId, states.length]);

  const applyChange = useCallback(
    async (target: VehicleState) => {
      if (!clientId || saving) return;
      if (target.name === currentStatusName) {
        setOpen(false);
        return;
      }

      // Entrar a estados con flujo propio -> usar Acciones.
      if (DIALOG_STATES.includes(target.name)) {
        toast({
          title: `Usa el botón "Acciones"`,
          description: `Para marcar el auto como ${target.name} usa "Acciones" (necesita datos de cliente y precio).`,
        });
        setOpen(false);
        return;
      }

      // Salir de Vendido: bloqueado.
      if (currentStatusName === 'Vendido') {
        toast({
          title: 'Este auto tiene una venta activa',
          description:
            'Para cambiar el estado, primero devuelve o rechaza la venta en la sección Ventas.',
          variant: 'destructive',
        });
        setOpen(false);
        return;
      }

      // Salir de Reservado: confirmar y limpiar la reserva + abonos.
      if (currentStatusName === 'Reservado') {
        const confirmed = window.confirm(
          `Este auto tiene una reserva activa. Al cambiar el estado a "${target.name}" se cancelará la reserva y se eliminarán sus abonos (pie). ¿Continuar?`
        );
        if (!confirmed) {
          setOpen(false);
          return;
        }
      }

      setSaving(true);
      try {
        if (currentStatusName === 'Reservado') {
          await cancelReservationAndCleanup(vehicleId);
        }

        const { error } = await supabase
          .from('vehicles')
          .update({
            status_id: target.id,
            state_updated_at: new Date().toISOString(),
          })
          .eq('id', vehicleId)
          .eq('client_id', clientId);

        if (error) throw error;

        // Historial de estado (best-effort, para la línea de tiempo).
        if (userData?.id && currentStatusId != null) {
          try {
            await supabase.from('vehicles_status_history').insert({
              vehicle_id: vehicleId,
              old_status_id: currentStatusId,
              new_status_id: target.id,
              changed_by: userData.id,
            });
          } catch (e) {
            console.warn('No se pudo registrar historial de estado:', e);
          }
        }

        toast({
          title: 'Estado actualizado',
          description: `El vehículo ahora está en "${target.name}".`,
        });
        setOpen(false);
        onUpdated?.();
      } catch (e) {
        console.error('Error updating vehicle status:', e);
        toast({
          title: 'Error',
          description: 'No se pudo actualizar el estado.',
          variant: 'destructive',
        });
      } finally {
        setSaving(false);
      }
    },
    [
      clientId,
      saving,
      currentStatusName,
      currentStatusId,
      vehicleId,
      userData,
      onUpdated,
    ]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={saving}>
        <button
          type='button'
          className='group inline-flex items-center gap-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          title='Cambiar estado'
        >
          <StatusBadge status={currentStatusName} color={currentStatusColor} />
          {saving ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin text-slate-400' />
          ) : (
            <ChevronDown className='h-3.5 w-3.5 text-slate-400 transition-colors group-hover:text-slate-600' />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        className='w-52 rounded-xl border-slate-200/60 p-1.5 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]'
      >
        {states.length === 0 ? (
          <div className='flex items-center justify-center py-3'>
            <Loader2 className='h-4 w-4 animate-spin text-slate-300' />
          </div>
        ) : (
          states.map((s) => {
            const isCurrent = s.name === currentStatusName;
            return (
              <DropdownMenuItem
                key={s.id}
                onClick={() => applyChange(s)}
                className='cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 focus:bg-slate-50'
              >
                <span
                  className='h-2.5 w-2.5 shrink-0 rounded-full'
                  style={{ backgroundColor: s.color || '#94a3b8' }}
                />
                <span
                  className={`flex-1 text-[13px] ${
                    isCurrent ? 'font-semibold text-slate-900' : 'text-slate-600'
                  }`}
                >
                  {s.name}
                </span>
                {isCurrent && <Check className='h-3.5 w-3.5 text-primary' />}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default StatusEditControl;
