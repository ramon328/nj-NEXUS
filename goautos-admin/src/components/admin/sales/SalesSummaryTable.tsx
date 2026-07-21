import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowUpDown, Download, Car } from 'lucide-react';
import { useSalesSummary, fetchSalesSummaryRows } from '@/hooks/admin/useSalesSummary';
import { useCurrency } from '@/hooks/useCurrency';
import { useTranslation } from 'react-i18next';
import { CustomerInfoModal } from './CustomerInfoModal';
import { DateFilter } from '@/hooks/admin/useSellerPerformance';
import SaleNoteViewerProDialog from '@/components/vehicle/detail/documents/SaleNoteViewerProDialog';
import { useLocation } from 'wouter';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportSalesSummaryToExcel } from '@/utils/excelExport';
import { DatePickerInput } from '@/components/ui/inputs/DatePickerInput';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import { SalesSummaryCards } from './SalesSummaryCards';

const PAGE_SIZE_TABLE = 15;
const PAGE_SIZE_CARDS = 12;

interface SalesSummaryTableProps {
  clientId: number;
  dateFilter?: DateFilter;
  onExportReady?: (exportFn: (() => void) | null, disabled: boolean) => void;
  viewMode?: 'table' | 'cards';
}

export const SalesSummaryTable: React.FC<SalesSummaryTableProps> = ({
  clientId,
  dateFilter,
  onExportReady,
  viewMode = 'table',
}) => {
  const { t, i18n } = useTranslation('dashboard');
  const { formatPrice } = useCurrency();
  const { toast } = useToast();
  const { sales, loading, sortOrder, toggleSortOrder } = useSalesSummary(
    clientId,
    dateFilter
  );

  const [, navigate] = useLocation();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(
    null
  );
  const [isSaleViewerOpen, setIsSaleViewerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const pageSize = viewMode === 'cards' ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE;

  const handleEmailClick = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCustomerId(null);
  };

  const handleSaleNoteClick = async (saleId: number, vehicleId: number) => {
    try {
      // Buscar el documento de venta relacionado en vehicles_documents
      const { data, error } = await supabase
        .from('vehicles_documents')
        .select('id')
        .eq('vehicle_id', vehicleId)
        .eq('type', 'sale')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching sale document:', error);
        toast({
          title: 'Error',
          description: t('salesSummary.errorLoadingDocument'),
          variant: 'destructive',
        });
        return;
      }

      if (!data) {
        toast({
          title: t('salesSummary.documentNotFound'),
          description: t('salesSummary.documentNotFoundDesc'),
          variant: 'destructive',
        });
        return;
      }

      setSelectedDocumentId(data.id);
      setIsSaleViewerOpen(true);
    } catch (error) {
      console.error('Error in handleSaleNoteClick:', error);
      toast({
        title: 'Error',
        description: t('salesSummary.errorOpeningDocument'),
        variant: 'destructive',
      });
    }
  };

  const handleCloseSaleViewer = () => {
    setIsSaleViewerOpen(false);
    setSelectedDocumentId(null);
  };

  const handleVehicleIdClick = (vehicleId: number) => {
    navigate(`/vehiculos/${vehicleId}`);
  };

  const dv = (es: string, en: string) =>
    i18n.language?.toLowerCase().startsWith('es') ? es : en;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language?.startsWith('es') ? 'es-CL' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const SortIcon = ({ active }: { active?: boolean }) => {
    if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortOrder === 'desc'
      ? <ArrowDown className="h-3 w-3" />
      : <ArrowUp className="h-3 w-3" />;
  };

  // El export pregunta el RANGO en un diálogo — NO depende del filtro en pantalla.
  const handleExportExcel = () => setIsExportOpen(true);

  const doExport = async (
    range: 'all' | 'year' | 'month' | 'last7' | 'custom'
  ) => {
    setIsExporting(true);
    try {
      const now = new Date();
      let filter: DateFilter = {};
      if (range === 'year') {
        filter = { startDate: new Date(now.getFullYear(), 0, 1), endDate: now };
      } else if (range === 'month') {
        filter = { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: now };
      } else if (range === 'last7') {
        filter = { startDate: new Date(now.getTime() - 6 * 86400000), endDate: now };
      } else if (range === 'custom' && customStart && customEnd) {
        filter = {
          startDate: new Date(`${customStart}T00:00:00`),
          endDate: new Date(`${customEnd}T23:59:59`),
        };
      }
      // 'all' → filtro vacío = TODAS las ventas.

      const rows = await fetchSalesSummaryRows(clientId, filter, sortOrder);
      if (rows.length === 0) {
        toast({
          title: t('salesSummary.noDataToExport'),
          description: t('salesSummary.noDataToExportDesc'),
          variant: 'destructive',
        });
        return;
      }
      exportSalesSummaryToExcel({
        sales: rows,
        filename: 'resumen-ventas',
        language: i18n.language?.startsWith('es') ? 'es' : 'en',
      });
      setIsExportOpen(false);
      toast({
        title: t('salesSummary.exportSuccess'),
        description: t('salesSummary.exportSuccessDesc'),
      });
    } catch (e) {
      toast({
        title: 'Error',
        description: 'No se pudo exportar. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    // Botón siempre habilitado: el export trae su propio rango, no depende de la vista.
    onExportReady?.(() => setIsExportOpen(true), false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [sales.length]);

  // Reset page when viewMode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [viewMode]);

  const paginatedSales = sales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <Dialog open={isExportOpen} onOpenChange={(o) => { if (!isExporting) setIsExportOpen(o); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Exportar ventas a Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[13px] text-slate-500">
              Elige qué ventas exportar. No depende del filtro que tengas en pantalla.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'all', label: 'Todas las ventas' },
                { key: 'year', label: 'Este año' },
                { key: 'month', label: 'Este mes' },
                { key: 'last7', label: 'Últimos 7 días' },
              ] as const).map((opt) => (
                <Button
                  key={opt.key}
                  variant="outline"
                  disabled={isExporting}
                  onClick={() => doExport(opt.key)}
                  className="h-10 justify-center"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-[12px] font-medium text-slate-600 mb-2">Rango personalizado</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Desde</label>
                  <DatePickerInput value={customStart} onChange={setCustomStart} />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Hasta</label>
                  <DatePickerInput value={customEnd} onChange={setCustomEnd} />
                </div>
              </div>
              <Button
                className="w-full mt-2 bg-sky-400 hover:bg-sky-500 text-white"
                disabled={isExporting || !customStart || !customEnd}
                onClick={() => doExport('custom')}
              >
                Exportar rango
              </Button>
            </div>
            {isExporting && (
              <p className="text-center text-[12px] text-slate-500">Exportando…</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div>
        <div className="flex justify-end mb-3 lg:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={loading || sales.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('salesSummary.exportExcel')}
          </Button>
        </div>

        {viewMode === 'cards' ? (
          <SalesSummaryCards
            sales={paginatedSales}
            loading={loading}
            onVehicleClick={handleVehicleIdClick}
            onCustomerClick={handleEmailClick}
            onSaleNoteClick={handleSaleNoteClick}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200/60">
                  <th className="text-left text-[12px] font-medium text-slate-400 py-2.5 pl-4 pr-4">
                    {dv('Vehículo', 'Vehicle')}
                  </th>
                  <th className="text-left text-[12px] font-medium text-slate-400 py-2.5 pr-4">
                    <button onClick={toggleSortOrder} className="inline-flex items-center gap-1 hover:text-slate-600 transition-colors">
                      {dv('Transacción', 'Transaction')}
                      <SortIcon active />
                    </button>
                  </th>
                  <th className="text-left text-[12px] font-medium text-slate-400 py-2.5 pr-4">
                    {t('salesSummary.customerEmail')}
                  </th>
                  <th className="text-left text-[12px] font-medium text-slate-400 py-2.5 pr-4 whitespace-nowrap">
                    {t('salesSummary.acquisitionType')}
                  </th>
                  <th className="text-left text-[12px] font-medium text-slate-400 py-2.5 pr-4">
                    {t('salesSummary.seller')}
                  </th>
                  <th className="text-right text-[12px] font-medium text-slate-400 py-2.5 pr-4 whitespace-nowrap">
                    {t('salesSummary.acquisitionPrice')}
                  </th>
                  <th className="text-right text-[12px] font-medium text-slate-400 py-2.5 pr-4 whitespace-nowrap">
                    {t('salesSummary.extrasCost')}
                  </th>
                  <th className="text-right text-[12px] font-medium text-slate-400 py-2.5 pr-4 whitespace-nowrap">
                    {t('salesSummary.salePrice')}
                  </th>
                  <th className="text-right text-[12px] font-medium text-slate-400 py-2.5 pr-4 whitespace-nowrap" title={dv('Comisión pagada al vendedor (autos propios)', 'Commission paid to the salesperson (owned vehicles)')}>
                    {dv('Comisión vendedor', 'Seller commission')}
                  </th>
                  <th className="text-right text-[12px] font-medium text-slate-400 py-2.5 pr-4 whitespace-nowrap" title={dv('Ganancia de la automotora en la consignación', 'Dealership gain on the consignment')}>
                    {dv('Ganancia consignación', 'Consignment gain')}
                  </th>
                  <th className="text-right text-[12px] font-medium text-slate-400 py-2.5 pr-4">
                    {t('salesSummary.profit')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      {Array.from({ length: 11 }).map((_, cellIndex) => (
                        <td key={cellIndex} className="py-3 px-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : sales.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-8">
                      <p className="text-slate-500">
                        {dateFilter?.startDate || dateFilter?.endDate
                          ? dv('No hay ventas en el período seleccionado', 'No sales in the selected period')
                          : t('salesSummary.noSales')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => (
                    <tr key={sale.saleId} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      {/* Vehículo — thumbnail + name + patente/ID */}
                      <td className="py-2.5 pl-4 pr-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleVehicleIdClick(sale.vehicleId)}
                            className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            {sale.vehicleMainImage ? (
                              <img src={sale.vehicleMainImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Car className="h-4 w-4 text-slate-300" />
                              </div>
                            )}
                          </button>
                          <div className="min-w-0">
                            <button
                              onClick={() => handleVehicleIdClick(sale.vehicleId)}
                              className="text-[13px] font-medium text-slate-900 hover:text-primary transition-colors cursor-pointer truncate block"
                            >
                              {sale.vehicleBrand} {sale.vehicleModel} {sale.vehicleYear}
                            </button>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {dv('Patente', 'Plate')}: {sale.vehiclePatent} · ID: {sale.vehicleId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Transacción — date + nota de venta */}
                      <td className="py-2.5 pr-4">
                        <p className="text-[13px] text-slate-700">{formatDate(sale.saleDate)}</p>
                        <button
                          onClick={() => handleSaleNoteClick(sale.saleId, sale.vehicleId)}
                          className="text-[11px] text-slate-400 hover:text-primary cursor-pointer mt-0.5"
                        >
                          {dv('Nota de venta', 'Sale note')}: {sale.saleId}
                        </button>
                      </td>


                      {/* E-mail cliente */}
                      <td className="py-2.5 pr-4">
                        <button
                          onClick={() => handleEmailClick(sale.customerId)}
                          className="text-[13px] text-primary hover:text-primary/80 hover:underline cursor-pointer text-left truncate block max-w-[200px]"
                        >
                          {sale.customerEmail}
                        </button>
                      </td>

                      {/* Adquisición badge */}
                      <td className="py-2.5 pr-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium ${
                          sale.acquisitionType === 'Consignado'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {sale.acquisitionType}
                        </span>
                      </td>

                      {/* Vendedor */}
                      <td className="py-2.5 pr-4">
                        <span className="text-[13px] text-slate-700 whitespace-nowrap">
                          {sale.sellerName !== 'N/A' ? sale.sellerName : <span className="text-slate-400">–</span>}
                        </span>
                      </td>

                      {/* Precio de compra/acordado */}
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                        <span className="text-[13px] text-slate-700 font-medium">
                          {sale.acquisitionPrice !== null ? formatPrice(sale.acquisitionPrice) : <span className="text-slate-400">–</span>}
                        </span>
                      </td>

                      {/* Gastos adicionales */}
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                        <span className="text-[13px] text-slate-700">
                          {sale.extrasCost > 0 ? formatPrice(sale.extrasCost) : <span className="text-slate-400">–</span>}
                        </span>
                      </td>

                      {/* Precio de venta */}
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                        <span className="text-[13px] text-slate-700 font-medium">{formatPrice(sale.salePrice)}</span>
                      </td>

                      {/* Comisión vendedor — solo autos propios */}
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                        {sale.acquisitionType !== 'Consignado' ? (
                          <span className="text-[13px] text-slate-700">{formatPrice(sale.commission)}</span>
                        ) : (
                          <span className="text-slate-400 text-[13px]">–</span>
                        )}
                      </td>

                      {/* Ganancia consignación — solo consignados */}
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                        {sale.acquisitionType === 'Consignado' ? (
                          <span className="text-[13px] text-slate-700">{formatPrice(sale.commission)}</span>
                        ) : (
                          <span className="text-slate-400 text-[13px]">–</span>
                        )}
                      </td>

                      {/* Utilidad */}
                      <td className="py-2.5 pr-4 text-right whitespace-nowrap">
                        {sale.profit !== null ? (
                          <span className={`text-[13px] font-semibold ${
                            sale.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {sale.profit >= 0 ? '+ ' : '- '}{formatPrice(Math.abs(sale.profit))}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[13px]">–</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <VehiclesPagination
          currentPage={currentPage}
          totalPages={Math.ceil(sales.length / pageSize)}
          totalCount={sales.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          showingText={t('salesSummary.showing')}
        />
      </div>

      <CustomerInfoModal
        customerId={selectedCustomerId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />

      {selectedDocumentId && (
        <SaleNoteViewerProDialog
          documentId={selectedDocumentId}
          isOpen={isSaleViewerOpen}
          onClose={handleCloseSaleViewer}
        />
      )}
    </>
  );
};
