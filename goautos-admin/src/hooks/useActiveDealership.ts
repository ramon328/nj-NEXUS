import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useActiveDealershipStore } from '@/stores/activeDealershipStore';
import { PermissionCode } from '@/types/permissions';

export interface ActiveDealership {
  /** Ids de las sedes asignadas al usuario logueado (tabla user_dealerships). Vacío = ninguna asignada. */
  assignedDealershipIds: number[];
  /**
   * True si el usuario está restringido a sus sedes asignadas.
   * Regla: tiene >=1 sede asignada Y su rol NO tiene el permiso dealerships.view_all.
   */
  isRestricted: boolean;
  /** True si el usuario puede ver todas las sedes (permiso dealerships.view_all, admin o superadmin). */
  canSelectAll: boolean;
  /** Sede seleccionada en el selector del TopBar, o null = todas las sedes permitidas. */
  activeDealershipId: number | null;
  /**
   * Ids de sedes que el usuario puede ver, listo para filtrar (`.in('dealership_id', ids)`):
   *   - null  => sin filtro (ve todas las sedes del cliente).
   *   - array => solo esas sedes.
   * Se combina la selección del selector con la restricción por rol/asignación.
   */
  visibleDealershipIds: number[] | null;
  /** True mientras se cargan las sedes asignadas del usuario. */
  isLoading: boolean;
}

/**
 * Fuente única de verdad de la sede (sucursal) activa.
 *
 * Combina tres cosas:
 *   1. Las sedes asignadas al usuario logueado (tabla `user_dealerships`).
 *   2. Si su rol tiene el permiso `dealerships.view_all` (=> NO restringido, ve todas).
 *   3. La sede seleccionada en el selector del TopBar (`activeDealershipStore`).
 *
 * SEMÁNTICA (espejo de la migración 20260706120000):
 *   - Sin sedes asignadas               => NO restringido (retrocompatibilidad total).
 *   - Con sedes asignadas + view_all     => NO restringido; la asignación es solo
 *                                           su "sede base" (preselección informativa).
 *   - Con sedes asignadas + sin view_all => RESTRINGIDO a esas sedes.
 *
 * `visibleDealershipIds` es lo que consumen los hooks de datos (slices siguientes):
 *   - null  => no aplicar filtro de sede.
 *   - array => aplicar `.in('dealership_id', array)`.
 */
export const useActiveDealership = (): ActiveDealership => {
  const { userData } = useAuth();
  const { hasPermission } = usePermissions();
  const selectedDealershipId = useActiveDealershipStore((s) => s.selectedDealershipId);

  const userId = userData?.id;
  // Admin/superadmin (bypass en usePermissions) o cualquier rol con dealerships.view_all.
  const canSelectAll = hasPermission(PermissionCode.DEALERSHIPS_VIEW_ALL);

  // Sedes asignadas al usuario logueado. Query propia (no toca AuthContext); la RLS
  // "Users can view own dealerships" permite al usuario leer sus propias filas.
  // Si la tabla aún no existe (migración sin aplicar) o falla, se trata como "sin
  // sedes asignadas" => usuario NO restringido (comportamiento actual). Retrocompatible.
  const { data: assignedDealershipIds = [], isLoading } = useQuery({
    queryKey: ['user_dealerships', userId],
    queryFn: async (): Promise<number[]> => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('user_dealerships')
        .select('dealership_id')
        .eq('user_id', userId);
      if (error) {
        // No romper: sin asignación conocida = sin restricción.
        console.error('Error fetching user_dealerships:', error);
        return [];
      }
      return (data || []).map((row) => row.dealership_id as number);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  return useMemo<ActiveDealership>(() => {
    const hasAssignments = assignedDealershipIds.length > 0;
    const isRestricted = hasAssignments && !canSelectAll;

    if (isRestricted) {
      // Solo puede elegir entre sus sedes asignadas. Una selección fuera de ese
      // conjunto (stale, sede desasignada, etc.) se ignora => "todas mis sedes".
      const activeDealershipId =
        selectedDealershipId != null && assignedDealershipIds.includes(selectedDealershipId)
          ? selectedDealershipId
          : null;

      const visibleDealershipIds =
        activeDealershipId != null ? [activeDealershipId] : assignedDealershipIds;

      return {
        assignedDealershipIds,
        isRestricted: true,
        canSelectAll: false,
        activeDealershipId,
        visibleDealershipIds,
        isLoading,
      };
    }

    // NO restringido: puede elegir cualquier sede o "Todas".
    //   - selección con id => filtrar a esa sede.
    //   - selección null   => sin filtro (ve todas).
    const activeDealershipId = selectedDealershipId;
    const visibleDealershipIds =
      activeDealershipId != null ? [activeDealershipId] : null;

    return {
      assignedDealershipIds,
      isRestricted: false,
      canSelectAll,
      activeDealershipId,
      visibleDealershipIds,
      isLoading,
    };
  }, [assignedDealershipIds, canSelectAll, selectedDealershipId, isLoading]);
};
