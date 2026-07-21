import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { Vehicle } from '@/types/vehicle';
import { ArrowDown, ArrowUp, Car, Loader2 } from 'lucide-react';
import { VehicleColumn } from './vehiculos/TableColumnSelector';
import DynamicTableCell from './vehiculos/DynamicTableCell';
import VehicleTableActions from './vehiculos/VehicleTableActions';
import VehiclesPagination from './vehiculos/VehiclesPagination';
import { useI18n } from '@/hooks/useI18n';
import { useStatuses } from '@/hooks/useStatuses';
import { supabase } from '@/integrations/supabase/client';
import StatusBadge from './vehiculos/StatusBadge';
import { ChevronDown, Check } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useStatusUpdate } from '@/hooks/vehicle/useStatusUpdate';
import { getMultipleVehicleChecklistSummaries } from '@/services/vehicleChecklistService';
import type { ChecklistSummary } from '@/types/vehicleChecklist';
import VehicleReservationDialog from '@/components/vehicle/detail/reservations/VehicleReservationDialog';
import VehicleSaleCreateEditDialog from '@/components/vehicle/detail/sales-2/VehicleSaleCreateEditDialog';
import ConsignmentNotificationModal from '@/components/vehiculos/board/ConsignmentNotificationModal';
import VehiclePreviewSheet from '@/components/vehiculos/board/VehiclePreviewSheet';

interface VehiculosTableProps {
  vehicles: Vehicle[];
  isLoading: boolean;
  onDelete: (id: number) => Promise<void>;
  onEdit: (id: number) => void;
  onView: (id: number) => void;
  selectedColumns: VehicleColumn[];
  // Pagination props
  totalCount: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  // Sorting props
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
  // Refresh after status changes
  onRefresh: () => Promise<void> | void;
}

