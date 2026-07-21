import React, { useState, useEffect } from 'react';
import { useNavigation } from '@/hooks/useNavigation';
import { Button } from '@/components/ui/button';
import { CreateInstagramPostDrawer } from '@/components/instagram/CreateInstagramPostDrawer';
import {
  Instagram,
  Calendar,
  FileText,
  DollarSign,
  Settings,
  TrendingDown,
  TrendingUp,
  X,
  Loader2,
  Eye,
  HandHeart,
  ShoppingCart,
  Check,
  Globe,
  Edit,
  FileDown,
} from 'lucide-react';
import { Vehicle } from '@/types/vehicle';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import QuotationDrawer from '@/components/vehicle/detail/quotation/QuotationDrawer';
import VehicleReservationDialog from '@/components/vehicle/detail/reservations/VehicleReservationDialog';
import VehicleSaleCreateEditDialog from '@/components/vehicle/detail/sales-2/VehicleSaleCreateEditDialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import TransactionForm from './transactions/TransactionForm';
import { useTransactions } from './transactions/useTransactions';
import { TransactionFormValues } from './transactions/types';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import CloseBusinessDealDrawer from './close-business-deal/CloseBusinessDealDrawer';
import { MercadoLibrePublishDialog } from './MercadoLibrePublishDialog';
import VehiclePriceEditModal from './VehiclePriceEditModal';
import { useVehicleFinancialData } from '@/hooks/useVehicleFinancialData';
import { useI18n } from '@/hooks/useI18n';
import { useChileautosIntegration, useChileautosListings } from '@/hooks/chileautos';
import { useAuth } from '@/contexts/AuthContext';

interface VehicleDetailHeaderProps {
  vehicle: Vehicle;
  children?: React.ReactNode;
}

