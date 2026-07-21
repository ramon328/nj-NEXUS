import React, { useState, useEffect, useRef } from 'react';
import type { DocTabNavProps } from '@/pages/Documentos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import posthog from '@/utils/posthog';
import { Drawer, DrawerContentRight, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import {
  LuSearch,
  LuCar,
  LuCalendar,
  LuFolderOpen,
  LuFile,
  LuPlus,
  LuUpload,
  LuX,
  LuFileText,
  LuReceipt,
  LuDollarSign,
  LuFileCheck,
  LuScrollText,
} from 'react-icons/lu';
import { Loader2, ChevronRight, ExternalLink } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadImage } from '@/utils/fileUploadUtils';
import { toast } from 'sonner';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';

interface AdditionalDocument {
  id: number;
  vehicle_id: number;
  type: string;
  description?: string;
  amount?: number;
  docs_urls: string[];
  date: string;
  created_at: string;
  vehicle?: {
    id: number;
    brand_name: string;
    model_name: string;
    year: number;
    license_plate: string;
  } | null;
}

interface VehicleOption {
  id: number;
  brand_name: string;
  model_name: string;
  year: number;
  license_plate: string;
}

const DOCS_PER_PAGE = 15;

// Ojo: 'expense'/'income' NO van acá. Este tab solo adjunta documentos (sin
// campo de monto), así que un gasto cargado aquí quedaba con amount=NULL y NO
// se descontaba de la utilidad (reportado: "pulido de focos" no restó). Los
// gastos/ingresos deben registrarse desde el detalle del vehículo (formulario
// de transacción con monto y quién lo asume).
const DOCUMENT_TYPES = [
  'document',
  'contract',
  'invoice',
  'receipt',
  'certificate',
  'other',
];

function getAdditionalDocTypeLabel(t: (key: string, defaultValue?: string) => string, type: string) {
  const fallback = type.charAt(0).toUpperCase() + type.slice(1);
  return t(`documents.additionalDocs.types.${type}`, fallback);
}

const documentTypeConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  document: { icon: LuFileText, color: 'text-slate-600', bgColor: 'bg-slate-50' },
  expense: { icon: LuDollarSign, color: 'text-red-600', bgColor: 'bg-red-50' },
  income: { icon: LuDollarSign, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  contract: { icon: LuScrollText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  invoice: { icon: LuReceipt, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  receipt: { icon: LuReceipt, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  certificate: { icon: LuFileCheck, color: 'text-amber-600', bgColor: 'bg-amber-50' },
  other: { icon: LuFile, color: 'text-slate-500', bgColor: 'bg-slate-50' },
};

const AdditionalDocumentsTab = ({ tabNav }: { tabNav: DocTabNavProps }) => {
  const { t } = useTranslation('common');
  const [, navigate] = useLocation();
  const { clientId, userId } = useAuth();
  const [documents, setDocuments] = useState<AdditionalDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<AdditionalDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Upload drawer state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('document');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const { data: clientVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select(`
          id,
          year,
          license_plate,
          brand:brand_id(name),
          model:model_id(name)
        `)
        .eq('client_id', clientId);

      if (vehiclesError) throw vehiclesError;

      if (!clientVehicles || clientVehicles.length === 0) {
        setDocuments([]);
        return;
      }

      const vehicleIds = clientVehicles.map(v => v.id);

      const { data, error } = await supabase
        .from('vehicles_extras')
        .select('*')
        .in('vehicle_id', vehicleIds)
        .not('docs_urls', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedDocs = (data || [])
        .map((doc) => ({
          ...doc,
          docs_urls: Array.isArray(doc.docs_urls)
            ? doc.docs_urls
            : doc.docs_urls
            ? [doc.docs_urls]
            : [],
          date: (doc as any).date || doc.created_at,
        }))
        .filter((doc) => doc.docs_urls.length > 0);

      const vehiclesList = clientVehicles.map(v => ({
        id: v.id,
        brand_name: v.brand?.name || '',
        model_name: v.model?.name || '',
        year: v.year,
        license_plate: v.license_plate,
      }));

      const vehiclesMap = new Map(
        vehiclesList.map(v => [v.id, v])
      );

      setVehicles(vehiclesList);

      const docsWithVehicles = processedDocs.map(doc => ({
        ...doc,
        vehicle: vehiclesMap.get(doc.vehicle_id) || null,
      }));

      setDocuments(docsWithVehicles);
    } catch (error) {
      console.error('Error fetching additional documents:', error);
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

        return (
          doc.description?.toLowerCase().includes(searchLower) ||
          doc.type?.toLowerCase().includes(searchLower) ||
          vehicle?.brand_name?.toLowerCase().includes(searchLower) ||
          vehicle?.model_name?.toLowerCase().includes(searchLower) ||
          vehicle?.license_plate?.toLowerCase().includes(searchLower)
        );
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

  const goToVehicle = (vehicleId: number) => {
    navigate(`/vehiculos/${vehicleId}`);
  };

  const getFileExtension = (url: string) => {
    const ext = url.split('.').pop()?.toLowerCase();
    return ext || 'file';
  };

  const openDocument = (url: string) => {
    posthog.capture({
      distinctId: userId || 'anonymous',
      event: 'document_downloaded',
      properties: { file_extension: getFileExtension(url) },
    });
    window.open(url, '_blank');
  };

  // Upload functions
  const resetUploadForm = () => {
    setSelectedVehicleId('');
    setDocumentType('document');
    setDocumentTitle('');
    setDocumentDescription('');
    setSelectedFiles([]);
  };

  const handleOpenUploadDialog = () => {
    resetUploadForm();
    setShowUploadDialog(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadDocument = async () => {
    if (!selectedVehicleId || selectedFiles.length === 0) {
      toast.error(t('documents.additionalDocs.upload.validation', 'Selecciona un vehículo y al menos un archivo'));
      return;
    }

    setIsUploading(true);
    try {
      const uploadPromises = selectedFiles.map((file) =>
        uploadImage(file, 'vehicles/documents')
      );
      const uploadedUrls = await Promise.all(uploadPromises);
      const validUrls = uploadedUrls.filter((url): url is string => url !== null);

      if (validUrls.length === 0) {
        throw new Error('No files were uploaded successfully');
      }

      const { error } = await supabase.from('vehicles_extras').insert({
        vehicle_id: parseInt(selectedVehicleId),
        title: documentTitle || 'Documento',
        description: documentDescription || null,
        type: documentType,
        docs_urls: validUrls[0],
      });

      if (error) throw error;

      if (validUrls.length > 1) {
        const additionalInserts = validUrls.slice(1).map((url) => ({
          vehicle_id: parseInt(selectedVehicleId),
          title: documentTitle || 'Documento',
          description: documentDescription || null,
          type: documentType,
          docs_urls: url,
        }));

        const { error: additionalError } = await supabase
          .from('vehicles_extras')
          .insert(additionalInserts);

        if (additionalError) {
          console.error('Error inserting additional documents:', additionalError);
        }
      }

      posthog.capture({
        distinctId: userId || 'anonymous',
        event: 'document_uploaded',
        properties: {
          document_type: documentType,
          file_count: validUrls.length,
        },
      });
      toast.success(
        t('documents.additionalDocs.upload.success', 'Documento(s) subido(s) correctamente')
      );
      setShowUploadDialog(false);
      resetUploadForm();
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(t('documents.additionalDocs.upload.error', 'Error al subir el documento'));
    } finally {
      setIsUploading(false);
    }
  };

  const getFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const typeOptions = [
    { key: 'all', label: t('documents.additionalDocs.allTypes') },
    ...Object.entries(documentTypeConfig).map(([key, cfg]) => ({
      key,
      label: getAdditionalDocTypeLabel(t, key),
    })),
  ];

  // Pagination
  const totalPages = Math.ceil(filteredDocuments.length / DOCS_PER_PAGE);
  const startIdx = (currentPage - 1) * DOCS_PER_PAGE;
  const paginatedDocs = filteredDocuments.slice(startIdx, startIdx + DOCS_PER_PAGE);

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
                  placeholder={t('documents.additionalDocs.searchPlaceholder')}
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

              <Button onClick={handleOpenUploadDialog} className="rounded-xl h-9 text-[13px] flex items-center gap-2 px-3.5 shrink-0">
                <LuPlus className="h-4 w-4" />
                <span>{t('documents.additionalDocs.upload.button', 'Subir Documento')}</span>
              </Button>
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
                  placeholder={t('documents.additionalDocs.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl h-9 text-[13px] text-slate-500 placeholder:text-slate-400 bg-white border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] focus-visible:ring-primary/20"
                />
              </div>
              <Button onClick={handleOpenUploadDialog} className="rounded-xl h-9 text-[13px] flex items-center gap-2 px-3 shrink-0">
                <LuPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        {filteredDocuments.length === 0 ? (
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div
              onClick={handleOpenUploadDialog}
              className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 px-8 flex flex-col items-center text-center cursor-pointer hover:border-slate-300 transition-colors"
            >
              {/* Stacked card icon */}
              <div className="relative w-24 h-24 mb-6">
                <div className="absolute inset-0 rounded-2xl border border-slate-200/80 bg-slate-50/50 transform rotate-6" />
                <div className="absolute inset-0 rounded-2xl border border-slate-200/80 bg-slate-50/80 transform -rotate-3" />
                <div className="absolute inset-0 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm">
                  <LuFolderOpen className="h-9 w-9 text-slate-400" />
                </div>
              </div>

              <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                {t('documents.additionalDocs.noDocuments')}
              </h3>
              <p className="text-sm text-slate-400">
                Sube tu primer documento para comenzar
              </p>
            </div>
          </div>
        ) : (
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <div className="space-y-2.5">
              {paginatedDocs.map((doc) => {
                const config = documentTypeConfig[doc.type] || documentTypeConfig.other;
                const Icon = config.icon;

                return (
                  <div
                    key={doc.id}
                    className="group flex items-center gap-4 p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] hover:border-slate-300/60 transition-all duration-200"
                  >
                    {/* Type icon */}
                    <div className={`w-11 h-11 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] sm:text-sm font-semibold text-slate-900 truncate">
                        {doc.description || t('documents.additionalDocs.untitled')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 capitalize">
                          {doc.type}
                        </span>
                        <span className="text-[12px] text-slate-500 truncate">
                          {doc.vehicle ? (
                            <>
                              {doc.vehicle.brand_name} {doc.vehicle.model_name} {doc.vehicle.year}
                              {doc.vehicle.license_plate && ` · ${doc.vehicle.license_plate}`}
                            </>
                          ) : (
                            `ID: ${doc.vehicle_id}`
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Files count */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                      {doc.docs_urls.length > 0 && (
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/5 text-primary">
                          {doc.docs_urls.length} {doc.docs_urls.length === 1 ? 'archivo' : 'archivos'}
                        </span>
                      )}
                    </div>

                    {/* Date */}
                    <div className="hidden sm:flex items-center gap-1.5 text-[12px] text-slate-400 shrink-0">
                      <LuCalendar className="h-3.5 w-3.5" />
                      {formatDate(doc.date || doc.created_at)}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.docs_urls.map((url, index) => (
                        <button
                          key={index}
                          onClick={() => openDocument(url)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                          title={`${getFileExtension(url).toUpperCase()} - ${t('documents.additionalDocs.file')} ${index + 1}`}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      ))}
                      <button
                        onClick={() => goToVehicle(doc.vehicle_id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title={t('documents.additionalDocs.goToVehicle', 'Ir al vehículo')}
                      >
                        <LuCar className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-400 transition-colors ml-1" />
                    </div>
                  </div>
                );
              })}
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
          />
        </div>
      )}

      {/* Upload Document Drawer */}
      <Drawer open={showUploadDialog} onOpenChange={setShowUploadDialog} direction="right">
        <DrawerContentRight className="md:min-w-[520px]">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 shrink-0">
              <DrawerTitle className="flex items-center gap-2 text-[16px] font-semibold text-slate-900">
                <LuUpload className="h-4 w-4 text-primary" />
                {t('documents.additionalDocs.upload.title', 'Subir Documento')}
              </DrawerTitle>
              <DrawerDescription className="text-[13px] text-slate-500 mt-1">
                {t('documents.additionalDocs.upload.description', 'Selecciona un vehículo y sube los archivos que deseas asociar.')}
              </DrawerDescription>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain p-5">
              <div className="space-y-4">
            {/* Vehicle Selector */}
            <div className="space-y-2">
              <Label htmlFor="vehicle">
                {t('documents.additionalDocs.upload.vehicle', 'Vehículo')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger id="vehicle" className="rounded-xl">
                  <SelectValue placeholder={t('documents.additionalDocs.upload.selectVehicle', 'Selecciona un vehículo')} />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      <div className="flex items-center gap-2">
                        <LuCar className="h-4 w-4 text-slate-500" />
                        <span>
                          {vehicle.brand_name} {vehicle.model_name} {vehicle.year}
                          {vehicle.license_plate && ` (${vehicle.license_plate})`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                {t('documents.additionalDocs.upload.type', 'Tipo de Documento')}
              </Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="type" className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {getAdditionalDocTypeLabel(t, type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                {t('documents.additionalDocs.upload.titleField', 'Título')}
              </Label>
              <Input
                id="title"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder={t('documents.additionalDocs.upload.titlePlaceholder', 'Ej: Factura de compra')}
                className="rounded-xl"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                {t('documents.additionalDocs.upload.descriptionField', 'Descripción')}
              </Label>
              <Textarea
                id="description"
                value={documentDescription}
                onChange={(e) => setDocumentDescription(e.target.value)}
                placeholder={t('documents.additionalDocs.upload.descriptionPlaceholder', 'Descripción opcional del documento...')}
                rows={2}
                className="rounded-xl"
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label>
                {t('documents.additionalDocs.upload.files', 'Archivos')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <div
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                />
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                  <LuUpload className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-[13px] text-slate-600">
                  {t('documents.additionalDocs.upload.dragDrop', 'Haz clic para seleccionar archivos')}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  PDF, DOC, DOCX, JPG, PNG, GIF, WEBP
                </p>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200/60 flex items-center justify-center shrink-0">
                          <LuFile className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] text-slate-700 truncate">{file.name}</p>
                          <p className="text-[11px] text-slate-400">{getFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <LuX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 pb-6 sm:pb-3 border-t border-slate-100 shrink-0 flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowUploadDialog(false)}
                disabled={isUploading}
                className="flex-1 rounded-xl"
              >
                {t('common.cancel', 'Cancelar')}
              </Button>
              <Button
                onClick={handleUploadDocument}
                disabled={isUploading || !selectedVehicleId || selectedFiles.length === 0}
                className="flex-1 gap-2 rounded-xl"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('documents.additionalDocs.upload.uploading', 'Subiendo...')}
                  </>
                ) : (
                  <>
                    <LuUpload className="h-4 w-4" />
                    {t('documents.additionalDocs.upload.submit', 'Subir')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DrawerContentRight>
      </Drawer>
    </>
  );
};

export default AdditionalDocumentsTab;
