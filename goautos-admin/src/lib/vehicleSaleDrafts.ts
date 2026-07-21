import type {
  SaleStep,
  SaleAdditional,
  VehicleExtra,
} from '@/stores/vehicleSaleStore';

export interface VehicleSaleDraft {
  savedAt: string;
  currentStep: SaleStep;
  furthestStepReached: SaleStep;
  saleInfo: any;
  tradeInInfo: any;
  additionals: SaleAdditional[];
  reservationExtras: VehicleExtra[];
}

const DRAFT_KEY_PREFIX = 'gv_sale_draft_v1';

const buildKey = (clientId: number, vehicleId: number) =>
  `${DRAFT_KEY_PREFIX}_${clientId}_${vehicleId}`;

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

export const saveSaleDraft = (
  clientId: number,
  vehicleId: number,
  data: Omit<VehicleSaleDraft, 'savedAt'>
): void => {
  if (!isBrowser()) return;
  const payload: VehicleSaleDraft = {
    ...data,
    savedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(
      buildKey(clientId, vehicleId),
      JSON.stringify(payload)
    );
  } catch (err) {
    console.warn('No se pudo guardar el borrador de venta', err);
  }
};

export const loadSaleDraft = (
  clientId: number,
  vehicleId: number
): VehicleSaleDraft | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(buildKey(clientId, vehicleId));
    if (!raw) return null;
    return JSON.parse(raw) as VehicleSaleDraft;
  } catch (err) {
    console.warn('No se pudo leer el borrador de venta', err);
    return null;
  }
};

export const clearSaleDraft = (clientId: number, vehicleId: number): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(buildKey(clientId, vehicleId));
  } catch (err) {
    console.warn('No se pudo borrar el borrador de venta', err);
  }
};

export const hasSaleDraft = (clientId: number, vehicleId: number): boolean => {
  return loadSaleDraft(clientId, vehicleId) !== null;
};

export const formatDraftDate = (isoDate: string): string => {
  try {
    const d = new Date(isoDate);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm} ${hh}:${min}`;
  } catch {
    return '';
  }
};
