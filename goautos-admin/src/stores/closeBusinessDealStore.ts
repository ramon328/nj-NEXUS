import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  full_name?: string;
  email?: string;
  phone?: string;
  rut?: string;
  address?: string;
}

// Step types para el cierre de negocio
export type CloseBusinessDealStep =
  | 'customer-selection'
  | 'deal-details'
  | 'summary';

interface DealDetails {
  finalSalePrice: number;
  discount: number;
  dealershipCommission: number;
  dealershipCommissionPercentage: number;
  paymentMethod: string;
  notes: string;
}

export type AssumedBy = 'customer' | 'dealership' | 'consignor';

export interface DealAdditional {
  id: number;
  title: string;
  amount: number;
  assumedBy?: AssumedBy;
  /** Pass-through: dinero solo traspasado → informativo, no afecta el margen. */
  isPassthrough?: boolean;
}

export type DealIncome = DealAdditional;

// Comisión vendedor — una línea por vendedor en el split.
export type SellerCommissionBase = 'monto_fijo' | 'porcentaje_venta' | 'porcentaje_margen';
export interface SellerCommissionSplit {
  /** ID local del split en el draft (se mapea a row en sale_commission_splits al guardar) */
  localId: string;
  userId: number | null;
  vendedorNombreSnapshot: string;
  baseType: SellerCommissionBase;
  /** Valor según baseType: monto absoluto si monto_fijo, porcentaje (0-100) si porcentaje_* */
  value: number;
  notes?: string;
}

interface CloseBusinessDealState {
  // Current step
  currentStep: CloseBusinessDealStep;
  // Track the furthest step reached
  furthestStepReached: CloseBusinessDealStep;

  // Vehicle and mode info
  vehicle: any;
  isEditMode: boolean;
  dealId: number | null;
  documentId: number | null;

  // Step 1: Customer Selection
  customerId: number | null;
  customer: Customer | null;

  // Step 2: Deal Details
  dealDetails: DealDetails;
  dealAdditionals: DealAdditional[];
  dealIncomes: DealIncome[];
  sellerCommissions: SellerCommissionSplit[];

  // UI State
  isSubmitting: boolean;
  isDialogOpen: boolean;

  // Actions
  setCurrentStep: (step: CloseBusinessDealStep) => void;
  setVehicle: (vehicle: any) => void;
  loadConsignmentCustomer: (vehicleId: number) => Promise<void>;
  loadExistingSaleData: (vehicleId: number) => Promise<void>;
  setEditMode: (isEdit: boolean, dealId?: number, documentId?: number) => void;
  setDocumentId: (documentId: number) => void;
  setDealId: (dealId: number) => void;

  // Customer Actions
  setCustomer: (customer: Customer | null) => void;

  // Deal Details Actions
  updateDealDetails: (updates: Partial<DealDetails>) => void;
  addDealAdditional: (additional: DealAdditional) => void;
  removeDealAdditional: (id: number) => void;
  clearDealAdditionals: () => void;
  addDealIncome: (income: DealIncome) => void;
  removeDealIncome: (id: number) => void;
  clearDealIncomes: () => void;

  // Seller commission actions
  addSellerCommission: (split: SellerCommissionSplit) => void;
  updateSellerCommission: (localId: string, updates: Partial<SellerCommissionSplit>) => void;
  removeSellerCommission: (localId: string) => void;
  clearSellerCommissions: () => void;

  // UI Actions
  setIsSubmitting: (isSubmitting: boolean) => void;
  setIsDialogOpen: (isOpen: boolean) => void;

  // Utility Actions
  resetStore: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // Computed values
  canProceedToNextStep: () => boolean;
  canNavigateToStep: (step: CloseBusinessDealStep) => boolean;
}

const initialDealDetails: DealDetails = {
  finalSalePrice: 0,
  discount: 0,
  dealershipCommission: 0,
  dealershipCommissionPercentage: 0,
  paymentMethod: 'transferencia',
  notes: '',
};

