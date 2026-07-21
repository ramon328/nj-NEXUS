import React, { useState, useEffect } from 'react';
import type { DocTabNavProps } from '@/pages/Documentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import posthog from '@/utils/posthog';
import {
  LuFileText,
  LuSearch,
  LuCar,
  LuCalendar,
  LuEye,
  LuShoppingCart,
  LuDollarSign,
  LuHandshake,
  LuCalendarCheck,
  LuFileCheck,
  LuPencil,
  LuPlus,
  LuDownload,
} from 'react-icons/lu';
import { Loader2, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import SaleNoteViewerProDialog from '@/components/vehicle/detail/documents/SaleNoteViewerProDialog';
import PurchaseNoteViewerPro from '@/components/vehicle/detail/documents/PurchaseNoteViewerPro';
import ConsignmentNoteViewerPro from '@/components/vehicle/detail/documents/ConsignmentNoteViewerPro';
import ReservationNoteViewerPro from '@/components/vehicle/detail/documents/ReservationNoteViewerPro';
import QuotationViewerPro from '@/components/vehicle/detail/documents/QuotationViewerPro';
import CloseBusinessDealViewerPro from '@/components/vehicle/detail/documents/CloseBusinessDealViewerPro';
import DocumentEditDrawer from '@/components/vehicle/detail/documents/DocumentEditDrawer';
import { downloadVehicleSpecSheet } from '@/utils/vehicleSpecSheet';
import VehicleSelectorDialog from '@/components/documents/VehicleSelectorDialog';
import SpecSheetViewerPro from '@/components/vehicle/detail/documents/SpecSheetViewerPro';
import VehicleSaleCreateEditDialog from '@/components/vehicle/detail/sales-2/VehicleSaleCreateEditDialog';
import VehicleReservationDialog from '@/components/vehicle/detail/reservations/VehicleReservationDialog';
import QuotationDrawer from '@/components/vehicle/detail/quotation/QuotationDrawer';
import CloseBusinessDealDrawer from '@/components/vehicle/detail/close-business-deal/CloseBusinessDealDrawer';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import { useAvailableDocumentTypes, type DocumentTemplateType } from '@/hooks/useAvailableDocumentTypes';

const DOCS_PER_PAGE = 15;

interface VehicleDocument {
  id: number;
  vehicle_id: number;
  type: string;
  status: string;
  created_at: string;
  document_date?: string;
  customer_id?: number;
  client_id: number;
  updated_at: string;
  vehicle?: {
    id: number;
    brand?: { name: string } | null;
    model?: { name: string } | null;
    year: number;
    license_plate: string;
    main_image?: string | null;
  } | null;
}

const VehicleDocumentsTab = ({ tabNav }: { tabNav: DocTabNavProps }) => {
  const { t } = useTranslation('common');
  const [, navigate] = useLocation();
  const { clientId, userId } = useAuth();
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<VehicleDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<'vehicle' | 'type' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Viewer states
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string | null>(null);
  const [showViewer, setShowViewer] = useState(false);
  // Cuando true, el viewer genera el PDF y lo descarga solo (sin interacción), y cierra.
  const [viewerAutoDownload, setViewerAutoDownload] = useState(false);

  // Generic document edit drawer state (quotation, purchase, consignment)
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [editDocumentId, setEditDocumentId] = useState<number | null>(null);
  const [editDocumentType, setEditDocumentType] = useState<string>('');
  const [editVehicleId, setEditVehicleId] = useState<number>(0);

  // Edit states for sale, reservation, close_deal
  const [isEditSaleOpen, setIsEditSaleOpen] = useState(false);
  const [editSaleDocId, setEditSaleDocId] = useState<number | null>(null);
  const [editSaleVehicle, setEditSaleVehicle] = useState<any>(null);

  const [isEditReservationOpen, setIsEditReservationOpen] = useState(false);
  const [editReservationVehicle, setEditReservationVehicle] = useState<any>(null);

  const [isEditCloseDealOpen, setIsEditCloseDealOpen] = useState(false);
  const [editCloseDealDocId, setEditCloseDealDocId] = useState<number | null>(null);
  const [editCloseDealVehicle, setEditCloseDealVehicle] = useState<any>(null);

  // New document creation state
  const [pendingDocType, setPendingDocType] = useState<string | null>(null);
  const [isCreationDialogOpen, setIsCreationDialogOpen] = useState(false);
  // Ficha técnica: elegir vehículo → se crea como documento directo.
  const [showSpecSheetPicker, setShowSpecSheetPicker] = useState(false);

  // Available document types based on client's templates
  const { availableTypes, loading: loadingTypes } = useAvailableDocumentTypes();

  const documentTypeConfig = {
    sale: {
      label: t('documents.types.sale'),
      icon: LuShoppingCart,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    purchase: {
      label: t('documents.types.purchase'),
      icon: LuDollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    consignment: {
      label: t('documents.types.consignment'),
      icon: LuHandshake,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    reservation: {
      label: t('documents.types.reservation'),
      icon: LuCalendarCheck,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
    quotation: {
      label: t('documents.types.quotation'),
      icon: LuFileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
    close_deal: {
      label: t('documents.types.closeDeal'),
      icon: LuFileCheck,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    spec_sheet: {
      label: 'Ficha Técnica',
      icon: LuFileText,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
    },
    other: {
      label: t('documents.types.other'),
      icon: LuFileText,
      color: 'text-slate-500',
      bgColor: 'bg-slate-50',
    },
  };

  useEffect(() => {
    if (clientId) {
      fetchDocuments();
    }
  }, [clientId]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchQuery, filterType]);

  const fetchDocuments = async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const { data: docsData, error: docsError } = await supabase
        .from('vehicles_documents')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;

      const vehicleIds = [...new Set(docsData?.map(d => d.vehicle_id).filter(Boolean) || [])];

      if (vehicleIds.length === 0) {
        setDocuments(docsData?.map(doc => ({ ...doc, vehicle: null })) as any || []);
        setIsLoading(false);
        return;
      }

      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, brand:brand_id(name), model:model_id(name), year, license_plate, main_image')
        .in('id', vehicleIds);

      if (vehiclesError) {
        console.error('Error fetching vehicles:', vehiclesError);
      }

      const vehiclesMap = new Map(vehiclesData?.map(v => [v.id, v]) || []);
      const docsWithVehicles = docsData?.map(doc => ({
        ...doc,
        vehicle: vehiclesMap.get(doc.vehicle_id) || null,
      })) || [];

      setDocuments(docsWithVehicles as any);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    if (searchQuery) {
      filtered = filtered.filter((doc) => {
        const searchLower = searchQuery.toLowerCase();
        const vehicle = doc.vehicle;
        const config = documentTypeConfig[doc.type as keyof typeof documentTypeConfig] || documentTypeConfig.other;

        const searchableText = [
          doc.type, config.label,
          vehicle?.brand?.name, vehicle?.model?.name,
          vehicle?.year?.toString(), vehicle?.license_plate,
          doc.vehicle_id?.toString(), doc.status,
          t(`documents.status.${doc.status}`),
        ].filter(Boolean).join(' ').toLowerCase();

        return searchableText.includes(searchLower);
      });
    }

    if (filterType !== 'all') {
      filtered = filtered.filter((doc) => doc.type === filterType);
    }

    setFilteredDocuments(filtered);
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // auto=true → descarga directa (el viewer genera el PDF y lo baja solo).
  const openDocumentViewer = (
    documentId: number,
    documentType: string,
    auto = false
  ) => {
    posthog.capture({
      distinctId: userId || 'anonymous',
      event: 'document_downloaded',
      properties: { document_id: documentId, document_type: documentType },
    });
    // Ficha técnica: "Descargar" (auto) baja el PDF directo; "Ver" abre el viewer de
    // ficha con preview (cae al flujo normal de abajo).
    if (documentType === 'spec_sheet' && auto) {
      const doc = documents.find((d) => d.id === documentId);
      if (doc) {
        downloadVehicleSpecSheet(
          doc.vehicle_id,
          (doc as any).client_id ?? clientId
        ).catch(() => {});
      }
      return;
    }
    setSelectedDocumentId(documentId);
    setSelectedDocumentType(documentType);
    setViewerAutoDownload(auto);
    setShowViewer(true);
  };

  const closeViewer = () => {
    setShowViewer(false);
    setSelectedDocumentId(null);
    setSelectedDocumentType(null);
    setViewerAutoDownload(false);
  };

  const goToVehicle = (vehicleId: number) => {
    navigate(`/vehiculos/${vehicleId}#documents`);
  };

  const openEditDrawer = async (doc: VehicleDocument) => {
    const type = doc.type;

    if (type === 'quotation' || type === 'purchase' || type === 'consignment') {
      setEditDocumentId(doc.id);
      setEditDocumentType(type);
      setEditVehicleId(doc.vehicle_id);
      setIsEditDrawerOpen(true);
    } else if (type === 'sale') {
      // Fetch vehicle data for the sale edit dialog
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('*, brand:brand_id(name), model:model_id(name), color:color_id(name)')
        .eq('id', doc.vehicle_id)
        .single();
      setEditSaleDocId(doc.id);
      setEditSaleVehicle(vehicle);
      setIsEditSaleOpen(true);
    } else if (type === 'reservation') {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('*, brand:brand_id(name), model:model_id(name), color:color_id(name)')
        .eq('id', doc.vehicle_id)
        .single();
      setEditReservationVehicle(vehicle);
      setIsEditReservationOpen(true);
    } else if (type === 'close_deal') {
      const { data: vehicle } = await supabase
        .from('vehicles')
        .select('*, brand:brand_id(name), model:model_id(name), color:color_id(name)')
        .eq('id', doc.vehicle_id)
        .single();
      setEditCloseDealDocId(doc.id);
      setEditCloseDealVehicle(vehicle);
      setIsEditCloseDealOpen(true);
    }
  };

  const handleEditSuccess = () => {
    setIsEditDrawerOpen(false);
    setEditDocumentId(null);
    setEditDocumentType('');
    setEditVehicleId(0);
    setIsEditSaleOpen(false);
    setEditSaleDocId(null);
    setEditSaleVehicle(null);
    setIsEditReservationOpen(false);
    setEditReservationVehicle(null);
    setIsEditCloseDealOpen(false);
    setEditCloseDealDocId(null);
    setEditCloseDealVehicle(null);
    fetchDocuments();
  };

  const handleCreateDocument = (type: string) => {
    // Consignment and purchase documents are created as part of the vehicle
    // acquisition flow, so route the user to the add-vehicle page with the
    // acquisition type preselected instead of opening a standalone drawer.
    if (type === 'consignment' || type === 'purchase') {
      navigate(`/vehiculos/agregar?acquisitionType=${type}`);
      return;
    }
    // Ficha técnica: solo se elige el vehículo; se crea como documento de una con la
    // plantilla YA guardada del cliente (los campos se configuran en Configuración →
    // Plantillas, no se re-preguntan acá).
    if (type === 'spec_sheet') {
      setShowSpecSheetPicker(true);
      return;
    }
    setPendingDocType(type);
    setIsCreationDialogOpen(true);
  };

  // Crea la ficha técnica como documento del vehículo DIRECTO (sin modal de campos):
  // inserta la fila en vehicles_documents y refresca la lista. Una por vehículo; al
  // abrirla se genera el PDF con la plantilla guardada (ver openDocumentViewer).
  const createSpecSheetDocument = async (vehicle: any) => {
    const cid = vehicle?.client_id ?? clientId;
    if (!vehicle?.id || !cid) return;
    try {
      const { data: existing } = await supabase
        .from('vehicles_documents')
        .select('id')
        .eq('vehicle_id', vehicle.id)
        .eq('type', 'spec_sheet')
        .limit(1)
        .maybeSingle();
      if (!existing) {
        const { error } = await supabase.from('vehicles_documents').insert({
          client_id: cid,
          vehicle_id: vehicle.id,
          type: 'spec_sheet',
          status: 'completed',
        });
        if (error) throw error;
      }
      toast({
        title: existing ? 'Ficha técnica ya existía' : 'Ficha técnica creada',
        description: 'Quedó en Documentos. Al abrirla se genera con la plantilla guardada.',
      });
      fetchDocuments();
    } catch {
      toast({
        title: 'No se pudo crear la ficha técnica',
        description: 'Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  // Single source of truth for the create-new dropdown items. Rendered in both
  // desktop and mobile menus. Items are filtered by the client's available
  // templates — a document type only appears if the client has a plantilla for it.
  const ALL_CREATE_MENU_ITEMS: Array<{
    type: DocumentTemplateType;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    { type: 'sale', label: t('documents.types.sale'), Icon: LuShoppingCart },
    { type: 'reservation', label: t('documents.types.reservation'), Icon: LuCalendarCheck },
    { type: 'quotation', label: t('documents.types.quotation'), Icon: LuFileText },
    { type: 'consignment', label: t('documents.types.consignment'), Icon: LuHandshake },
    { type: 'purchase', label: t('documents.types.purchase'), Icon: LuDollarSign },
    { type: 'close_deal', label: t('documents.types.closeDeal'), Icon: LuFileCheck },
    { type: 'spec_sheet', label: 'Ficha Técnica', Icon: LuFileText },
  ];

  // While templates are loading, show all items (avoid a flicker/empty menu).
  // Once loaded, filter to only the types the client has a plantilla for.
  // La ficha técnica SIEMPRE está disponible (no requiere plantilla previa:
  // por defecto muestra todos los campos).
  const createMenuItems = loadingTypes
    ? ALL_CREATE_MENU_ITEMS
    : ALL_CREATE_MENU_ITEMS.filter(
        (item) => item.type === 'spec_sheet' || availableTypes.has(item.type)
      );

  const handleCreationClose = () => {
    setIsCreationDialogOpen(false);
    setPendingDocType(null);
  };

  const handleCreationSuccess = () => {
    posthog.capture({
      distinctId: userId || 'anonymous',
      event: 'document_created',
      properties: { template_id: pendingDocType || 'unknown' },
    });
    handleCreationClose();
    fetchDocuments();
  };

  const typeOptions = [
    { key: 'all', label: t('documents.vehicleDocs.allTypes') },
    ...Object.entries(documentTypeConfig).map(([key, cfg]) => ({
      key,
      label: cfg.label,
    })),
  ];

  // Sort
  const toggleSort = (key: 'vehicle' | 'type' | 'date') => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'vehicle') {
      const aName = `${a.vehicle?.brand?.name || ''} ${a.vehicle?.model?.name || ''}`.trim();
      const bName = `${b.vehicle?.brand?.name || ''} ${b.vehicle?.model?.name || ''}`.trim();
      return aName.localeCompare(bName) * dir;
    }
    if (sortKey === 'type') {
      return a.type.localeCompare(b.type) * dir;
    }
    // date
    const aDate = new Date(a.document_date || a.created_at).getTime();
    const bDate = new Date(b.document_date || b.created_at).getTime();
    return (aDate - bDate) * dir;
  });

  // Pagination
  const totalPages = Math.ceil(sortedDocuments.length / DOCS_PER_PAGE);
  const startIdx = (currentPage - 1) * DOCS_PER_PAGE;
  const paginatedDocs = sortedDocuments.slice(startIdx, startIdx + DOCS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Sticky header — pills + filters in one row */}
      <div className="sticky top-0 z-10 bg-[#f5f5f7] border-b border-slate-200/60">
        <div className="px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-3">
          {/* Desktop: single row */}
          <div className="hidden sm:flex sm:items-center sm:gap-3">
            {/* Tab pills */}
            <div className="flex flex-nowrap gap-2 shrink-0">
              {tabNav.tabs.map((tab) => {
                const isActive = tabNav.activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => tabNav.setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                        : 'hover:bg-slate-200/60 text-slate-600'
                    }`}
                  >
                    <TabIcon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right group: Search + Filter + CTA */}
            <div className="flex items-center gap-3 ml-auto" style={{ width: '80%' }}>
              <div className="flex-1 min-w-0 relative">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('documents.vehicleDocs.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl h-9 text-[13px] text-slate-500 placeholder:text-slate-400 bg-white border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] focus-visible:ring-primary/20"
                />
              </div>

              {/* Type filter */}
              <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
                <SelectTrigger className="w-auto min-w-[160px] rounded-xl h-9 text-[13px] border-slate-200/60 bg-white shrink-0 text-slate-500 [&>svg]:text-slate-400">
                  <span className="text-[13px] font-medium">
                    {typeOptions.find(o => o.key === filterType)?.label}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(({ key, label }) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-xl h-9 text-[13px] flex items-center gap-2 px-3.5 shrink-0">
                    <LuPlus className="h-4 w-4" />
                    <span>{t('documents.vehicleDocs.createNew')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {createMenuItems.map(({ type, label, Icon }) => (
                    <DropdownMenuItem key={type} onClick={() => handleCreateDocument(type)}>
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Mobile: pills row, then filters row */}
          <div className="sm:hidden space-y-2.5">
            <div className="flex flex-nowrap gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
              {tabNav.tabs.map((tab) => {
                const isActive = tabNav.activeTab === tab.id;
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => tabNav.setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                        : 'hover:bg-slate-200/60 text-slate-600'
                    }`}
                  >
                    <TabIcon className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterType} onValueChange={(v) => setFilterType(v)}>
                <SelectTrigger className="w-auto min-w-[140px] rounded-xl h-9 text-[13px] border-slate-200/60 bg-white text-slate-500 [&>svg]:text-slate-400">
                  <span className="text-[13px] font-medium">
                    {typeOptions.find(o => o.key === filterType)?.label}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(({ key, label }) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 relative">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={t('documents.vehicleDocs.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl h-9 text-[13px] text-slate-500 placeholder:text-slate-400 bg-white border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] focus-visible:ring-primary/20"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="rounded-xl h-9 text-[13px] flex items-center gap-2 px-3 shrink-0">
                    <LuPlus className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {createMenuItems.map(({ type, label, Icon }) => (
                    <DropdownMenuItem key={type} onClick={() => handleCreateDocument(type)}>
                      <Icon className="h-4 w-4 mr-2" />
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content — table */}
      <div className="flex-1 overflow-auto">
        {filteredDocuments.length === 0 ? (
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 px-8 flex flex-col items-center text-center">
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-2xl border border-slate-200/80 bg-slate-50/50 transform rotate-6" />
                <div className="absolute inset-0 rounded-2xl border border-slate-200/80 bg-slate-50/80 transform -rotate-3" />
                <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                  <LuFileText className="h-9 w-9 text-slate-400" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                {t('documents.vehicleDocs.noDocuments')}
              </h3>
              <p className="text-sm text-slate-400">
                {t('documents.vehicleDocs.noDocumentsDescription')}
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60">
                  <th className="text-left text-[12px] font-medium text-slate-400 py-2.5 pl-4 pr-4 w-[40%]">
                    <button onClick={() => toggleSort('vehicle')} className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors">
                      Vehículo
                      {sortKey === 'vehicle' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </th>
                  <th className="text-left text-[12px] font-medium text-slate-400 py-2.5 pr-4 w-[20%]">
                    <button onClick={() => toggleSort('type')} className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors">
                      Tipo de documento
                      {sortKey === 'type' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </th>
                  <th className="text-left text-[12px] font-medium text-slate-400 py-2.5 pr-4 hidden sm:table-cell w-[20%]">
                    <button onClick={() => toggleSort('date')} className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors">
                      Última actualización
                      {sortKey === 'date' ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                    </button>
                  </th>
                  <th className="text-right text-[12px] font-medium text-slate-400 py-2.5 pr-4 w-[20%]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDocs.map((doc) => {
                  const config = documentTypeConfig[doc.type as keyof typeof documentTypeConfig] || documentTypeConfig.other;
                  const Icon = config.icon;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => openDocumentViewer(doc.id, doc.type)}
                      className="group border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                    >
                      {/* Vehicle */}
                      <td className="py-2.5 pl-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                            {doc.vehicle?.main_image ? (
                              <img src={doc.vehicle.main_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <LuCar className="h-4 w-4 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-medium text-slate-900 truncate">
                              {doc.vehicle?.brand?.name || doc.vehicle?.model?.name ? (
                                <>
                                  {doc.vehicle.brand?.name} {doc.vehicle.model?.name} {doc.vehicle.year}
                                </>
                              ) : (
                                `Vehiculo ID: ${doc.vehicle_id}`
                              )}
                            </p>
                            {doc.vehicle?.license_plate && (
                              <p className="text-[11px] text-slate-400 mt-0.5">{doc.vehicle.license_plate}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Type badge */}
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${config.bgColor} ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 pr-4 hidden sm:table-cell">
                        <span className="text-[12px] text-slate-500">
                          {formatDate(doc.document_date || doc.created_at)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDocumentViewer(doc.id, doc.type); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                            title="Ver documento"
                          >
                            <LuEye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openDocumentViewer(doc.id, doc.type, true); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                            title="Descargar documento"
                          >
                            <LuDownload className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditDrawer(doc); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                            title="Editar documento"
                          >
                            <LuPencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); goToVehicle(doc.vehicle_id); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors"
                            title="Ir al vehiculo"
                          >
                            <LuCar className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {filteredDocuments.length > 0 && (
        <div className="border-t border-slate-200/40">
          <VehiclesPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={filteredDocuments.length}
            pageSize={DOCS_PER_PAGE}
            onPageChange={setCurrentPage}
            showingText={t('documents.vehicleDocs.showing')}
          />
        </div>
      )}

      {/* Document Viewers */}
      {showViewer && selectedDocumentId && (
        <>
          {selectedDocumentType === 'sale' && (
            <SaleNoteViewerProDialog documentId={selectedDocumentId} isOpen={showViewer} onClose={closeViewer} autoDownload={viewerAutoDownload} />
          )}
          {selectedDocumentType === 'purchase' && (
            <PurchaseNoteViewerPro documentId={selectedDocumentId} isOpen={showViewer} onClose={closeViewer} autoDownload={viewerAutoDownload} />
          )}
          {selectedDocumentType === 'consignment' && (
            <ConsignmentNoteViewerPro documentId={selectedDocumentId} isOpen={showViewer} onClose={closeViewer} autoDownload={viewerAutoDownload} />
          )}
          {selectedDocumentType === 'reservation' && (
            <ReservationNoteViewerPro documentId={selectedDocumentId} isOpen={showViewer} onClose={closeViewer} autoDownload={viewerAutoDownload} />
          )}
          {selectedDocumentType === 'quotation' && (
            <QuotationViewerPro documentId={selectedDocumentId} isOpen={showViewer} onClose={closeViewer} autoDownload={viewerAutoDownload} />
          )}
          {selectedDocumentType === 'close_deal' && (
            <CloseBusinessDealViewerPro documentId={selectedDocumentId} isOpen={showViewer} onClose={closeViewer} autoDownload={viewerAutoDownload} />
          )}
          {selectedDocumentType === 'spec_sheet' && (() => {
            const doc = documents.find((d) => d.id === selectedDocumentId);
            return doc ? (
              <SpecSheetViewerPro
                isOpen={showViewer}
                onClose={closeViewer}
                vehicleId={doc.vehicle_id}
                clientId={(doc as any).client_id ?? clientId}
                autoDownload={viewerAutoDownload}
              />
            ) : null;
          })()}
        </>
      )}

      {/* Generic Document Edit Drawer (quotation, purchase, consignment) */}
      {editDocumentId && editDocumentType && (
        <DocumentEditDrawer
          isOpen={isEditDrawerOpen}
          onClose={() => setIsEditDrawerOpen(false)}
          documentId={editDocumentId}
          documentType={editDocumentType as any}
          vehicleId={editVehicleId}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Sale Edit Dialog */}
      {editSaleDocId && editSaleVehicle && (
        <VehicleSaleCreateEditDialog
          isOpen={isEditSaleOpen}
          onClose={() => { setIsEditSaleOpen(false); setEditSaleDocId(null); setEditSaleVehicle(null); }}
          saleId={editSaleDocId}
          initialData={true}
          vehicle={editSaleVehicle}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Reservation Edit Dialog */}
      {editReservationVehicle && (
        <VehicleReservationDialog
          isOpen={isEditReservationOpen}
          onClose={() => { setIsEditReservationOpen(false); setEditReservationVehicle(null); }}
          vehicle={editReservationVehicle}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Close Deal Edit Dialog */}
      {editCloseDealDocId && editCloseDealVehicle && (
        <CloseBusinessDealDrawer
          isOpen={isEditCloseDealOpen}
          onClose={() => { setIsEditCloseDealOpen(false); setEditCloseDealDocId(null); setEditCloseDealVehicle(null); }}
          vehicle={editCloseDealVehicle}
          onSuccess={handleEditSuccess}
          documentId={editCloseDealDocId}
          isEditMode
        />
      )}

      {/* Creation dialogs — vehicle=null triggers Step 0 (vehicle selection) inside each drawer */}
      {pendingDocType === 'sale' && (
        <VehicleSaleCreateEditDialog
          isOpen={isCreationDialogOpen}
          onClose={handleCreationClose}
          vehicle={null}
          onSuccess={handleCreationSuccess}
        />
      )}
      {pendingDocType === 'reservation' && (
        <VehicleReservationDialog
          isOpen={isCreationDialogOpen}
          onClose={handleCreationClose}
          vehicle={null}
          onSuccess={handleCreationSuccess}
        />
      )}
      {pendingDocType === 'quotation' && (
        <QuotationDrawer
          open={isCreationDialogOpen}
          onOpenChange={(open) => { if (!open) handleCreationClose(); }}
          vehicleId={null}
          onSuccess={handleCreationSuccess}
        />
      )}
      {pendingDocType === 'close_deal' && (
        <CloseBusinessDealDrawer
          isOpen={isCreationDialogOpen}
          onClose={handleCreationClose}
          vehicle={null}
          onSuccess={handleCreationSuccess}
        />
      )}

      {/* Ficha técnica: se elige el vehículo y se crea como documento de una (la
          plantilla ya está guardada; se configura en Configuración → Plantillas). */}
      <VehicleSelectorDialog
        isOpen={showSpecSheetPicker}
        onClose={() => setShowSpecSheetPicker(false)}
        onSelect={(v) => {
          setShowSpecSheetPicker(false);
          createSpecSheetDocument(v);
        }}
      />
    </>
  );
};

export default VehicleDocumentsTab;
