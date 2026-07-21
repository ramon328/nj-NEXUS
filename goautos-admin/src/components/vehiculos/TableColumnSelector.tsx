import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehiclesTableStore } from '@/stores/vehiclesTableStore';
import { useI18n } from '@/hooks/useI18n';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';

export interface VehicleColumn {
  id: string;
  label: string;
  field: string;
  description?: string;
  isDefault?: boolean;
  isRequired?: boolean;
  sortable?: boolean;
  width?: string;
  format?: 'text' | 'price' | 'date' | 'datetime' | 'number' | 'boolean' | 'badge' | 'image';
}

export const availableColumns: VehicleColumn[] = [
  {
    id: 'vehicle',
    label: 'Vehículo',
    field: 'vehicle',
    description: 'Imagen, marca, modelo y año del vehículo',
    isDefault: true,
    isRequired: true,
    sortable: true,
    width: '180px',
    format: 'image',
  },
  {
    id: 'license_plate',
    label: 'Patente',
    field: 'license_plate',
    description: 'Patente del vehículo',
    isDefault: false,
    sortable: true,
    width: '100px',
    format: 'text',
  },
  {
    id: 'price',
    label: 'Precio Venta',
    field: 'price',
    description: 'Precio de venta final (solo para vehículos vendidos)',
    isDefault: true,
    sortable: true,
    width: '160px',
    format: 'price',
  },
  {
    id: 'status',
    label: 'Estado',
    field: 'status',
    description: 'Estado actual del vehículo',
    isDefault: true,
    sortable: true,
    width: '100px',
    format: 'badge',
  },
  {
    id: 'seller',
    label: 'Vendedor',
    field: 'seller',
    description: 'Vendedor asignado al vehículo',
    isDefault: false,
    sortable: true,
    width: '130px',
    format: 'text',
  },
  {
    id: 'consigned',
    label: 'Consignado',
    field: 'is_consigned',
    description: 'Si el vehículo está en consignación',
    isDefault: true,
    sortable: true,
    width: '50px',
    format: 'boolean',
  },
  {
    id: 'regimen',
    label: 'Régimen IVA',
    field: 'regimen',
    description: 'Régimen tributario: afecto / exento / consignación (se fija en la entrada)',
    isDefault: false,
    sortable: false,
    width: '90px',
    format: 'text',
  },
  {
    id: 'stock_location',
    label: 'Ubicación',
    field: 'stock_type',
    description: 'Online o en sucursal',
    isDefault: false,
    sortable: true,
    width: '120px',
    format: 'badge',
  },
  {
    id: 'consignment_seller',
    label: 'Captado por',
    field: 'consignment_seller',
    description: 'Vendedor que trajo la consignación',
    isDefault: false,
    sortable: true,
    width: '130px',
    format: 'text',
  },
  {
    id: 'days_in_stock',
    label: 'Días en Stock',
    field: 'days_in_stock',
    description: 'Días desde que se agregó el vehículo',
    isDefault: true,
    sortable: true,
    width: '70px',
    format: 'number',
  },
  // Additional columns
  {
    id: 'mileage',
    label: 'Kilometraje',
    field: 'mileage',
    description: 'Kilometraje del vehículo',
    isDefault: false,
    sortable: true,
    width: '120px',
    format: 'number',
  },
  {
    id: 'year',
    label: 'Año',
    field: 'year',
    description: 'Año del vehículo',
    isDefault: false,
    sortable: true,
    width: '80px',
    format: 'number',
  },
  {
    id: 'category',
    label: 'Categoría',
    field: 'category',
    description: 'Categoría del vehículo (sedán, SUV, etc.)',
    isDefault: false,
    sortable: true,
    width: '110px',
    format: 'text',
  },
  {
    id: 'color',
    label: 'Color',
    field: 'color',
    description: 'Color del vehículo',
    isDefault: false,
    sortable: true,
    width: '100px',
    format: 'text',
  },
  {
    id: 'condition',
    label: 'Condición',
    field: 'condition',
    description: 'Condición del vehículo (nuevo, usado, etc.)',
    isDefault: false,
    sortable: true,
    width: '110px',
    format: 'text',
  },
  {
    id: 'fuel_type',
    label: 'Combustible',
    field: 'fuel_type',
    description: 'Tipo de combustible',
    isDefault: false,
    sortable: true,
    width: '110px',
    format: 'text',
  },
  {
    id: 'transmission',
    label: 'Transmisión',
    field: 'transmission',
    description: 'Tipo de transmisión',
    isDefault: false,
    sortable: true,
    width: '110px',
    format: 'text',
  },
  {
    id: 'views',
    label: 'Visualizaciones',
    field: 'views',
    description: 'Número de visualizaciones',
    isDefault: false,
    sortable: true,
    width: '100px',
    format: 'number',
  },
  /* {
    id: 'discount_percentage',
    label: 'Descuento %',
    field: 'discount_percentage',
    description: 'Porcentaje de descuento aplicado',
    isDefault: false,
    sortable: true,
    width: '110px',
    format: 'number',
  }, */
  {
    id: 'min_price',
    label: 'Precio Mínimo de Venta',
    field: 'min_price',
    description: 'Precio mínimo de venta del vehículo',
    isDefault: false,
    sortable: true,
    width: '130px',
    format: 'price',
  },
  {
    id: 'price',
    label: 'Precio Publicado',
    field: 'price',
    description: 'Precio publicado del vehículo',
    isDefault: false,
    sortable: true,
    width: '130px',
    format: 'price',
  },
  {
    id: 'sale_price',
    label: 'Precio de Venta',
    field: 'sale_price',
    description: 'Precio final de venta (solo para vehículos vendidos)',
    isDefault: false,
    sortable: true,
    width: '130px',
    format: 'price',
  },
  {
    id: 'purchase_price',
    label: 'Precio Compra/Consignación',
    field: 'purchase_price',
    description: 'Precio de compra o consignación del vehículo',
    isDefault: false,
    sortable: true,
    width: '130px',
    format: 'price',
  },
  {
    id: 'owners',
    label: 'Dueños',
    field: 'owners',
    description: 'Número de dueños anteriores',
    isDefault: false,
    sortable: true,
    width: '80px',
    format: 'number',
  },
  {
    id: 'keys',
    label: 'Llaves',
    field: 'keys',
    description: 'Número de llaves',
    isDefault: false,
    sortable: true,
    width: '80px',
    format: 'number',
  },
  {
    id: 'engine_number',
    label: 'N° Motor',
    field: 'engine_number',
    description: 'Número de motor',
    isDefault: false,
    sortable: true,
    width: '110px',
    format: 'text',
  },
  {
    id: 'chassis_number',
    label: 'N° Chasis',
    field: 'chassis_number',
    description: 'Número de chasis',
    isDefault: false,
    sortable: true,
    width: '110px',
    format: 'text',
  },
  /* {
    id: 'has_lien',
    label: 'Tiene Prenda',
    field: 'has_lien',
    description: 'Si el vehículo tiene prenda',
    isDefault: false,
    sortable: true,
    width: '110px',
    format: 'boolean',
  }, */
  /* {
    id: 'is_billable',
    label: 'Facturable',
    field: 'is_billable',
    description: 'Si el vehículo es facturable',
    isDefault: false,
    sortable: true,
    width: '100px',
    format: 'boolean',
  }, */
  /* {
    id: 'tech_inspection_expiry',
    label: 'Venc. Rev. Técnica',
    field: 'tech_inspection_expiry',
    description: 'Fecha de vencimiento de revisión técnica',
    isDefault: false,
    sortable: true,
    width: '150px',
    format: 'date',
  }, */
  /* {
    id: 'circulation_permit_expiry',
    label: 'Venc. Permiso Circ.',
    field: 'circulation_permit_expiry',
    description: 'Fecha de vencimiento del permiso de circulación',
    isDefault: false,
    sortable: true,
    width: '150px',
    format: 'date',
  }, */
  /* {
    id: 'emissions_expiry',
    label: 'Venc. SOAP',
    field: 'emissions_expiry',
    description: 'Fecha de vencimiento del SOAP',
    isDefault: false,
    sortable: true,
    width: '120px',
    format: 'date',
  }, */
  {
    id: 'transfer_value',
    label: 'Valor de Transferencia',
    field: 'transfer_value',
    description: 'Valor de transferencia registrado en la venta',
    isDefault: false,
    sortable: true,
    width: '140px',
    format: 'price',
  },
  {
    id: 'net_profit',
    label: 'Utilidad Neta',
    field: 'net_profit',
    description:
      'Utilidad real solo para vehículos vendidos: Propios (Venta - Compra - Gastos) | Consignados (Venta - Gastos)',
    isDefault: false,
    sortable: true,
    width: '140px',
    format: 'price',
  },
  {
    id: 'net_profit_after_commission',
    label: 'Utilidad Neta c/ Comisión',
    field: 'net_profit_after_commission',
    description:
      'Utilidad neta descontando la comisión pagada al vendedor (solo para vehículos vendidos)',
    isDefault: false,
    sortable: true,
    width: '170px',
    format: 'price',
  },
  {
    id: 'total_expenses',
    label: 'Gastos Totales',
    field: 'total_expenses',
    description:
      'Suma de precio de compra/consignación, gastos adicionales registrados y valor de transferencia',
    isDefault: false,
    sortable: true,
    width: '140px',
    format: 'price',
  },
  {
    id: 'acquired_from',
    label: 'Compró / Consignó',
    field: 'acquired_from',
    description: 'Persona que vendió o consignó el vehículo a la automotora',
    isDefault: false,
    sortable: true,
    width: '160px',
    format: 'text',
  },
  {
    id: 'permit_municipality',
    label: 'Municipalidad',
    field: 'permit_municipality',
    description: 'Municipalidad donde se sacó el permiso de circulación',
    isDefault: false,
    sortable: true,
    width: '150px',
    format: 'text',
  },
  {
    id: 'checklist_status',
    label: 'Checklist',
    field: 'checklist_status',
    description: 'Estado del checklist de preparación del vehículo',
    isDefault: false,
    sortable: true,
    width: '120px',
    format: 'text',
  },
  {
    id: 'state_updated_at',
    label: 'Fecha/Hora Cambio de Estado',
    field: 'state_updated_at',
    description: 'Fecha y hora del último cambio de estado del vehículo',
    isDefault: false,
    sortable: true,
    width: '180px',
    format: 'datetime',
  },
  {
    id: 'updated_at',
    label: 'Fecha/Hora Última Edición',
    field: 'updated_at',
    description: 'Fecha y hora de la última vez que se editó el vehículo',
    isDefault: false,
    sortable: true,
    width: '180px',
    format: 'datetime',
  },
];

