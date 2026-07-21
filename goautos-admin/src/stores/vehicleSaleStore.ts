import { Customer } from '@/types/customer';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface TradeInVehicle {
  id: string; // client-side ID for React keys
  license_plate: string;
  brand?: string;
  brand_id: string;
  model?: string;
  model_id: string | number;
  year: number;
  trade_in_value: number;
}

let _tradeInCounter = 0;
export const generateTradeInId = () => `ti_${Date.now()}_${++_tradeInCounter}`;

// Un adicional cuenta como plata que paga el CLIENTE sólo si NO es un gasto que
// absorbe la automotora (kind='expense') y NO es un cargo al consignador
// (assumedBy='consignor'). El 'consignor' es NEUTRO para el comprador: lo paga el
// consignador de su liquidación, no el cliente → no suma al "Total a pagar" ni al
// precio de venta (coherente con la línea de tiempo y con el margen, que también
// lo excluyen). Retrocompatible: sin assumedBy la línea sigue el criterio binario.
export const isCustomerIncomeAdditional = (add: {
  kind?: 'income' | 'expense';
  assumedBy?: 'dealership' | 'customer' | 'consignor';
}): boolean =>
  (add?.kind ?? 'income') !== 'expense' && add?.assumedBy !== 'consignor';

// Lo que paga el cliente SIN clamps: precio venta + transferencia cobrada +
// adicionales (income del cliente) + adicionales de reserva − total de la parte de
// pago. Si es NEGATIVO, ese excedente es "saldo a favor del cliente".
const computeRawRemaining = (state: any): number => {
  const totalTradeIn = state.tradeInInfo?.hasTradeIn
    ? state.tradeInInfo.vehicles.reduce(
        (s: number, v: any) => s + (v.trade_in_value || 0),
        0
      )
    : 0;
  const transferToCharge = state.saleInfo?.transferValueCharged
    ? state.saleInfo.transferValue || 0
    : 0;
  const additionalExtras = (state.additionals || []).reduce(
    (s: number, add: any) => s + (isCustomerIncomeAdditional(add) ? add.price : 0),
    0
  );
  const reservationAdditionals = (state.reservationExtras || [])
    .filter((e: any) => e.type === 'reservation_additional')
    .reduce((s: number, e: any) => s + e.amount, 0);
  return (
    (state.saleInfo?.salePrice || 0) +
    transferToCharge +
    additionalExtras +
    reservationAdditionals -
    totalTradeIn
  );
};

export interface PaymentItem {
  id: string;
  title: string;
  amount: number;
  /** Vencimiento de la cuota/letra a plazo (YYYY-MM-DD). Solo para pendientes. */
  dueDate?: string;
  /** false = cuota/letra a plazo (PENDIENTE de pago); true/undefined = pago recibido. */
  paid?: boolean;
}

export interface VehicleExtra {
  id: number;
  title: string;
  amount: number;
  description?: string;
  type: 'reservation_payment' | 'reservation_additional';
  created_at: string;
  vehicle_id: number;
}

export interface SaleAdditional {
  id?: number;
  title: string;
  price: number;
  description?: string;
  /**
   * 'income' (default) — el cliente lo paga sobre el precio base, suma al
   *   precio total de venta y queda como dealershipIncome en el resumen.
   * 'expense' — la automotora lo absorbe, NO suma al precio total de venta,
   *   y se descuenta de la utilidad como dealershipExpense.
   */
  kind?: 'income' | 'expense';
  /**
   * assumed_by ORIGINAL con el que la fila llegó de la BD (opcional; ausente en
   * adicionales nuevos o drafts persistidos viejos). El toggle del wizard es
   * binario (income/expense) y no puede representar el tercer valor 'consignor';
   * al guardar, syncSaleAdditionals preserva este valor cuando el usuario no
   * cambió el tipo, para NO aplastar un 'consignor' cargado desde el cierre.
   */
  assumedBy?: 'dealership' | 'customer' | 'consignor';
  /**
   * PASS-THROUGH: dinero que la automotora solo traspasa (ej. transferencia de dominio
   * / comisión de tarjeta cobrada al cliente y pagada a un tercero). Si true, la línea
   * NO afecta el margen (informativa). Opcional (default false) → retrocompatible con
   * drafts persistidos viejos. Se preserva por el círculo load→store→sync→update para
   * que editar la venta no lo resetee.
   */
  isPassthrough?: boolean;
}

