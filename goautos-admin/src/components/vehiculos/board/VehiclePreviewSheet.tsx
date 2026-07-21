import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Vehicle } from '@/types/vehicle';
import { useI18n } from '@/hooks/useI18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Car,
  Calendar,
  ArrowRight,
  Clock,
  Instagram,
  FileText,
  DollarSign,
  MoreVertical,
  Check,
  Facebook,
  CheckCircle,
  Edit,
  TrendingDown,
  X,
  Loader2,
  Globe,
  Upload,
  Gauge,
  Fuel,
  Cog,
  Share2,
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useMediaQuery } from '@/hooks/use-media-query';
import { CreateInstagramPostDrawer } from '@/components/instagram/CreateInstagramPostDrawer';
import QuotationForm from '@/components/vehicle/QuotationForm';
import VehicleReservationDialog from '@/components/vehicle/detail/reservations/VehicleReservationDialog';
import VehicleSaleCreateEditDialog from '@/components/vehicle/detail/sales-2/VehicleSaleCreateEditDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import TransactionForm from '@/components/vehicle/detail/transactions/TransactionForm';
import { TransactionFormValues } from '@/components/vehicle/detail/transactions/types';
import { addVehicleTransaction } from '@/components/vehicle/detail/transactions/api/transactionService';
import { uploadVehicleDocuments } from '@/components/vehicle/detail/transactions/api/documentUploadService';
import { ChileautosPublishModal } from '@/components/chileautos/ChileautosPublishModal';

interface VehiclePreviewSheetProps {
  vehicle: Vehicle | null;
  open: boolean;
  onClose: () => void;
  onViewDetails: (id: number) => void;
  // Props para modo selección (catálogo de Facebook)
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  isPublished?: boolean;
  // Props para modo ChileAutos
  chileautosMode?: boolean;
  onChileautosPublishSuccess?: () => void;
}

