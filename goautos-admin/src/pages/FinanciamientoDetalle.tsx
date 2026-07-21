import DashboardLayout from "@/components/DashboardLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FinancingDetailType, FinancingPayment } from "@/types/financing";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, AlertCircle } from "lucide-react";
import posthog from "@/utils/posthog";

import CustomerVehicleInfo from "@/components/financing/detail/CustomerVehicleInfo";
import FinancingDetails from "@/components/financing/detail/FinancingDetails";
import PaymentForm from "@/components/financing/detail/PaymentForm";
import PaymentSchedule from "@/components/financing/detail/PaymentSchedule";
import PaymentStatus from "@/components/financing/detail/PaymentStatus";

const FinanciamientoDetalle = () => {
  const { clientId, userRole } = useAuth();
  const [, params] = useRoute<{ id: string }>("/financiamiento/:id");
  const [, navigate] = useLocation();
  const id = params?.id;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<number | null>(null);

  const {
    data: financing,
    isLoading,
    error,
    refetch,
  } = useQuery<FinancingDetailType, Error>({
    queryKey: ["financingDetail", id, clientId],
    queryFn: async () => {
      if (!clientId) {
        throw new Error('No se pudo identificar el cliente');
      }

      const financingId = id ? parseInt(id, 10) : 0;

      const { data, error } = await supabase
        .from("financing")
        .select(
          `
          *,
          customer:customer_id(first_name, last_name, rut),
          vehicle:vehicle_id(brand_id, model_id, year, license_plate, client_id),
          payments:financing_payment(*)
        `
        )
        .eq("id", financingId)
        .single();

      if (userRole !== 'superadmin' && data && data.vehicle?.client_id !== clientId) {
        throw new Error('No tiene permisos para ver este financiamiento');
      }

      if (error) {
        console.error("Error fetching financing details:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar los detalles del financiamiento",
          variant: "destructive",
        });
        throw error;
      }

      return {
        ...data,
        payments: data.payments
          ? data.payments.map((payment) => ({
              ...payment,
              payment_status: payment.payment_status as
                | "pending"
                | "paid"
                | "late",
            }))
          : [],
      } as FinancingDetailType;
    },
  });

  const handleMarkAsPaid = (payment: FinancingPayment) => {
    setSelectedPayment(payment.id);
    setDialogOpen(true);
  };

  const handleFormSuccess = async () => {
    setDialogOpen(false);
    setSelectedPayment(null);
    const { data: updatedFinancing } = await refetch();

    // Check if all payments are now completed
    if (updatedFinancing?.payments && updatedFinancing.payments.length > 0) {
      const allPaid = updatedFinancing.payments.every((p) => p.is_paid);
      if (allPaid) {
        const authUserId = (await supabase.auth.getUser()).data.user?.id || 'anonymous';
        posthog.capture({
          distinctId: authUserId,
          event: 'financing_completed',
          properties: {
            financing_id: updatedFinancing.id,
          },
        });
      }
    }
  };

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-[#f5f5f7]">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100"
                onClick={() => navigate('/financiamiento')}
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </Button>
              <div>
                <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900">
                  Detalle de Financiamiento
                </h1>
                {financing?.customer && (
                  <p className="hidden sm:block text-[13px] text-slate-500">
                    {financing.customer.first_name} {financing.customer.last_name} · {financing.vehicle?.brand_id} {financing.vehicle?.year}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto relative z-0">
          <div className="w-full px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
            ) : error || !financing ? (
              <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 p-8 flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-[14px] font-medium text-slate-700">Error al cargar el financiamiento</p>
                <p className="text-[12px] text-slate-400 mt-1">Intenta recargar la página</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <CustomerVehicleInfo financing={financing} />
                <FinancingDetails financing={financing} />
                <PaymentStatus financing={financing} />
                <PaymentSchedule
                  financing={financing}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
          </DialogHeader>
          <PaymentForm
            selectedPayment={selectedPayment}
            onSuccess={handleFormSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FinanciamientoDetalle;