// Step types
// Flujo de 4 pasos: Cliente → Venta → Permuta y extras → Resumen.
// 'trade-in' es el paso combinado "Permuta + Adicionales". Se eliminó el paso
// dedicado 'payments' (el desglose de pago ya no es obligatorio).
export type SaleStep =
  | 'customer-selection'
  | 'sale-info'
  | 'trade-in'
  | 'summary';

interface SaleInfo {
  customerId: number | null;
  customer: Customer | null;
  skipCustomer: boolean;
  salePrice: number;
  paymentMethod: string;
  financiera: string;
  /** Comisión que paga la financiera a la automotora (venta a crédito). Uso interno. */
  financingCommission: number;
  notes: string;
  sellerId: number | null;
  commissionPercentage: number | null;
  payments: PaymentItem[];
  showPaymentBreakdown: boolean;
  transferValue?: number; // <-- Agregado
  /**
   * ¿El valor de transferencia (CRT) se le cobra al cliente? Si true, suma al
   * total a pagar / saldo y aparece en la nota de venta. Si false, es solo
   * informativo. No afecta la utilidad/margen (el CRT es pass-through).
   */
  transferValueCharged: boolean;
  // Fecha de la venta en formato YYYY-MM-DD. Permite registrar
  // ventas con fecha distinta a hoy (ej. backfill desde Excel).
  saleDate: string;
}

interface TradeInInfo {
  hasTradeIn: boolean;
  vehicles: TradeInVehicle[];
}

interface VehicleSaleState {
  // Current step
  currentStep: SaleStep;
  // Track the furthest step reached in create mode
  furthestStepReached: SaleStep;

  // Vehicle and mode info
  vehicle: any;
  isEditMode: boolean;
  saleId: number | null;
  vehicleSaleId: number | null;
  documentId: number | null;

  // Step 1: Sale Information
  saleInfo: SaleInfo;

  // Step 2: Trade-in
  tradeInInfo: TradeInInfo;

  // Step 3: Additionals
  additionals: SaleAdditional[];

  // Reservation extras (payments and additionals from vehicles_extras)
  reservationExtras: VehicleExtra[];

  // UI State
  isSubmitting: boolean;
  isDialogOpen: boolean;

  // Actions
  setCurrentStep: (step: SaleStep) => void;
  setVehicle: (vehicle: any) => void;
  setVehicleForEdit: (vehicle: any) => void;
  setEditMode: (isEdit: boolean, saleId?: number, documentId?: number) => void;
  setDocumentId: (documentId: number) => void;
  setVehicleSaleId: (vehicleSaleId: number) => void;

  // Sale Info Actions
  updateSaleInfo: (updates: Partial<SaleInfo>) => void;
  setCustomer: (customer: Customer | null) => void;
  setSkipCustomer: (skip: boolean) => void;
  addPayment: (payment: PaymentItem) => void;
  updatePayment: (paymentId: string, updates: Partial<PaymentItem>) => void;
  removePayment: (paymentId: string) => void;

  // Trade-in Actions
  updateTradeInInfo: (updates: Partial<TradeInInfo>) => void;
  addTradeInVehicle: () => void;
  removeTradeInVehicle: (vehicleId: string) => void;
  updateTradeInVehicle: (vehicleId: string, updates: Partial<TradeInVehicle>) => void;
  setTradeInVehicles: (vehicles: TradeInVehicle[]) => void;

  // Additionals Actions
  addAdditional: (additional: SaleAdditional) => void;
  updateAdditional: (id: string, updates: Partial<SaleAdditional>) => void;
  removeAdditional: (id: string) => void;
  setAdditionals: (additionals: SaleAdditional[]) => void;

  // Reservation Extras Actions
  setReservationExtras: (extras: VehicleExtra[]) => void;

  // UI Actions
  setIsSubmitting: (isSubmitting: boolean) => void;
  setIsDialogOpen: (isOpen: boolean) => void;

  // Utility Actions
  resetStore: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // Computed values
  getTotalSalePrice: () => number;
  getRemainingAmount: () => number;
  /** Saldo a favor del cliente: si la toma (parte de pago) supera lo que debe
   *  pagar, el excedente se le queda debiendo al cliente. 0 si no aplica. */
  getCustomerCredit: () => number;
  getTotalPayments: () => number;
  /** Suma de cuotas/letras PENDIENTES (paid === false) = saldo a pagar del plan. */
  getPendingPayments: () => number;
  getRemainingToAllocate: () => number;
  /**
   * Saldo respecto a lo efectivamente COBRADO (pagos recibidos, sin las cuotas a
   * plazo pendientes). < 0 sólo cuando lo cobrado supera el total → sobrepago real.
   * Se usa para el aviso de sobrepago, que NO debe dispararse por letras a plazo
   * con interés (paid=false), un flujo de venta financiada perfectamente válido.
   */
  getReceivedRemaining: () => number;
  getTotalAdditionals: () => number;
  canProceedToNextStep: () => boolean;
  canNavigateToStep: (step: SaleStep) => boolean;
}