const VehiclePreviewSheet = ({
  vehicle,
  open,
  onClose,
  onViewDetails,
  selectionMode = false,
  isSelected = false,
  onSelect,
  isPublished = false,
  chileautosMode = false,
  onChileautosPublishSuccess,
}: VehiclePreviewSheetProps) => {
  const { tCommon } = useI18n();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [, navigate] = useLocation();

  // Estados para acciones
  const [isInstagramDrawerOpen, setIsInstagramDrawerOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isReservationDialogOpen, setIsReservationDialogOpen] = useState(false);
  const [isSaleDialogOpen, setIsSaleDialogOpen] = useState(false);
  const [hasActiveReservation, setHasActiveReservation] = useState(false);
  const [checkingReservation, setCheckingReservation] = useState(false);
  const [isExpenseSheetOpen, setIsExpenseSheetOpen] = useState(false);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isChileautosModalOpen, setIsChileautosModalOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const formRef = React.useRef<HTMLFormElement>(null);
  const floatingPanelRef = React.useRef<HTMLDivElement>(null);

  // Stop native pointerdown/click from reaching Radix's document-level dismiss listener.
  // Radix Sheet sets body { pointer-events: none } and listens for pointerdown on document.
  useEffect(() => {
    const node = floatingPanelRef.current;
    if (!node) return;
    // Only stop pointerdown (what Radix listens for). Let click bubble so React handlers work.
    const stop = (e: Event) => e.stopPropagation();
    node.addEventListener('pointerdown', stop);
    return () => {
      node.removeEventListener('pointerdown', stop);
    };
  }, [isImageModalOpen]);

  const isExpenseDisabled = isSubmittingExpense || uploadingFiles;

  // Check for active reservation (always, not just when status is "Reservado")
  useEffect(() => {
    const checkActiveReservation = async () => {
      if (!vehicle?.id) {
        setHasActiveReservation(false);
        return;
      }

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

    if (open && vehicle?.id) {
      checkActiveReservation();
    }
  }, [vehicle?.id, open]);

  // Fetch gallery images when sheet opens
  useEffect(() => {
    const fetchGallery = async () => {
      if (!vehicle?.id) return;
      const { data } = await supabase
        .from('vehicles')
        .select('gallery')
        .eq('id', vehicle.id)
        .single();
      if (data?.gallery) {
        setGalleryImages(data.gallery as string[]);
      } else {
        setGalleryImages([]);
      }
    };

    if (open && vehicle?.id) {
      setActiveImage(null);
      fetchGallery();
    }
  }, [vehicle?.id, open]);

  // All images: main + gallery
  const allImages = useMemo(() => {
    if (!vehicle?.main_image) return [];
    return [vehicle.main_image, ...galleryImages].filter(Boolean);
  }, [vehicle?.main_image, galleryImages]);

  const displayImage = activeImage || vehicle?.main_image;

  // Check if vehicle is sold
  const isVehicleSold = vehicle?.status_id === 3 ||
    vehicle?.status?.name?.toLowerCase() === 'vendido' ||
    vehicle?.status?.name?.toLowerCase() === 'sold';

  // Handler para submit de gasto
  const handleExpenseSubmit = async (values: TransactionFormValues) => {
    if (isSubmittingExpense || !vehicle) return;

    try {
      setIsSubmittingExpense(true);
      setUploadingFiles(true);
      const docUrls = await uploadVehicleDocuments(vehicle.id, values.documents || null);
      const success = await addVehicleTransaction(vehicle.id, values, docUrls);

      if (success) {
        setIsExpenseSheetOpen(false);
        toast.success('Gasto agregado exitosamente');
      } else {
        toast.error('Error al agregar gasto');
      }
    } catch (error) {
      toast.error('Error al agregar gasto');
    } finally {
      setUploadingFiles(false);
      setIsSubmittingExpense(false);
    }
  };

  const handleExpenseFormSubmit = () => {
    if (isSubmittingExpense) return;
    setIsSubmittingExpense(true);
    if (formRef.current) {
      formRef.current.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }
  };

  const handleExpenseSheetOpenChange = (open: boolean) => {
    if (!isExpenseDisabled) {
      setIsExpenseSheetOpen(open);
    }
  };

  if (!vehicle) return null;

  // Calculate days in current state
  const daysInState = (() => {
    if (!vehicle.state_updated_at) return 0;
    const updatedAt = new Date(vehicle.state_updated_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - updatedAt.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  })();

  // Format price
  const formatPrice = (price: number | null | undefined) => {
    if (price === null || price === undefined || price === 0) return '-';
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Format mileage
  const formatMileage = (mileage: number | null | undefined) => {
    if (!mileage) return '-';
    return new Intl.NumberFormat('es-CL').format(mileage) + ' km';
  };

  const PreviewContent = ({ hideImage }: { hideImage?: boolean }) => (
    <div className="flex flex-col">
      {/* Vehicle Image */}
      {!hideImage && <><div className="relative w-full aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden mb-2">
        {displayImage ? (
          <img
            src={displayImage}
            alt={`${vehicle.brand?.name || ''} ${vehicle.model?.name || ''}`}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => allImages.length > 0 && setIsImageModalOpen(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="h-12 w-12 text-gray-300" />
          </div>
        )}

        {/* Status Badge */}
        {vehicle.status && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-sm text-slate-700 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: vehicle.status.color || '#6b7280' }} />
            {vehicle.status.name}
          </span>
        )}

        {/* Days Badge */}
        <Badge className="absolute top-2 right-2 bg-white/90 text-gray-700 backdrop-blur-sm text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {daysInState}d
        </Badge>

        {/* Published Badge for Facebook mode */}
        {selectionMode && isPublished && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Badge className="bg-green-500 text-white text-sm px-3 py-1">
              <CheckCircle className="h-4 w-4 mr-1" />
              Publicado
            </Badge>
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {allImages.length > 1 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveImage(img)}
              className={`flex-shrink-0 w-14 h-10 rounded-lg overflow-hidden border-2 transition-colors ${
                img === displayImage ? 'border-slate-900' : 'border-transparent hover:border-slate-300'
              }`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      </>}

      {/* Vehicle Title */}
      <div className="mb-1">
        <h3 className="text-xl font-bold text-slate-900">
          {[vehicle.model?.name, vehicle.version_name].filter(Boolean).join(' ') || 'Sin modelo'}
        </h3>
        <p className="text-[14px] text-slate-500">
          {vehicle.brand?.name} {vehicle.year}
        </p>
      </div>

      {/* Specs Grid */}
      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-[13px] text-slate-700">{formatMileage(vehicle.mileage)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-[13px] text-slate-700">{vehicle.year || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Cog className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-[13px] text-slate-700">{vehicle.transmission || '-'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <span className="text-[13px] text-slate-700">{vehicle.fuel_type?.name || '-'}</span>
        </div>
      </div>

      {/* Price + Actions — single row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-slate-900">
            {formatPrice(vehicle.price)}
          </span>
          {vehicle.discount_percentage != null && vehicle.discount_percentage > 0 && (
            <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-md">
              -{vehicle.discount_percentage}%
            </span>
          )}
        </div>
        {!isVehicleSold && !selectionMode && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => {
                onClose();
                navigate(`/vehiculos/editar/${vehicle.id}`);
              }}
            >
              <Edit className="h-4 w-4 text-slate-500" />
            </Button>
            {!vehicle.instagram_post_id && (
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setIsInstagramDrawerOpen(true)}
              >
                <Share2 className="h-4 w-4 text-slate-500" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                  <MoreVertical className="h-4 w-4 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5">
                <DropdownMenuItem
                  onClick={() => setIsReservationDialogOpen(true)}
                  className="gap-2.5 py-2 px-3 rounded-lg text-[13px]"
                >
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {hasActiveReservation ? 'Ver Reserva' : 'Generar Reserva'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsQuoteModalOpen(true)}
                  className="gap-2.5 py-2 px-3 rounded-lg text-[13px]"
                >
                  <FileText className="h-4 w-4 text-slate-400" />
                  Generar Cotización
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsExpenseSheetOpen(true)}
                  className="gap-2.5 py-2 px-3 rounded-lg text-[13px]"
                >
                  <TrendingDown className="h-4 w-4 text-slate-400" />
                  Añadir Gasto
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsSaleDialogOpen(true)}
                  className="gap-2.5 py-2 px-3 rounded-lg text-[13px]"
                >
                  <DollarSign className="h-4 w-4 text-slate-400" />
                  Registrar Venta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Collapsible Description */}
      {vehicle.description && (
        <details className="border-t py-3 mb-3 group">
          <summary className="text-[13px] font-medium text-slate-700 cursor-pointer select-none list-none flex items-center justify-between">
            Descripción
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-90" />
          </summary>
          <p className="text-[13px] text-slate-600 whitespace-pre-line mt-2">
            {vehicle.description}
          </p>
        </details>
      )}

      {/* Selection Mode: Checkbox + Select Button for Facebook Marketplace */}
      {selectionMode && !chileautosMode && (
        <div className="mb-4">
          {isPublished ? (
            <Button
              disabled
              variant="outline"
              className="w-full gap-2 bg-green-50 text-green-700 border-green-200"
            >
              <CheckCircle className="h-5 w-5" />
              Ya está en el catálogo
            </Button>
          ) : (
            <Button
              onClick={() => onSelect?.(vehicle.id)}
              variant={isSelected ? "default" : "outline"}
              className={`w-full gap-2 h-12 text-base ${
                isSelected
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'hover:bg-blue-50 hover:border-blue-300'
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="h-5 w-5" />
                  Seleccionado
                </>
              ) : (
                <>
                  <Facebook className="h-5 w-5" />
                  Seleccionar para Facebook
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* ChileAutos Mode: Show publish button with modal */}
      {selectionMode && chileautosMode && (
        <div className="mb-4 space-y-2">
          {isPublished ? (
            <Button
              disabled
              variant="outline"
              className="w-full gap-2 bg-green-50 text-green-700 border-green-200"
            >
              <CheckCircle className="h-5 w-5" />
              Ya publicado en ChileAutos
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setIsChileautosModalOpen(true)}
                className="w-full gap-2 h-12 text-base bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
              >
                <Upload className="h-5 w-5" />
                Publicar en ChileAutos
              </Button>
              <Button
                onClick={() => onSelect?.(vehicle.id)}
                variant={isSelected ? "secondary" : "outline"}
                className={`w-full gap-2 ${
                  isSelected
                    ? 'bg-orange-100 text-orange-700 border-orange-300'
                    : ''
                }`}
              >
                {isSelected ? (
                  <>
                    <Check className="h-4 w-4" />
                    Seleccionado para batch
                  </>
                ) : (
                  <>
                    <Globe className="h-4 w-4" />
                    Agregar a selección
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={() => onViewDetails(vehicle.id)}
        className="w-full gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 text-[13px] mt-2"
      >
        Ver detalles completos
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );

  // Render Drawer for mobile, Sheet for desktop
  const SheetOrDrawer = isMobile ? (
    <Drawer open={open} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-left">Vista previa</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <PreviewContent />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Sheet open={open} onOpenChange={(open) => { if (!open) { setIsImageModalOpen(false); onClose(); } }}>
      <SheetContent
        className="w-full sm:max-w-md p-6 overflow-y-auto"
        onPointerDownOutside={(e) => {
          if (
            isImageModalOpen ||
            isInstagramDrawerOpen ||
            isQuoteModalOpen ||
            isReservationDialogOpen ||
            isSaleDialogOpen ||
            isExpenseSheetOpen ||
            isChileautosModalOpen
          ) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (
            isImageModalOpen ||
            isInstagramDrawerOpen ||
            isQuoteModalOpen ||
            isReservationDialogOpen ||
            isSaleDialogOpen ||
            isExpenseSheetOpen ||
            isChileautosModalOpen
          ) {
            e.preventDefault();
          }
        }}
      >
        <SheetHeader className="mb-4">
          <SheetTitle>Vista previa</SheetTitle>
        </SheetHeader>
        <PreviewContent hideImage={isImageModalOpen} />
      </SheetContent>
    </Sheet>
  );

  return (
    <>
      {SheetOrDrawer}

      {/* Floating Image Panel — portaled to body to escape stacking contexts */}
      {isImageModalOpen && !isMobile && open && createPortal(
        <div
          ref={floatingPanelRef}
          className="fixed inset-0 right-[448px] z-[100] flex flex-col items-center justify-center p-6 pb-8 bg-black/30 backdrop-blur-[2px]"
          style={{ pointerEvents: 'auto' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsImageModalOpen(false); }}
        >
          <div className="relative w-full max-w-4xl flex flex-col items-center" style={{ maxHeight: 'calc(100vh - 80px)' }}>
            {/* Close button */}
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute -top-2 -right-2 z-20 h-8 w-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-slate-50 transition"
            >
              <X className="h-4 w-4 text-slate-600" />
            </button>
            {/* Counter */}
            {allImages.length > 1 && (
              <span className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-slate-600 shadow-sm pointer-events-none">
                {allImages.indexOf(displayImage || '') + 1} / {allImages.length}
              </span>
            )}
            {/* Main image — fixed height so it doesn't shift between photos */}
            <div
              className="relative w-full rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
              style={{ height: 'calc(100vh - 220px)' }}
              onClick={() => setIsImageModalOpen(false)}
            >
              <img
                src={displayImage || ''}
                alt=""
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-30 pointer-events-none"
              />
              <img
                src={displayImage || ''}
                alt={`${vehicle.brand?.name || ''} ${vehicle.model?.name || ''}`}
                className="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none"
              />
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="relative z-30 flex gap-2 mt-4 overflow-x-auto pb-1 flex-shrink-0">
                {allImages.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImage(img);
                    }}
                    className={`flex-shrink-0 w-24 h-16 rounded-lg overflow-hidden transition-all cursor-pointer ${
                      img === displayImage ? 'opacity-100 ring-1 ring-white/50' : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Instagram Drawer */}
      <CreateInstagramPostDrawer
        vehicle={vehicle}
        open={isInstagramDrawerOpen}
        onOpenChange={setIsInstagramDrawerOpen}
      />

      {/* Quotation Modal */}
      <Dialog open={isQuoteModalOpen} onOpenChange={setIsQuoteModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generar Cotización</DialogTitle>
          </DialogHeader>
          <QuotationForm
            vehicleId={vehicle.id}
            onSuccess={() => setIsQuoteModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
        onSuccess={() => {
          setIsSaleDialogOpen(false);
          onClose();
        }}
      />

      {/* Expense Sheet */}
      <Sheet open={isExpenseSheetOpen} onOpenChange={handleExpenseSheetOpenChange}>
        <SheetContent className="flex w-full flex-col sm:max-w-md md:max-w-lg">
          <div className="absolute right-4 top-4">
            {isExpenseDisabled ? (
              <button
                className="rounded-sm opacity-50 ring-offset-background transition-opacity disabled:pointer-events-none cursor-not-allowed"
                disabled={true}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            ) : (
              <button
                onClick={() => setIsExpenseSheetOpen(false)}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            )}
          </div>

          <SheetHeader className="mb-5">
            <SheetTitle className="text-2xl">Añadir Gasto</SheetTitle>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <TransactionForm
              formRef={formRef}
              onSubmit={handleExpenseSubmit}
              onCancel={() => !isExpenseDisabled && setIsExpenseSheetOpen(false)}
              isUploading={isExpenseDisabled}
              initialType="expense"
            />
          </div>

          <div className="mt-6 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsExpenseSheetOpen(false)}
              disabled={isExpenseDisabled}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExpenseFormSubmit}
              disabled={isExpenseDisabled}
              className="flex-1"
            >
              {isExpenseDisabled ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ChileAutos Publish Modal */}
      <ChileautosPublishModal
        isOpen={isChileautosModalOpen}
        onClose={() => setIsChileautosModalOpen(false)}
        vehicle={{
          id: vehicle.id,
          brand_name: vehicle.brand?.name,
          model_name: vehicle.model?.name,
          year: vehicle.year,
          price: vehicle.price,
          mileage: vehicle.mileage,
          main_image: vehicle.main_image,
          color_name: vehicle.color?.name,
          fuel_type_name: vehicle.fuel_type?.name,
          transmission: vehicle.transmission,
          category_name: vehicle.category?.name,
          license_plate: vehicle.license_plate,
        }}
        onSuccess={() => {
          setIsChileautosModalOpen(false);
          onChileautosPublishSuccess?.();
          toast.success('Vehículo publicado en ChileAutos');
        }}
      />

    </>
  );
};

export default VehiclePreviewSheet;