const stepOrder: CloseBusinessDealStep[] = [
  'customer-selection',
  'deal-details',
  'summary',
];

export const useCloseBusinessDealStore = create<CloseBusinessDealState>()(
  persist(
    (set, get) => ({
    // Initial state
    currentStep: 'customer-selection',
    furthestStepReached: 'customer-selection',
    vehicle: null,
    isEditMode: false,
    dealId: null,
    documentId: null,
    customerId: null,
    customer: null,
    dealDetails: { ...initialDealDetails },
    dealAdditionals: [],
    dealIncomes: [],
    sellerCommissions: [],
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
      const currentStepIndex = stepOrder.indexOf(state.currentStep);
      if (currentStepIndex < stepOrder.length - 1) {
        state.setCurrentStep(stepOrder[currentStepIndex + 1]);
      }
    },

    goToPreviousStep: () => {
      const state = get();
      const currentStepIndex = stepOrder.indexOf(state.currentStep);
      if (currentStepIndex > 0) {
        state.setCurrentStep(stepOrder[currentStepIndex - 1]);
      }
    },

    // Vehicle and mode setup
    setVehicle: (vehicle) => {
      set({ vehicle });
      // If vehicle is consigned, preload consignment customer
      if (vehicle && vehicle.is_consigned) {
        get().loadConsignmentCustomer(vehicle.id);
      }
      // Always check for existing sale data
      if (vehicle && vehicle.id) {
        get().loadExistingSaleData(vehicle.id);
      }
    },

    // Load consignment customer for consigned vehicles
    loadConsignmentCustomer: async (vehicleId: number) => {
      try {
        // 1. Buscar el registro de consignación
        const { data: consignment, error: consignmentError } = await supabase
          .from('vehicles_consignments')
          .select('customer_id')
          .eq('vehicle_id', vehicleId)
          .single();

        if (consignmentError || !consignment) {
          return;
        }

        // 2. Buscar el cliente consignador
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', consignment.customer_id)
          .single();

        if (customerError || !customerData) {
          console.error('Error fetching consignment customer:', customerError);
          return;
        }

        // 3. Establecer el cliente consignador
        set({
          customerId: customerData.id,
          customer: customerData,
        });
      } catch (error) {
        console.error('Error loading consignment customer:', error);
      }
    },

    // Load existing sale data for vehicles with sales
    loadExistingSaleData: async (vehicleId: number) => {
      try {
        // 1. Buscar el registro de venta
        const { data: saleData, error: saleError } = await supabase
          .from('vehicles_sales')
          .select('*')
          .eq('vehicle_id', vehicleId)
          .single();

        if (saleError || !saleData) {
          return;
        }

        // 2. Buscar las notas del documento de venta
        const { data: documentData, error: documentError } = await supabase
          .from('vehicles_documents')
          .select('notes')
          .eq('id', saleData.document_id)
          .single();

        // 3. Buscar el cliente de la venta
        const { data: customerData, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', saleData.customer_id)
          .single();

        // 4. Calcular el porcentaje de comisión
        const commissionPercentage =
          saleData.sale_price > 0
            ? (saleData.commission_amount / saleData.sale_price) * 100
            : 0;

        // 5. Establecer los datos de la venta existente
        // Mapear el método de pago a los valores del select
        const mapPaymentMethod = (method: string) => {
          switch (method?.toLowerCase()) {
            case 'transferencia':
            case 'transfer':
              return 'transferencia';
            case 'efectivo':
            case 'cash':
              return 'efectivo';
            case 'cheque':
            case 'check':
              return 'cheque';
            case 'credito':
            case 'credit':
              return 'credito';
            case 'mixto':
            case 'mixed':
              return 'mixto';
            default:
              return 'transferencia';
          }
        };

        const updatedDealDetails = {
          finalSalePrice: saleData.sale_price,
          dealershipCommission: saleData.commission_amount,
          dealershipCommissionPercentage: commissionPercentage,
          paymentMethod: mapPaymentMethod(saleData.payment_method),
          notes: documentData?.notes || '',
        };

        set((state) => ({
          customerId: customerData?.id || null,
          customer: customerData || null,
          dealDetails: {
            ...state.dealDetails,
            ...updatedDealDetails,
          },
        }));
      } catch (error) {
        console.error('Error loading existing sale data:', error);
      }
    },

    setEditMode: (isEdit, dealId, documentId) => {
      set({
        isEditMode: isEdit,
        dealId: dealId || null,
        documentId: documentId || null,
      });
    },

    setDocumentId: (documentId) => set({ documentId }),
    setDealId: (dealId) => set({ dealId }),

    // Customer actions
    setCustomer: (customer) => {
      set({
        customerId: customer?.id || null,
        customer,
      });
    },

    // Deal Details actions
    updateDealDetails: (updates) => {
      set((state) => ({
        dealDetails: { ...state.dealDetails, ...updates },
      }));
    },

    // Deal Additionals actions
    addDealAdditional: (additional) => {
      set((state) => ({
        dealAdditionals: [...state.dealAdditionals, additional],
      }));
    },

    removeDealAdditional: (id) => {
      set((state) => ({
        dealAdditionals: state.dealAdditionals.filter(
          (additional) => additional.id !== id
        ),
      }));
    },

    clearDealAdditionals: () => {
      set({ dealAdditionals: [] });
    },

    // Deal Incomes actions
    addDealIncome: (income) => {
      set((state) => ({
        dealIncomes: [...state.dealIncomes, income],
      }));
    },

    removeDealIncome: (id) => {
      set((state) => ({
        dealIncomes: state.dealIncomes.filter(
          (income) => income.id !== id
        ),
      }));
    },

    clearDealIncomes: () => {
      set({ dealIncomes: [] });
    },

    // Seller commission actions
    addSellerCommission: (split) => {
      set((state) => ({
        sellerCommissions: [...state.sellerCommissions, split],
      }));
    },

    updateSellerCommission: (localId, updates) => {
      set((state) => ({
        sellerCommissions: state.sellerCommissions.map((s) =>
          s.localId === localId ? { ...s, ...updates } : s
        ),
      }));
    },

    removeSellerCommission: (localId) => {
      set((state) => ({
        sellerCommissions: state.sellerCommissions.filter(
          (s) => s.localId !== localId
        ),
      }));
    },

    clearSellerCommissions: () => {
      set({ sellerCommissions: [] });
    },

    // UI actions
    setIsSubmitting: (isSubmitting) => set({ isSubmitting }),
    setIsDialogOpen: (isOpen) => set({ isDialogOpen: isOpen }),

    // Reset store
    resetStore: () => {
      set({
        currentStep: 'customer-selection',
        furthestStepReached: 'customer-selection',
        vehicle: null,
        isEditMode: false,
        dealId: null,
        documentId: null,
        customerId: null,
        customer: null,
        dealDetails: { ...initialDealDetails },
        dealAdditionals: [],
        dealIncomes: [],
        sellerCommissions: [],
        isSubmitting: false,
        isDialogOpen: false,
      });
    },

    // Validation logic
    canProceedToNextStep: () => {
      const state = get();
      switch (state.currentStep) {
        case 'customer-selection':
          return state.customerId !== null;
        case 'deal-details':
          return (
            state.dealDetails.finalSalePrice > 0 &&
            state.dealDetails.dealershipCommission >= 0 &&
            state.dealDetails.paymentMethod !== ''
          );
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
      name: 'close-business-deal-draft',
      storage: createJSONStorage(() => sessionStorage),
      version: 1,
      partialize: (state) => ({
        currentStep: state.currentStep,
        furthestStepReached: state.furthestStepReached,
        vehicle: state.vehicle,
        isEditMode: state.isEditMode,
        dealId: state.dealId,
        documentId: state.documentId,
        customerId: state.customerId,
        customer: state.customer,
        dealDetails: state.dealDetails,
        dealAdditionals: state.dealAdditionals,
        dealIncomes: state.dealIncomes,
        sellerCommissions: state.sellerCommissions,
      }),
    }
  )
);