const todayISODate = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const initialSaleInfo: SaleInfo = {
  customerId: null,
  customer: null,
  skipCustomer: false,
  salePrice: 0,
  paymentMethod: 'cash',
  financiera: '',
  financingCommission: 0,
  notes: '',
  sellerId: null,
  commissionPercentage: null,
  payments: [],
  showPaymentBreakdown: false,
  transferValue: 0, // <-- Agregado
  transferValueCharged: true, // default: se cobra (consistente con documentos)
  saleDate: todayISODate(),
};

const createEmptyTradeInVehicle = (): TradeInVehicle => ({
  id: generateTradeInId(),
  license_plate: '',
  brand_id: '',
  model_id: '',
  year: new Date().getFullYear(),
  trade_in_value: 0,
});

const initialTradeInInfo: TradeInInfo = {
  hasTradeIn: false,
  vehicles: [],
};

const stepOrder: SaleStep[] = [
  'customer-selection',
  'sale-info',
  'trade-in',
  'summary',
];

export const useVehicleSaleStore = create<VehicleSaleState>()(
  persist(
    (set, get) => ({
  // Initial state
  currentStep: 'customer-selection',
  furthestStepReached: 'customer-selection',
  vehicle: null,
  isEditMode: false,
  saleId: null,
  vehicleSaleId: null,
  documentId: null,
  saleInfo: { ...initialSaleInfo },
  tradeInInfo: { ...initialTradeInInfo },
  additionals: [],
  reservationExtras: [],
  isSubmitting: false,
  isDialogOpen: false,

  // Step navigation
  setCurrentStep: (step) => {
    const state = get();
    const currentStepIndex = stepOrder.indexOf(state.currentStep);
    const newStepIndex = stepOrder.indexOf(step);
    const furthestStepIndex = stepOrder.indexOf(state.furthestStepReached);

    // Update furthest step reached if moving forward
    if (newStepIndex > furthestStepIndex) {
      set({ currentStep: step, furthestStepReached: step });
    } else {
      set({ currentStep: step });
    }
  },

  goToNextStep: () => {
    const state = get();
    const currentIndex = stepOrder.indexOf(state.currentStep);
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      const furthestIndex = stepOrder.indexOf(state.furthestStepReached);

      // Update furthest step reached when going to next step
      if (currentIndex + 1 > furthestIndex) {
        set({
          currentStep: nextStep,
          furthestStepReached: nextStep,
        });
      } else {
        set({ currentStep: nextStep });
      }
    }
  },

  goToPreviousStep: () => {
    const currentIndex = stepOrder.indexOf(get().currentStep);
    if (currentIndex > 0) {
      set({ currentStep: stepOrder[currentIndex - 1] });
    }
  },

  // Vehicle and mode
  setVehicle: (vehicle) => {
    const salePrice = vehicle?.price
      ? vehicle.price * (1 - (vehicle.discount_percentage || 0) / 100)
      : 0;
    set({
      vehicle,
      saleInfo: {
        ...get().saleInfo,
        salePrice,
        // Prefill con el valor de transferencia ya cargado en el vehículo.
        transferValue: Number(vehicle?.transfer_value) || 0,
        // Por defecto se cobra (se sobrescribe al editar con el flag real).
        transferValueCharged: true,
      },
    });
  },

  setVehicleForEdit: (vehicle) =>
    set({
      vehicle,
      saleInfo: {
        ...get().saleInfo,
        // Se sobrescribe luego con el valor real de la venta en
        // loadSaleDataToStore; este prefill cubre el caso de que falte.
        transferValue: Number(vehicle?.transfer_value) || 0,
        transferValueCharged: true,
      },
    }),

  setEditMode: (isEdit, saleId, documentId) =>
    set({
      isEditMode: isEdit,
      saleId: saleId || null,
      documentId: documentId || null,
    }),

  setDocumentId: (documentId) => set({ documentId }),

  setVehicleSaleId: (vehicleSaleId) => set({ vehicleSaleId }),

  // Sale Info Actions
  updateSaleInfo: (updates) =>
    set({ saleInfo: { ...get().saleInfo, ...updates } }),

  setCustomer: (customer) =>
    set({
      saleInfo: {
        ...get().saleInfo,
        customer,
        customerId: customer?.id || null,
        skipCustomer: customer ? false : get().saleInfo.skipCustomer,
      },
    }),

  setSkipCustomer: (skip) =>
    set({
      saleInfo: {
        ...get().saleInfo,
        skipCustomer: skip,
        ...(skip ? { customer: null, customerId: null } : {}),
      },
    }),

  addPayment: (payment) =>
    set({
      saleInfo: {
        ...get().saleInfo,
        payments: [...get().saleInfo.payments, payment],
      },
    }),

  updatePayment: (paymentId, updates) =>
    set({
      saleInfo: {
        ...get().saleInfo,
        payments: get().saleInfo.payments.map((p) =>
          p.id === paymentId ? { ...p, ...updates } : p
        ),
      },
    }),

  removePayment: (paymentId) =>
    set({
      saleInfo: {
        ...get().saleInfo,
        payments: get().saleInfo.payments.filter((p) => p.id !== paymentId),
      },
    }),

  // Trade-in Actions
  updateTradeInInfo: (updates) =>
    set({ tradeInInfo: { ...get().tradeInInfo, ...updates } }),

  addTradeInVehicle: () =>
    set({
      tradeInInfo: {
        ...get().tradeInInfo,
        vehicles: [...get().tradeInInfo.vehicles, createEmptyTradeInVehicle()],
      },
    }),

  removeTradeInVehicle: (vehicleId) =>
    set({
      tradeInInfo: {
        ...get().tradeInInfo,
        vehicles: get().tradeInInfo.vehicles.filter((v) => v.id !== vehicleId),
      },
    }),

  updateTradeInVehicle: (vehicleId, updates) =>
    set({
      tradeInInfo: {
        ...get().tradeInInfo,
        vehicles: get().tradeInInfo.vehicles.map((v) =>
          v.id === vehicleId ? { ...v, ...updates } : v
        ),
      },
    }),

  setTradeInVehicles: (vehicles) =>
    set({
      tradeInInfo: {
        ...get().tradeInInfo,
        vehicles,
      },
    }),

  // Additionals Actions
  addAdditional: (additional) =>
    set({ additionals: [...get().additionals, additional] }),

  updateAdditional: (id, updates) =>
    set({
      additionals: get().additionals.map((a) =>
        a.id === Number(id) ? { ...a, ...updates } : a
      ),
    }),

  removeAdditional: (id) =>
    set({
      additionals: get().additionals.filter((a) => a.id !== Number(id)),
    }),

  setAdditionals: (additionals) => set({ additionals }),

  // Reservation Extras Actions
  setReservationExtras: (extras) => set({ reservationExtras: extras }),

  // UI Actions
  setIsSubmitting: (isSubmitting) => set({ isSubmitting }),

  setIsDialogOpen: (isOpen) => {
    set({ isDialogOpen: isOpen });
    if (!isOpen) {
      get().resetStore();
    }
  },

  // Utility Actions
  resetStore: () =>
    set({
      currentStep: 'customer-selection',
      furthestStepReached: 'customer-selection',
      vehicle: null,
      isEditMode: false,
      saleId: null,
      vehicleSaleId: null,
      documentId: null,
      saleInfo: { ...initialSaleInfo, saleDate: todayISODate() },
      tradeInInfo: { ...initialTradeInInfo },
      additionals: [],
      reservationExtras: [],
      isSubmitting: false,
    }),

  // Computed values
  getTotalSalePrice: () => {
    const state = get();
    // Sólo los adicionales que paga el cliente suman al precio de venta. Los
    // 'expense' los absorbe la automotora y los 'consignor' los paga el
    // consignador de su liquidación → ninguno se le cobra al comprador.
    const additionalsIncomeTotal = state.additionals.reduce(
      (sum, add) => sum + (isCustomerIncomeAdditional(add) ? add.price : 0),
      0
    );
    // El CRT solo suma al total que paga el cliente si está marcado como cobrado.
    const transferToCharge = state.saleInfo.transferValueCharged
      ? state.saleInfo.transferValue || 0
      : 0;
    return (
      (state.saleInfo.salePrice || 0) +
      transferToCharge +
      additionalsIncomeTotal +
      state.reservationExtras
        .filter((extra) => extra.type === 'reservation_additional')
        .reduce((sum, extra) => sum + extra.amount, 0)
    );
  },

  getRemainingAmount: () => Math.max(0, computeRawRemaining(get())),

  // Saldo a favor del cliente: si la parte de pago (toma) supera lo que debe pagar,
  // el excedente se le queda debiendo. (Bug reportado por Tuauto: el auto recibido
  // valía más que el vendido y no dejaba reflejar el saldo a favor.)
  getCustomerCredit: () => Math.max(0, -computeRawRemaining(get())),

  getTotalPayments: () => {
    const state = get();
    const salePayments = state.saleInfo.payments.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const reservationPayments = state.reservationExtras
      .filter((extra) => extra.type === 'reservation_payment')
      .reduce((sum, extra) => sum + extra.amount, 0);

    return salePayments + reservationPayments;
  },

  // Suma de cuotas/letras a plazo NO pagadas (paid === false). Es el saldo que el
  // cliente todavía debe según el plan de pago (las letras a futuro).
  getPendingPayments: () => {
    return get()
      .saleInfo.payments.filter((p) => p.paid === false)
      .reduce((sum, p) => sum + p.amount, 0);
  },

  getRemainingToAllocate: () => {
    const state = get();
    return state.getRemainingAmount() - state.getTotalPayments();
  },

  // Saldo contra lo REALMENTE cobrado: total a pagar − pagos recibidos (excluye las
  // cuotas/letras a plazo pendientes, que llevan interés y por naturaleza pueden
  // superar el precio contado). Sólo es negativo cuando lo cobrado supera el total,
  // que es el único sobrepago genuino.
  getReceivedRemaining: () => {
    const state = get();
    const receivedPayments = state.getTotalPayments() - state.getPendingPayments();
    return state.getRemainingAmount() - receivedPayments;
  },

  getTotalAdditionals: () => {
    const state = get();
    const saleAdditionals = state.additionals.reduce(
      (sum, add) => sum + add.price,
      0
    );
    const reservationAdditionals = state.reservationExtras
      .filter((extra) => extra.type === 'reservation_additional')
      .reduce((sum, extra) => sum + extra.amount, 0);

    return saleAdditionals + reservationAdditionals;
  },

  canProceedToNextStep: () => {
    const state = get();
    switch (state.currentStep) {
      case 'customer-selection':
        return state.saleInfo.customerId !== null || state.saleInfo.skipCustomer;
      case 'sale-info':
        return (
          state.saleInfo.salePrice > 0 && state.saleInfo.paymentMethod !== ''
        );
      case 'trade-in':
        if (state.tradeInInfo.hasTradeIn) {
          return state.tradeInInfo.vehicles.length > 0 &&
            state.tradeInInfo.vehicles.every((v) =>
              v.license_plate !== '' &&
              v.brand_id !== '' &&
              v.model_id !== '' &&
              v.year > 1900 &&
              v.trade_in_value > 0
            );
        }
        return true;
      case 'summary':
        return true;
      default:
        return false;
    }
  },

  canNavigateToStep: (step) => {
    const state = get();
    const targetStepIndex = stepOrder.indexOf(step);
    const furthestStepIndex = stepOrder.indexOf(state.furthestStepReached);

    // In edit mode, allow navigation to any step
    if (state.isEditMode) {
      return true;
    }

    // In create mode, allow navigation up to the furthest step reached
    if (targetStepIndex <= furthestStepIndex) {
      return true;
    }

    // Also allow navigation to the next step if current step can proceed
    const currentStepIndex = stepOrder.indexOf(state.currentStep);
    if (
      targetStepIndex === currentStepIndex + 1 &&
      state.canProceedToNextStep()
    ) {
      return true;
    }

    return false;
  },
    }),
    {
      name: 'vehicle-sale-draft',
      storage: createJSONStorage(() => sessionStorage),
      // v3: saleInfo.saleDate (fecha editable).
      // v4 (dos cambios en paralelo): production agregó saleInfo.financingCommission;
      //   esta rama pasó al flujo de 4 pasos (sin 'payments' ni transferValue en UI).
      // v5: unifica ambos. Bumpear descarta drafts v4 viejos (estructura/campos
      //   incompatibles) para evitar pasos/estado inconsistente.
      version: 5,
      partialize: (state) => ({
        currentStep: state.currentStep,
        furthestStepReached: state.furthestStepReached,
        vehicle: state.vehicle,
        isEditMode: state.isEditMode,
        saleId: state.saleId,
        vehicleSaleId: state.vehicleSaleId,
        documentId: state.documentId,
        saleInfo: state.saleInfo,
        tradeInInfo: state.tradeInInfo,
        additionals: state.additionals,
        reservationExtras: state.reservationExtras,
      }),
    }
  )
);
