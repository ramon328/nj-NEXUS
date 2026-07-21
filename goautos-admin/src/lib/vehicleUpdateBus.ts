import { useEffect, useCallback, useState, useRef } from 'react';
import { Vehicle } from '@/types/vehicle';

export type VehicleUpdatePayload = {
  vehicleId: number;
  changes: Partial<Vehicle>;
};

const VEHICLE_UPDATE_EVENT = 'vehicle:update';

export function emitVehicleUpdate(vehicleId: number, changes: Partial<Vehicle>) {
  window.dispatchEvent(
    new CustomEvent<VehicleUpdatePayload>(VEHICLE_UPDATE_EVENT, {
      detail: { vehicleId, changes },
    })
  );
}

export function useVehicleUpdateListener(
  callback: (payload: VehicleUpdatePayload) => void
) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const handler = (e: Event) =>
      cbRef.current((e as CustomEvent<VehicleUpdatePayload>).detail);
    window.addEventListener(VEHICLE_UPDATE_EVENT, handler);
    return () => window.removeEventListener(VEHICLE_UPDATE_EVENT, handler);
  }, []);
}

export function useVehicleUpdateAnimation(vehicleId?: number) {
  const [isAnimating, setIsAnimating] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useVehicleUpdateListener(
    useCallback(
      (payload) => {
        if (vehicleId == null || payload.vehicleId !== vehicleId) return;
        setIsAnimating(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsAnimating(false), 1800);
      },
      [vehicleId]
    )
  );

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return isAnimating;
}

export function useAnimatingVehicleIds() {
  const [ids, setIds] = useState<Set<number>>(new Set());
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  useVehicleUpdateListener(
    useCallback((payload) => {
      const { vehicleId } = payload;
      setIds((prev) => new Set(prev).add(vehicleId));

      const existing = timers.current.get(vehicleId);
      if (existing) clearTimeout(existing);

      timers.current.set(
        vehicleId,
        setTimeout(() => {
          setIds((prev) => {
            const next = new Set(prev);
            next.delete(vehicleId);
            return next;
          });
          timers.current.delete(vehicleId);
        }, 1800)
      );
    }, [])
  );

  useEffect(
    () => () => timers.current.forEach((t) => clearTimeout(t)),
    []
  );

  return ids;
}