export function VehicleDetailHeader({ vehicle, children }: VehicleDetailHeaderProps) {
  const navigate = useNavigation();
  const { tCommon, tNav } = useI18n();
  const { clientId } = useAuth();
  // La ficha técnica se movió a la pestaña Documentos (es un documento más).
  const [isInstagramDrawerOpen, setIsInstagramDrawerOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [isCloseBusinessDealOpen, setIsCloseBusinessDealOpen] = useState(false);
  const [isTransactionSheetOpen, setIsTransactionSheetOpen] = useState(false);
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionType, setTransactionType] = useState<'expense' | 'income'>(
    'expense'
  );
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [checkingReservation, setCheckingReservation] = useState(false);

  // Estados para manejo de ventas
  const [saleData, setSaleData] = useState<any>(null);
  const [saleId, setSaleId] = useState<number | null>(null);
  const [isCheckingSale, setIsCheckingSale] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  // Data de adquisición para el modal "Editar precios" desde Acciones. Reusa el
  // mismo hook que el Resumen → el precio de compra/acordado se precarga bien (no
  // se pisa con 0) y el modal funciona desde cualquier pestaña.
  const { acquisitionData } = useVehicleFinancialData(
    vehicle.id,
    vehicle.is_consigned
  );

  // Estados para manejo de cierre de negocio
  const [closeDealData, setCloseDealData] = useState<any>(null);
  const [closeDealDocumentId, setCloseDealDocumentId] = useState<number | null>(
    null
  );
  const [isCheckingCloseDeal, setIsCheckingCloseDeal] = useState(false);
  const [closeDealDocuments, setCloseDealDocuments] = useState<any[]>([]);
  const [isPublishingToML, setIsPublishingToML] = useState(false);
  // Candado SÍNCRONO contra doble-publicación: setIsPublishingToML es asíncrono
  // (React recién deshabilita el botón en el próximo render), así que un doble-click
  // rápido alcanza a disparar dos invokes antes de que el botón se apague. Este ref
  // se setea/chequea en el mismo tick y corta el segundo click antes de tocar ML.
  const isPublishingMLRef = React.useRef(false);
  const [isMLDialogOpen, setIsMLDialogOpen] = useState(false);
  const [isVehiclePublished, setIsVehiclePublished] = useState(false);
  const [checkingMLPublish, setCheckingMLPublish] = useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);

  const {
    uploadingFiles,
    setUploadingFiles,
    fetchTransactions,
    uploadDocuments,
    addTransaction,
  } = useTransactions(vehicle);

  // ChileAutos integration hooks
  const { integration: chileautosIntegration, isConnected: isChileautosConnected } = useChileautosIntegration();
  const {
    getListingForVehicle,
    isVehiclePublished: isVehiclePublishedCA,
    publish: publishToChileautos,
    isPublishing: isPublishingToCA,
    remove: removeFromChileautos,
    isRemoving: isRemovingFromCA,
  } = useChileautosListings();

  const chileautosListing = getListingForVehicle(vehicle.id);
  const isPublishedOnChileautos = chileautosListing?.status === 'published';

  // Check if vehicle is sold (assuming status_id 3 means sold, adjust as needed)
  const isVehicleSold = vehicle.status_id === 3;

  // Check for active reservation (always, not just when status is "Reservado")
  useEffect(() => {
    const checkActiveReservation = async () => {
      setCheckingReservation(true);
      try {
        const { data: reservationData, error } = await supabase
          .from('vehicles_reservations')
          .select('id, status')
          .eq('vehicle_id', vehicle.id)
          .eq('status', 'active')
          .maybeSingle();

        if (error) {
          console.error('Error checking reservation:', error);
          setHasActiveReservation(false);
        } else {
          setHasActiveReservation(!!reservationData);
        }
      } catch (error) {
        console.error('Error checking active reservation:', error);
        setHasActiveReservation(false);
      } finally {
        setCheckingReservation(false);
      }
    };

    checkActiveReservation();
  }, [vehicle.id]);

  // Check if vehicle already has a sale record
  useEffect(() => {
    const checkExistingSale = async () => {
      setIsCheckingSale(true);
      try {
        const { data: saleData, error } = await supabase
          .from('vehicles_sales')
          .select(
            `
            *,
            document:document_id(*)
          `
          )
          .eq('vehicle_id', vehicle.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking existing sale:', error);
        } else if (saleData) {
          setSaleData(saleData);
          setSaleId(saleData.document_id);
        }
      } catch (error) {
        console.error('Error checking existing sale:', error);
      } finally {
        setIsCheckingSale(false);
      }
    };

    checkExistingSale();
  }, [vehicle.id]);

  // Check if vehicle already has a close business deal record
  useEffect(() => {
    const checkExistingCloseDeal = async () => {
      setIsCheckingCloseDeal(true);
      try {
        const { data: closeDealDocuments, error } = await supabase
          .from('vehicles_documents')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .eq('type', 'close_deal')
          .order('created_at', { ascending: false });

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking existing close deal:', error);
        } else if (closeDealDocuments && closeDealDocuments.length > 0) {
          // Usar el documento más reciente para la edición
          const mostRecentDocument = closeDealDocuments[0];
          setCloseDealData(mostRecentDocument);
          setCloseDealDocumentId(mostRecentDocument.id);
          setCloseDealDocuments(closeDealDocuments);
        }
      } catch (error) {
        console.error('Error checking existing close deal:', error);
      } finally {
        setIsCheckingCloseDeal(false);
      }
    };

    checkExistingCloseDeal();
  }, [vehicle.id]);

  // Check if vehicle is already published to MercadoLibre
  useEffect(() => {
    const checkMLPublication = async () => {
      setCheckingMLPublish(true);
      try {
        const { data: mlPost, error } = await supabase
          .from('meli_post')
          .select('*')
          .eq('vehicle_id', vehicle.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking MercadoLibre publication:', error);
        } else if (mlPost) {
          setIsVehiclePublished(true);
        }
      } catch (error) {
        console.error('Error checking MercadoLibre publication:', error);
      } finally {
        setCheckingMLPublish(false);
      }
    };

    checkMLPublication();
  }, [vehicle.id]);

  // Handler for when sale is successfully completed
  const handleSaleSuccess = () => {
    // Clear sale data if this was an edit
    setSaleData(null);
    setSaleId(null);
    // Refresh the page to show updated vehicle status
    window.location.reload();
  };

  const openExpenseSheet = () => {
    setTransactionType('expense');
    setIsTransactionSheetOpen(true);
    setIsActionsModalOpen(false);
  };

  const openIncomeSheet = () => {
    setTransactionType('income');
    setIsTransactionSheetOpen(true);
    setIsActionsModalOpen(false);
  };

  const openSaleDialog = () => {
    setIsSaleDialogOpen(true);
    setIsActionsModalOpen(false);
  };

  const openCloseBusinessDeal = () => {
    setIsCloseBusinessDealOpen(true);
    setIsActionsModalOpen(false);
  };

  // Handler for when close business deal is successfully completed
  const handleCloseDealSuccess = () => {
    // Clear close deal data if this was an edit
    setCloseDealData(null);
    setCloseDealDocumentId(null);
    setCloseDealDocuments([]);
    // Refresh the page to show updated vehicle status
    window.location.reload();
  };


  const handlePublishToMercadoLibre = async (listingType: string) => {
    // Guard de reentrada: si ya hay una publicación en vuelo, ignorar el click.
    // Va ANTES de cualquier setState/await para cerrar la ventana del doble-click.
    if (isPublishingMLRef.current) return;
    isPublishingMLRef.current = true;
    setIsPublishingToML(true);
    try {
      // First, get the MercadoLibre integration for this vehicle's client
      const { data: integrationData, error: integrationError } = await supabase
        .from('meli_integration')
        .select('*')
        .eq('user_id', vehicle.client_id)
        .eq('status', 'active')
        .maybeSingle();

      if (integrationError || !integrationData) {
        toast.error('No se encontró integración activa con MercadoLibre');
        return;
      }

      // Call the edge function with listing type
      const { data, error } = await supabase.functions.invoke(
        'publish-mercadolibre-vehicle',
        {
          body: {
            vehicleId: vehicle.id,
            integrationId: integrationData.id,
            listingType: listingType,
          },
        }
      );

      if (error) {
        console.error('Error publishing to MercadoLibre:', error);
        // Try to extract the detailed error message from the edge function response
        let errorMsg = 'No se pudo publicar en MercadoLibre. Verifica tu conexión e intenta de nuevo.';
        try {
          const errorContext = error.context ? await error.context.json() : null;
          if (errorContext?.error) errorMsg = errorContext.error;
        } catch {
          // Use default error message
        }
        toast.error(errorMsg);
        return;
      }

      // Check if token expired
      if (data.tokenExpired) {
        toast.error(
          'Token de MercadoLibre expirado. Por favor, ve a la página de MercadoLibre y renueva tu token.',
          {
            duration: 5000,
          }
        );
        return;
      }

      // Check for other errors in the response
      if (data.error) {
        console.error('Error from edge function:', data);
        toast.error('Error al publicar: ' + data.error);
        return;
      }

      if (data.success) {
        toast.success('Vehículo publicado exitosamente en MercadoLibre');
        setIsMLDialogOpen(false);
        // Optionally reload to show updated status
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error('Error al publicar en MercadoLibre');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error inesperado al publicar en MercadoLibre');
    } finally {
      setIsPublishingToML(false);
      isPublishingMLRef.current = false; // liberar el candado pase lo que pase
    }
  };

  const openReservationDialog = () => {
    setIsReservationDialogOpen(true);
    setIsActionsModalOpen(false);
  };

  const openQuoteModal = () => {
    setIsQuoteModalOpen(true);
    setIsActionsModalOpen(false);
  };

  const openPriceModal = () => {
    setIsPriceModalOpen(true);
    setIsActionsModalOpen(false);
  };

  const handleSubmit = async (values: TransactionFormValues) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setUploadingFiles(true);
      const docUrls = await uploadDocuments(values.documents || null);

      const success = await addTransaction(values, docUrls);

      if (success) {
        fetchTransactions(); // Refrescar las transacciones
        setIsTransactionSheetOpen(false);
        // Generic success message
        toast.success(tCommon('forms.messages.saveSuccess'));
      }
    } catch (error) {
      toast.error(tCommon('forms.messages.saveError'));
    } finally {
      setUploadingFiles(false);
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = () => {
    if (isSubmitting) return;

    // Activar isSubmitting antes de enviar el formulario
    setIsSubmitting(true);

    if (formRef.current) {
      formRef.current.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }
  };

  // Función para controlar el cierre del Sheet
  const handleSheetOpenChange = (open: boolean) => {
    // Solo permitir cerrar si no se está enviando el formulario
    if (!isSubmitting && !uploadingFiles) {
      setIsTransactionSheetOpen(open);
    }
  };

  const isMobile = useIsMobile();

  // Only show action buttons if vehicle is not sold
  const showActionButtons = !isVehicleSold;

  // Determinar si los controles deben estar deshabilitados
  const isDisabled = isSubmitting || uploadingFiles;

  return (
    <>
      <Breadcrumbs
        segments={[
          { label: tNav('breadcrumbs.vehicles'), href: '/vehiculos' },
          {
            label: `${vehicle.brand?.name} ${vehicle.model?.name} ${vehicle.year}`,
            active: true,
          },
        ]}
      />
      <div className="flex items-center justify-between mt-8 md:mt-1">
        <div className="flex items-center gap-2 min-w-0">
          <img src='/pwa-icons/icon-192x192.png' alt='GoAuto' className='h-8 w-8 rounded-lg flex-shrink-0 md:hidden' />
          <h1 className="text-lg sm:text-2xl font-semibold text-slate-900 tracking-tight truncate">
            {vehicle.brand?.name} {vehicle.model?.name}
          </h1>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
        {children}
        {showActionButtons && (
          <>
            {/* Desktop: DropdownMenu */}
            {!isMobile ? (
              <DropdownMenu
                open={isActionsMenuOpen}
                onOpenChange={setIsActionsMenuOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    className="rounded-xl h-9 text-[13px] font-medium bg-primary text-white hover:bg-primary/90 hover:text-white px-3"
                  >
                    <span>{tCommon('vehicles.detail.actionsButton')}</span>
                    <Settings className="ml-1.5 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl border-slate-200/60 shadow-[0_4px_16px_-4px_rgba(0,0,0,0.08)]" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuItem
                    onClick={() => {
                      navigate(`/vehiculos/editar/${vehicle.id}`);
                      setIsActionsMenuOpen(false);
                    }}
                    className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50"
                  >
                    <Edit className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {tCommon('vehicles.detail.editVehicle')}
                    </span>
                  </DropdownMenuItem>

                  <div className="h-px bg-slate-100 my-1" />
                  <p className="text-[11px] font-medium text-slate-400 px-2.5 py-1">Publicar</p>

                  {!vehicle.instagram_post_id && (
                    <DropdownMenuItem
                      onClick={() => {
                        setIsInstagramDrawerOpen(true);
                        setIsActionsMenuOpen(false);
                      }}
                      className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50"
                    >
                      <Instagram className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-[13px] font-medium text-slate-700">
                        {tCommon('vehicles.detail.publishInstagram')}
                      </span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      setIsMLDialogOpen(true);
                      setIsActionsMenuOpen(false);
                    }}
                    disabled={isPublishingToML || isVehiclePublished || checkingMLPublish}
                    className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50"
                  >
                    {checkingMLPublish || isPublishingToML ? (
                      <Loader2 className="h-4 w-4 text-slate-400 animate-spin flex-shrink-0" />
                    ) : isVehiclePublished ? (
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-[13px] font-medium text-slate-700">
                      {checkingMLPublish
                        ? 'Verificando...'
                        : isPublishingToML
                        ? 'Publicando...'
                        : isVehiclePublished
                        ? 'Publicado en ML'
                        : 'MercadoLibre'}
                    </span>
                  </DropdownMenuItem>
                  {isChileautosConnected && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (isPublishedOnChileautos) {
                          removeFromChileautos(vehicle.id);
                        } else {
                          publishToChileautos(vehicle.id);
                        }
                        setIsActionsMenuOpen(false);
                      }}
                      disabled={isPublishingToCA || isRemovingFromCA}
                      className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50"
                    >
                      {isPublishingToCA || isRemovingFromCA ? (
                        <Loader2 className="h-4 w-4 text-slate-400 animate-spin flex-shrink-0" />
                      ) : isPublishedOnChileautos ? (
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="text-[13px] font-medium text-slate-700">
                        {isPublishingToCA
                          ? 'Publicando...'
                          : isRemovingFromCA
                          ? 'Despublicando...'
                          : isPublishedOnChileautos
                          ? 'Despublicar ChileAutos'
                          : 'ChileAutos'}
                      </span>
                    </DropdownMenuItem>
                  )}

                  <div className="h-px bg-slate-100 my-1" />
                  <p className="text-[11px] font-medium text-slate-400 px-2.5 py-1">Documentos</p>

                  <DropdownMenuItem onClick={openReservationDialog} className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50">
                    <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {hasActiveReservation
                        ? tCommon('vehicles.detail.viewReservation')
                        : tCommon('vehicles.detail.generateReservation')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openQuoteModal} className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50">
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {tCommon('vehicles.detail.generateQuotation')}
                    </span>
                  </DropdownMenuItem>
                  <div className="h-px bg-slate-100 my-1" />
                  <p className="text-[11px] font-medium text-slate-400 px-2.5 py-1">Finanzas</p>

                  <DropdownMenuItem onClick={openPriceModal} className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50">
                    <Edit className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      Editar precios
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openExpenseSheet} className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50">
                    <TrendingDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {tCommon('vehicles.detail.addExpense')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openIncomeSheet} className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50">
                    <TrendingUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {tCommon('vehicles.detail.addIncome')}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openSaleDialog} className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50">
                    <DollarSign className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {saleData
                        ? tCommon('vehicles.detail.editSale')
                        : tCommon('vehicles.detail.sellVehicle')}
                    </span>
                  </DropdownMenuItem>
                  {vehicle.is_consigned && (
                    <DropdownMenuItem onClick={openCloseBusinessDeal} className="gap-2.5 px-2.5 py-2 rounded-lg focus:bg-slate-50">
                      <HandHeart className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-[13px] font-medium text-slate-700">
                        {closeDealData
                          ? tCommon('vehicles.detail.editCloseDeal')
                          : tCommon('vehicles.detail.closeDeal')}
                      </span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Mobile: Button + Drawer */
              <Button
                className="rounded-xl h-9 text-[13px] font-medium bg-primary text-white hover:bg-primary/90 hover:text-white px-3"
                onClick={() => setIsActionsModalOpen(true)}
              >
                <span>{tCommon('vehicles.detail.actionsButton')}</span>
                <Settings className="ml-1.5 h-4 w-4" />
              </Button>
            )}

            <Drawer open={isMobile && isActionsModalOpen} onOpenChange={setIsActionsModalOpen}>
              <DrawerContent>
                <div className="px-4 pt-0 pb-6 space-y-1">
                  <button
                    onClick={() => {
                      navigate(`/vehiculos/editar/${vehicle.id}`);
                      setIsActionsModalOpen(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                  >
                    <Edit className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {tCommon('vehicles.detail.editVehicle')}
                    </span>
                  </button>
                  <div className="h-px bg-slate-100 mx-1" />
                  <p className="text-[11px] font-medium text-slate-400 px-3 py-1">Publicar</p>

                  {!vehicle.instagram_post_id && (
                    <button
                      onClick={() => {
                        setIsInstagramDrawerOpen(true);
                        setIsActionsModalOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                    >
                      <Instagram className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-[13px] font-medium text-slate-700">
                        {tCommon('vehicles.detail.publishInstagram')}
                      </span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsMLDialogOpen(true);
                      setIsActionsModalOpen(false);
                    }}
                    disabled={isPublishingToML || isVehiclePublished || checkingMLPublish}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {checkingMLPublish || isPublishingToML ? (
                      <Loader2 className="h-4 w-4 text-slate-400 animate-spin flex-shrink-0" />
                    ) : isVehiclePublished ? (
                      <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-[13px] font-medium text-slate-700">
                      {checkingMLPublish
                        ? 'Verificando...'
                        : isPublishingToML
                        ? 'Publicando...'
                        : isVehiclePublished
                        ? 'Publicado en ML'
                        : 'MercadoLibre'}
                    </span>
                  </button>
                  {isChileautosConnected && (
                    <button
                      onClick={() => {
                        if (isPublishedOnChileautos) {
                          removeFromChileautos(vehicle.id);
                        } else {
                          publishToChileautos(vehicle.id);
                        }
                        setIsActionsModalOpen(false);
                      }}
                      disabled={isPublishingToCA || isRemovingFromCA}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      {isPublishingToCA || isRemovingFromCA ? (
                        <Loader2 className="h-4 w-4 text-slate-400 animate-spin flex-shrink-0" />
                      ) : isPublishedOnChileautos ? (
                        <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="text-[13px] font-medium text-slate-700">
                        {isPublishingToCA
                          ? 'Publicando...'
                          : isRemovingFromCA
                          ? 'Despublicando...'
                          : isPublishedOnChileautos
                          ? 'Despublicar ChileAutos'
                          : 'ChileAutos'}
                      </span>
                    </button>
                  )}

                  <div className="h-px bg-slate-100 mx-1" />
                  <p className="text-[11px] font-medium text-slate-400 px-3 py-1">Documentos</p>

                  <button
                    onClick={openReservationDialog}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                  >
                    <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {hasActiveReservation
                        ? tCommon('vehicles.detail.viewReservation')
                        : tCommon('vehicles.detail.generateReservation')}
                    </span>
                  </button>
                  <button
                    onClick={openQuoteModal}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                  >
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {tCommon('vehicles.detail.generateQuotation')}
                    </span>
                  </button>

                  <div className="h-px bg-slate-100 mx-1" />
                  <p className="text-[11px] font-medium text-slate-400 px-3 py-1">Finanzas</p>

                  <button
                    onClick={openPriceModal}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                  >
                    <Edit className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      Editar precios
                    </span>
                  </button>
                  <button
                    onClick={openExpenseSheet}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                  >
                    <TrendingDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {tCommon('vehicles.detail.addExpense')}
                    </span>
                  </button>
                  <button
                    onClick={openIncomeSheet}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                  >
                    <TrendingUp className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {tCommon('vehicles.detail.addIncome')}
                    </span>
                  </button>
                  <button
                    onClick={openSaleDialog}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                  >
                    <DollarSign className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-[13px] font-medium text-slate-700">
                      {saleData
                        ? tCommon('vehicles.detail.editSale')
                        : tCommon('vehicles.detail.sellVehicle')}
                    </span>
                  </button>
                  {vehicle.is_consigned && (
                    <button
                      onClick={openCloseBusinessDeal}
                      className="flex items-center gap-2.5 w-full px-3 py-2.5 text-left rounded-lg active:bg-slate-50 transition-colors"
                    >
                      <HandHeart className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="text-[13px] font-medium text-slate-700">
                        {closeDealData
                          ? tCommon('vehicles.detail.editCloseDeal')
                          : tCommon('vehicles.detail.closeDeal')}
                      </span>
                    </button>
                  )}
                </div>
              </DrawerContent>
            </Drawer>
          </>
        )}
        </div>
      </div>

      {/* Instagram Drawer */}
      <CreateInstagramPostDrawer
        vehicle={vehicle}
        open={isInstagramDrawerOpen}
        onOpenChange={setIsInstagramDrawerOpen}
      />

      {/* Close Business Deal Drawer (unified create + edit) */}
      <CloseBusinessDealDrawer
        isOpen={isCloseBusinessDealOpen}
        onClose={() => setIsCloseBusinessDealOpen(false)}
        vehicle={vehicle}
        onSuccess={handleCloseDealSuccess}
        documentId={closeDealDocumentId}
        isEditMode={!!closeDealData}
      />

      {/* Transaction Sheet */}
      <Sheet open={isTransactionSheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent guardClose={isDisabled} className="flex w-full flex-col p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b px-6 py-4">
            <SheetTitle className="text-xl">
              {transactionType === 'expense'
                ? tCommon('vehicles.detail.addExpense')
                : tCommon('vehicles.detail.addIncome')}
            </SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <TransactionForm
              formRef={formRef}
              onSubmit={handleSubmit}
              onCancel={() => !isDisabled && setIsTransactionSheetOpen(false)}
              isUploading={isDisabled}
              initialType={transactionType}
            />
          </div>

          <SheetFooter className="shrink-0 gap-2 border-t px-6 py-4 sm:space-x-0">
            <Button
              variant="outline"
              onClick={() => setIsTransactionSheetOpen(false)}
              disabled={isDisabled}
              className="flex-1"
            >
              {tCommon('buttons.cancel')}
            </Button>
            <Button
              onClick={handleFormSubmit}
              disabled={isDisabled}
              className="flex-1"
            >
              {isDisabled ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon('actions.saving')}
                </>
              ) : (
                tCommon('buttons.save')
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Quotation Drawer */}
      {vehicle && (
        <>
          <QuotationDrawer
            open={isQuoteModalOpen}
            onOpenChange={setIsQuoteModalOpen}
            vehicleId={vehicle.id}
          />

          {/* Reservation Dialog */}
          <VehicleReservationDialog
            isOpen={isReservationDialogOpen}
            onClose={() => setIsReservationDialogOpen(false)}
            vehicle={vehicle}
            onSuccess={() => setIsReservationDialogOpen(false)}
          />

          {/* Sale Dialog */}
          <VehicleSaleCreateEditDialog
            isOpen={isSaleDialogOpen}
            onClose={() => setIsSaleDialogOpen(false)}
            vehicle={vehicle}
            onSuccess={handleSaleSuccess}
            saleId={saleId || undefined}
            initialData={saleData}
          />

          {/* MercadoLibre Publish Dialog */}
          <MercadoLibrePublishDialog
            isOpen={isMLDialogOpen}
            onClose={() => setIsMLDialogOpen(false)}
            onConfirm={handlePublishToMercadoLibre}
            vehicleId={vehicle.id}
            isPublishing={isPublishingToML}
          />

          {/* Editar Precios (desde el menú Acciones) */}
          <VehiclePriceEditModal
            isOpen={isPriceModalOpen}
            onClose={() => setIsPriceModalOpen(false)}
            vehicleId={vehicle.id}
            isConsigned={vehicle.is_consigned}
            acquisitionData={acquisitionData || null}
            vehiclePrice={vehicle.price || 0}
            minPrice={vehicle.min_price}
            discountPercentage={vehicle.discount_percentage}
            saleData={saleData || null}
            onUpdate={() => {}}
          />

        </>
      )}
    </>
  );
}