export interface TableColumnSelectorProps {
  selectedColumns: VehicleColumn[];
  onColumnsChange: (columns: VehicleColumn[]) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TableColumnSelector: React.FC<TableColumnSelectorProps> = ({
  selectedColumns,
  onColumnsChange,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}) => {
  const { tCommon } = useI18n();
  const { hasPermission } = usePermissions();
  const canSeeFinancials = hasPermission(PermissionCode.SALES_VIEW);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [tempColumns, setTempColumns] =
    useState<VehicleColumn[]>(selectedColumns);

  // Columnas que solo pueden ver los administradores
  const adminOnlyColumns = useMemo(
    () => [
      'purchase_price', // Precio Compra
      'transfer_value', // Valor de Transferencia
      'net_profit', // Utilidad Neta
      'net_profit_after_commission', // Utilidad Neta con Comisión
      'total_expenses', // Gastos Totales (incluye precio de compra)
    ],
    []
  );

  // Filtrar columnas disponibles según permisos del usuario
  const getAvailableColumnsForRole = () => {
    if (!canSeeFinancials) {
      return availableColumns.filter(
        (column) => !adminOnlyColumns.includes(column.id)
      );
    }
    return availableColumns;
  };

  // Memoizar la función de filtrado para evitar problemas de dependencias
  const filterColumnsForRole = useCallback(
    (columns: VehicleColumn[]) => {
      const availableColumnsForRole =
        !canSeeFinancials
          ? availableColumns.filter(
              (column) => !adminOnlyColumns.includes(column.id)
            )
          : availableColumns;

      return columns.filter((column) =>
        availableColumnsForRole.some(
          (availableCol) => availableCol.id === column.id
        )
      );
    },
    [canSeeFinancials, adminOnlyColumns]
  );

  // Efecto para limpiar columnas seleccionadas cuando cambie el rol o se inicialice el componente
  useEffect(() => {
    const filteredColumns = filterColumnsForRole(selectedColumns);
    setTempColumns(filteredColumns);
  }, [canSeeFinancials, selectedColumns, filterColumnsForRole]);

  const labelFor = (columnId: string, fallback: string) => {
    const key = `vehicles.columns.${columnId}.label`;
    return tCommon(key) || fallback;
  };

  const descriptionFor = (columnId: string, fallback?: string) => {
    const key = `vehicles.columns.${columnId}.description`;
    const translated = tCommon(key);
    return translated || fallback || '';
  };

  const handleColumnToggle = (columnId: string) => {
    const availableColumnsForRole = getAvailableColumnsForRole();
    const column = availableColumnsForRole.find((col) => col.id === columnId);
    if (!column || column.isRequired) return;

    setTempColumns((prev) => {
      const isSelected = prev.some((col) => col.id === columnId);
      if (isSelected) {
        return prev.filter((col) => col.id !== columnId);
      } else {
        return [...prev, column];
      }
    });
  };

  const handleSave = () => {
    onColumnsChange(tempColumns);
    setOpen(false);
  };

  const handleCancel = () => {
    setTempColumns(selectedColumns);
    setOpen(false);
  };

  const handleReset = () => {
    const availableColumnsForRole = getAvailableColumnsForRole();
    const defaultColumns = availableColumnsForRole.filter(
      (col) => col.isDefault
    );
    setTempColumns(defaultColumns);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-4xl max-h-[90vh] overflow-hidden flex flex-col pb-6'>
        <DialogHeader>
          <DialogTitle>{tCommon('vehicles.columns.dialogTitle')}</DialogTitle>
          <DialogDescription>
            {tCommon('vehicles.columns.dialogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden'>
          {/* Action Buttons */}
          <div className='flex items-center gap-2 mb-4 pb-4 border-b border-slate-100'>
            <Button onClick={handleReset} variant='ghost' size='sm' className='text-xs text-slate-500 hover:text-slate-700 h-7 px-2'>
              <RotateCcw className='h-3 w-3 mr-1' />
              {tCommon('vehicles.columns.restoreDefault')}
            </Button>

            <div className='ml-auto text-xs text-slate-400'>
              {tCommon('vehicles.columns.selectedCount')
                .replace('{{selected}}', String(tempColumns.length))
                .replace(
                  '{{total}}',
                  String(getAvailableColumnsForRole().length)
                )}
            </div>
          </div>

          {/* Columns Grid — selected first */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pb-4'>
            {[...getAvailableColumnsForRole()].sort((a, b) => {
              const aSelected = tempColumns.some((col) => col.id === a.id);
              const bSelected = tempColumns.some((col) => col.id === b.id);
              if (aSelected && !bSelected) return -1;
              if (!aSelected && bSelected) return 1;
              return 0;
            }).map((column) => {
              const isSelected = tempColumns.some(
                (col) => col.id === column.id
              );

              return (
                <Card
                  key={column.id}
                  className={`p-3 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-sky-300 bg-sky-50/50'
                      : 'hover:bg-slate-50'
                  } ${column.isRequired ? 'border-slate-300 bg-slate-50' : ''}`}
                  onClick={() => handleColumnToggle(column.id)}
                >
                  <CardContent className='p-0'>
                    <div className='flex items-start gap-3'>
                      <Checkbox
                        checked={isSelected}
                        disabled={column.isRequired}
                        onCheckedChange={() => handleColumnToggle(column.id)}
                        className='mt-0.5'
                      />

                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex items-center gap-1.5'>
                            <span className='font-medium text-sm leading-tight'>
                              {labelFor(column.id, column.label)}
                            </span>
                            {isSelected ? (
                              <Eye className='h-3 w-3 text-sky-500 flex-shrink-0' />
                            ) : (
                              <EyeOff className='h-3 w-3 text-slate-300 flex-shrink-0' />
                            )}
                          </div>
                          {column.isRequired && (
                            <Badge
                              className='text-[10px] bg-slate-800 text-white border-0 hover:bg-slate-800 flex-shrink-0'
                            >
                              {tCommon('vehicles.columns.required')}
                            </Badge>
                          )}
                          {column.isDefault && !column.isRequired && (
                            <Badge
                              variant='outline'
                              className='text-[10px] text-slate-500 flex-shrink-0'
                            >
                              {tCommon('vehicles.columns.default')}
                            </Badge>
                          )}
                        </div>

                        {(column.description || descriptionFor(column.id)) && (
                          <p className='text-xs text-slate-500 leading-tight mt-0.5'>
                            {descriptionFor(column.id, column.description)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <DialogFooter className='gap-2 mt-4'>
          <Button variant='outline' onClick={handleCancel}>
            {tCommon('buttons.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {tCommon('vehicles.columns.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TableColumnSelector;