const VehiculosTable: React.FC<VehiculosTableProps> = ({
  vehicles,
  isLoading,
  onDelete,
  onEdit,
  onView,
  selectedColumns,
  totalCount,
  totalPages,
  currentPage,
  pageSize,
  onPageChange,
  sortField,
  sortDirection,
  onSortChange,
  onRefresh,
}) => {
  const [vehicleData, setVehicleData] = useState<Vehicle[]>(vehicles);
  const { tCommon } = useI18n();
  const { statuses } = useStatuses();
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [statusPopoverOpenId, setStatusPopoverOpenId] = useState<number | null>(null);
  // Estados para manejo de ventas existentes
  const [saleData, setSaleData] = useState<any>(null);
  const [saleId, setSaleId] = useState<number | null>(null);
  // Estados para el preview sheet
  const [previewVehicle, setPreviewVehicle] = useState<Vehicle | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const {
    handleStatusChange,
    showSaleDialog,
    setShowSaleDialog,
    processPostNotificationActions,
    showNotificationModal,
    selectedVehicle,
    setSelectedVehicle,
    statusUpdateData,
  } = useStatusUpdate(
    () => {
      // refresh callback
      onRefresh?.();
    },
    setShowReservationDialog,
    true
  );

  // Sale dates for sold vehicles — used to cap daysInStock at sale_date
  const [saleDatesMap, setSaleDatesMap] = useState<Map<number, string>>(new Map());

  // Stable key over the prop's vehicle ids (sorted). Using the prop instead of
  // local `vehicleData` avoids re-running these side effects on optimistic
  // updates (status change), which only mutate fields, not the id set.
  const vehicleIdsKey = useMemo(
    () =>
      (vehicles.map((v) => v.id).filter(Boolean) as number[])
        .slice()
        .sort((a, b) => a - b)
        .join(','),
    [vehicles]
  );

  useEffect(() => {
    if (!vehicleIdsKey) return;
    const vehicleIds = vehicleIdsKey.split(',').map(Number);

    supabase
      .from('vehicles_sales')
      .select('vehicle_id, sale_date')
      .in('vehicle_id', vehicleIds)
      .eq('status', 'approved')
      .then(({ data }) => {
        const map = new Map<number, string>();
        (data || []).forEach(s => {
          if (s.sale_date) map.set(s.vehicle_id, s.sale_date);
        });
        setSaleDatesMap(map);
      });
  }, [vehicleIdsKey]);

  // Checklist summaries for table column
  const [checklistSummaries, setChecklistSummaries] = useState<Map<number, ChecklistSummary>>(new Map());
  const hasChecklistColumn = selectedColumns.some((col) => col.field === 'checklist_status');

  useEffect(() => {
    if (!hasChecklistColumn || !vehicleIdsKey) {
      setChecklistSummaries(new Map());
      return;
    }
    const vehicleIds = vehicleIdsKey.split(',').map(Number);

    getMultipleVehicleChecklistSummaries(vehicleIds)
      .then((summaries) => setChecklistSummaries(summaries))
      .catch((err) => console.error('Error fetching checklist summaries:', err));
  }, [hasChecklistColumn, vehicleIdsKey]);

  const labelFor = (field: string, fallback: string) => {
    const keyMap: Record<string, string> = {
      vehicle: 'vehicles.columns.vehicle.label',
      license_plate: 'vehicles.columns.license_plate.label',
      price: 'vehicles.columns.price.label',
      status: 'vehicles.columns.status.label',
      seller: 'vehicles.columns.seller.label',
      is_consigned: 'vehicles.columns.is_consigned.label',
      created_at: 'vehicles.columns.created_at.label',
      days_in_stock: 'vehicles.columns.created_at.label',
      mileage: 'vehicles.columns.mileage.label',
      year: 'vehicles.columns.year.label',
      category: 'vehicles.columns.category.label',
      color: 'vehicles.columns.color.label',
      condition: 'vehicles.columns.condition.label',
      fuel_type: 'vehicles.columns.fuel_type.label',
      transmission: 'vehicles.columns.transmission.label',
      views: 'vehicles.columns.views.label',
      min_price: 'vehicles.columns.min_price.label',
      purchase_price: 'vehicles.columns.purchase_price.label',
      owners: 'vehicles.columns.owners.label',
      keys: 'vehicles.columns.keys.label',
      engine_number: 'vehicles.columns.engine_number.label',
      chassis_number: 'vehicles.columns.chassis_number.label',
      transfer_value: 'vehicles.columns.transfer_value.label',
      net_profit: 'vehicles.columns.net_profit.label',
    };
    const key = keyMap[field];
    return key ? tCommon(key) : fallback;
  };

  // Update vehicle data when vehicles prop changes
  useEffect(() => {
    setVehicleData(vehicles);
  }, [vehicles]);

  const sortedStatuses = useMemo(
    () =>
      [...statuses].sort(
        (a, b) => (a.order || 0) - (b.order || 0)
      ),
    [statuses]
  );

  const handleVehicleUpdate = (updatedVehicle: Vehicle) => {
    setVehicleData((prev) =>
      prev.map((vehicle) =>
        vehicle.id === updatedVehicle.id ? updatedVehicle : vehicle
      )
    );
  };

  // Verifica si existe una venta para el vehículo antes de abrir el diálogo
  const checkExistingSaleAndOpenDialog = async (vehicle: Vehicle) => {
    try {
      const { data: existingSaleData, error } = await supabase
        .from('vehicles_sales')
        .select('*, document:document_id(*)')
        .eq('vehicle_id', vehicle.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking existing sale:', error);
      }

      if (existingSaleData) {
        // Si existe una venta, cargar los datos para modo edición
        setSaleData(existingSaleData);
        setSaleId(existingSaleData.document_id);
      } else {
        // Si no existe, limpiar los datos (modo crear)
        setSaleData(null);
        setSaleId(null);
      }

      // Abrir el diálogo después de verificar
      setShowSaleDialog(true);
    } catch (error) {
      console.error('Error checking existing sale:', error);
      // Abrir el diálogo de todas formas
      setSaleData(null);
      setSaleId(null);
      setShowSaleDialog(true);
    }
  };

  // Handle vehicle preview
  const handlePreviewVehicle = (vehicle: Vehicle) => {
    setPreviewVehicle(vehicle);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewVehicle(null);
  };

  const handleViewDetails = (vehicleId: number) => {
    setIsPreviewOpen(false);
    setPreviewVehicle(null);
    onView(vehicleId);
  };

  const toggleSort = (field: string) => {
    const column = selectedColumns.find((col) => col.field === field);
    if (!column?.sortable) return;

    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(field, newDirection);
    } else {
      onSortChange(field, 'desc');
    }
  };

  const calculateDaysInStock = (vehicle: Vehicle): number => {
    if (!vehicle.created_at) return 0;
    const creationDate = new Date(vehicle.created_at);
    if (Number.isNaN(creationDate.getTime())) return 0;
    const saleDate = saleDatesMap.get(vehicle.id);
    const parsedSaleDate = saleDate ? new Date(saleDate) : null;
    const endDate =
      parsedSaleDate && !Number.isNaN(parsedSaleDate.getTime())
        ? parsedSaleDate
        : new Date();
    const diffTime = Math.abs(endDate.getTime() - creationDate.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Number.isFinite(days) ? days : 0;
  };

  if (isLoading && vehicleData.length === 0) {
    return (
      <div className='h-full flex items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-slate-400' />
      </div>
    );
  }

  if (vehicleData.length === 0 && !isLoading) {
    return (
      <div className='px-4 sm:px-6 lg:px-8 py-8'>
        <div className='bg-white rounded-2xl border-2 border-dashed border-slate-200 py-16 px-8 flex flex-col items-center text-center'>
          <div className='relative w-24 h-24 mb-6'>
            <div className='absolute inset-0 rounded-2xl border border-slate-200/80 bg-slate-50/50 transform rotate-6' />
            <div className='absolute inset-0 rounded-2xl border border-slate-200/80 bg-slate-50/80 transform -rotate-3' />
            <div className='absolute inset-0 rounded-2xl border border-slate-200 bg-white flex items-center justify-center shadow-sm'>
              <Car className='h-9 w-9 text-slate-400' />
            </div>
          </div>
          <h3 className='text-lg font-semibold text-slate-900 mb-1.5'>
            {tCommon('vehicles.table.empty')}
          </h3>
        </div>
      </div>
    );
  }

  // Calculate minimum width based on selected columns
  const minWidth = selectedColumns.reduce((total, col) => {
    const width = parseInt(col.width?.replace('px', '') || '100');
    return total + width;
  }, 120); // Add 120px for actions column

  const changeStatusFromTable = (vehicle: Vehicle, newStatusId: number) => {
    // Cerrar popover inmediatamente
    setStatusPopoverOpenId(null);

    // Resolver nombres de estado sin llamadas al backend
    const newStatus = statuses.find((s) => s.id === newStatusId);
    const newStatusName = newStatus?.name || 'Desconocido';
    const oldStatusName = vehicle.status?.name || 'Desconocido';

    // Optimistic update: status_id y objeto status para reflejar nombre/color
    setVehicleData((prev) =>
      prev.map((v) =>
        v.id === vehicle.id
          ? {
              ...v,
              status_id: newStatusId,
              status: {
                ...(v.status || {}),
                id: newStatusId,
                name: newStatus?.name || v.status?.name,
                color: newStatus?.color || v.status?.color,
              } as any,
            }
          : v
      )
    );

    // Abrir diálogos relevantes inmediatamente para evitar latencia percibida
    if (newStatusName === 'Vendido') {
      setSelectedVehicle(vehicle);
      // Verificar si existe una venta para este vehículo antes de abrir el diálogo
      checkExistingSaleAndOpenDialog(vehicle);
    } else if (newStatusName === 'Reservado') {
      setSelectedVehicle(vehicle);
      setShowReservationDialog(true);
    }

    // Ejecutar flujo oficial (validaciones, notificación, grabado, etc.)
    handleStatusChange(
      Number(vehicle.id),
      newStatusId,
      Boolean(vehicle.is_consigned),
      oldStatusName,
      newStatusName
    );
  };

  return (
    <div className='h-full flex flex-col'>
      <div className='flex-1 flex flex-col min-h-0'>
        <div className='flex-1 overflow-auto min-h-0 px-4 sm:px-6 lg:px-8 py-4'>
          <div className='bg-white rounded-2xl border border-slate-200/60 overflow-hidden'>
          <Table className='bg-white' style={{ minWidth: `${minWidth}px` }}>
            <TableHeader className='sticky top-0 z-10 bg-white'>
              <TableRow className='border-b border-slate-200/60'>
                {selectedColumns.map((column) => (
                  <TableHead
                    key={column.id}
                    className={`text-[12px] font-medium text-slate-400 py-2.5 px-4 whitespace-nowrap ${
                      column.sortable ? 'cursor-pointer hover:text-slate-600' : ''
                    }`}
                    style={{ width: column.width }}
                    onClick={() =>
                      column.sortable ? toggleSort(column.field) : undefined
                    }
                  >
                    <div className='flex items-center gap-1'>
                      {labelFor(column.field, column.label)}
                      {column.sortable && sortField === column.field && (
                        <span className='text-slate-600'>
                          {sortDirection === 'asc' ? (
                            <ArrowUp className='h-3 w-3' />
                          ) : (
                            <ArrowDown className='h-3 w-3' />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
                <TableHead className='w-[120px] text-right text-[12px] font-medium text-slate-400 py-2.5 px-4 whitespace-nowrap'>
                  {tCommon('general.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicleData.map((vehicle) => (
                <TableRow
                  key={vehicle.id}
                  className='border-b border-slate-100 hover:bg-slate-50/50 transition-colors cursor-pointer text-[13px]'
                  onClick={() => handlePreviewVehicle(vehicle)}
                >
                  {selectedColumns.map((column) => {
                    if (column.field === 'status' && column.format === 'badge') {
                      const currentStatusId = vehicle.status_id;
                      return (
                        <td
                          key={`${vehicle.id}-${column.id}`}
                          className='px-4 py-2.5'
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Popover
                            open={statusPopoverOpenId === vehicle.id}
                            onOpenChange={(o) =>
                              setStatusPopoverOpenId(o ? Number(vehicle.id) : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <button
                                className='inline-flex items-center gap-2'
                                onClick={(e) => e.stopPropagation()}
                              >
                                <StatusBadge
                                  status={
                                    vehicle.status?.name ||
                                    tCommon('vehicles.labels.unknown')
                                  }
                                  color={vehicle.status?.color}
                                />
                                <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className='w-64 p-2'>
                              <div className='flex flex-col'>
                                {sortedStatuses.map((s) => {
                                  const isActive = s.id === currentStatusId;
                                  return (
                                    <button
                                      key={s.id}
                                      className={`flex items-center justify-between text-left px-2 py-2 rounded-md text-sm ${
                                        isActive
                                          ? 'bg-accent'
                                          : 'hover:bg-accent/60'
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isActive) {
                                          changeStatusFromTable(vehicle, s.id);
                                        }
                                      }}
                                    >
                                      <span className='flex items-center gap-2'>
                                        <span
                                          className='inline-block h-2.5 w-2.5 rounded-full'
                                          style={{ backgroundColor: s.color || '#999' }}
                                        />
                                        {s.name}
                                      </span>
                                      {isActive && (
                                        <span className='text-[11px] text-muted-foreground flex items-center gap-1'>
                                          <Check className='h-3 w-3 text-green-600' />
                                          Actual
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </td>
                      );
                    }
                    return (
                      <DynamicTableCell
                        key={`${vehicle.id}-${column.id}`}
                        vehicle={vehicle}
                        column={column}
                        daysInStock={calculateDaysInStock(vehicle)}
                        onVehicleUpdate={handleVehicleUpdate}
                        checklistSummary={column.field === 'checklist_status' ? checklistSummaries.get(vehicle.id as number) : undefined}
                      />
                    );
                  })}
                  <VehicleTableActions
                    vehicle={vehicle}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    onView={onView}
                  />
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </div>

        <VehiclesPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageChange={onPageChange}
          isLoading={isLoading}
        />
      </div>
      {/* Dialogs to replicate workflow behavior from board */}
      {showReservationDialog && selectedVehicle && (
        <VehicleReservationDialog
          isOpen={showReservationDialog}
          onClose={() => setShowReservationDialog(false)}
          vehicle={selectedVehicle}
          onSuccess={() => {
            setShowReservationDialog(false);
            onRefresh?.();
          }}
        />
      )}
      {showSaleDialog && selectedVehicle && (
        <VehicleSaleCreateEditDialog
          isOpen={showSaleDialog}
          onClose={() => {
            setShowSaleDialog(false);
            setSaleData(null);
            setSaleId(null);
          }}
          vehicle={selectedVehicle}
          saleId={saleId || undefined}
          initialData={saleData}
          onSuccess={() => {
            setShowSaleDialog(false);
            setSelectedVehicle(null);
            setSaleData(null);
            setSaleId(null);
            window.location.reload();
          }}
        />
      )}
      {showNotificationModal && statusUpdateData && (
        <ConsignmentNotificationModal
          isOpen={showNotificationModal}
          onClose={() => {
            // Al cerrar, continuar el flujo post notificación
            processPostNotificationActions();
          }}
          vehicleId={statusUpdateData.vehicleId}
          previousStatus={statusUpdateData.oldStatus}
          newStatus={statusUpdateData.newStatus}
        />
      )}

      {/* Vehicle Preview Sheet */}
      <VehiclePreviewSheet
        vehicle={previewVehicle}
        open={isPreviewOpen}
        onClose={handleClosePreview}
        onViewDetails={handleViewDetails}
      />
    </div>
  );
};

export default VehiculosTable;
