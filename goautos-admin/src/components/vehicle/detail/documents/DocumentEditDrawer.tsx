import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContentRight } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { getDocumentTypeDisplay } from './DocumentItem';

type DocumentType = 'quotation' | 'purchase' | 'consignment' | 'sale' | 'reservation' | 'close_deal';

interface DocumentEditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number | null;
  documentType: DocumentType;
  vehicleId: number;
  onSuccess: () => void;
}

// Map document types to their specific tables
const DOCUMENT_TABLES: Record<string, string> = {
  quotation: 'vehicles_quotations',
  purchase: 'vehicles_purchases',
  consignment: 'vehicles_consignments',
};

// Fields config per document type
interface FieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'currency' | 'customer';
  dbField: string;
}

const FIELDS_BY_TYPE: Record<string, FieldConfig[]> = {
  quotation: [
    { key: 'customer_id', label: 'Cliente', type: 'customer', dbField: 'customer_id' },
    { key: 'estimated_price', label: 'Precio estimado', type: 'currency', dbField: 'estimated_price' },
    { key: 'validity_period', label: 'Período de validez', type: 'text', dbField: 'validity_period' },
    { key: 'document_date', label: 'Fecha del documento', type: 'date', dbField: 'document_date' },
    { key: 'notes', label: 'Observaciones', type: 'textarea', dbField: 'notes' },
  ],
  purchase: [
    { key: 'customer_id', label: 'Vendedor / Dueño anterior', type: 'customer', dbField: 'customer_id' },
    { key: 'purchase_price', label: 'Precio de compra', type: 'currency', dbField: 'purchase_price' },
    { key: 'document_date', label: 'Fecha del documento', type: 'date', dbField: 'document_date' },
    { key: 'notes', label: 'Observaciones', type: 'textarea', dbField: 'notes' },
  ],
  consignment: [
    { key: 'customer_id', label: 'Propietario', type: 'customer', dbField: 'customer_id' },
    { key: 'agreed_price', label: 'Precio acordado (mínimo)', type: 'currency', dbField: 'agreed_price' },
    { key: 'suggested_price', label: 'Precio sugerido de venta', type: 'currency', dbField: 'suggested_price' },
    { key: 'document_date', label: 'Fecha del contrato', type: 'date', dbField: 'document_date' },
    { key: 'notes', label: 'Observaciones', type: 'textarea', dbField: 'notes' },
  ],
};

const DocumentEditDrawer: React.FC<DocumentEditDrawerProps> = ({
  isOpen,
  onClose,
  documentId,
  documentType,
  vehicleId,
  onSuccess,
}) => {
  const { clientId } = useAuth();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [recordId, setRecordId] = useState<number | null>(null);

  const fields = FIELDS_BY_TYPE[documentType] || [];
  const tableName = DOCUMENT_TABLES[documentType];

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers', clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email, rut')
        .eq('client_id', clientId)
        .order('first_name');
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen && !!clientId,
  });

  // Fetch existing document data
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !documentId || !tableName) return;

      setIsLoading(true);
      try {
        // Fetch from the specific document table using document_id
        const { data: record, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('document_id', documentId)
          .maybeSingle();

        if (error) throw error;

        // Fetch document_date from vehicles_documents
        const { data: docRecord } = await supabase
          .from('vehicles_documents')
          .select('document_date, created_at')
          .eq('id', documentId)
          .single();

        const initialData: Record<string, any> = {};

        if (record) {
          setRecordId(record.id);
          fields.forEach((field) => {
            if (field.key === 'document_date') {
              initialData[field.key] = docRecord?.document_date || docRecord?.created_at || '';
            } else {
              initialData[field.key] = record[field.dbField] ?? '';
            }
          });
        }

        setFormData(initialData);
      } catch (err) {
        console.error('Error fetching document data:', err);
        toast.error('Error al cargar los datos del documento');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, documentId, tableName]);

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!recordId || !tableName) return;

    setIsSaving(true);
    try {
      // Separate document_date (goes to vehicles_documents) from other fields
      const updateData: Record<string, any> = {};
      let documentDate: string | null = null;

      fields.forEach((field) => {
        if (field.key === 'document_date') {
          documentDate = formData[field.key] || null;
        } else if (field.type === 'currency' || field.type === 'number') {
          updateData[field.dbField] = formData[field.key] ? Number(formData[field.key]) : null;
        } else if (field.type === 'customer') {
          updateData[field.dbField] = formData[field.key] ? Number(formData[field.key]) : null;
        } else {
          updateData[field.dbField] = formData[field.key] || null;
        }
      });

      // Update the specific table record
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', recordId);

      if (updateError) throw updateError;

      // Update document_date on vehicles_documents if changed
      if (documentDate) {
        const dateValue = new Date(documentDate);
        if (!isNaN(dateValue.getTime())) {
          const { error: docError } = await supabase
            .from('vehicles_documents')
            .update({ document_date: dateValue.toISOString() })
            .eq('id', documentId);

          if (docError) {
            console.error('Error updating document date:', docError);
          }
        }
      }

      // Update customer_id on vehicles_documents too if it was changed
      if (formData.customer_id) {
        await supabase
          .from('vehicles_documents')
          .update({ customer_id: Number(formData.customer_id) })
          .eq('id', documentId);
      }

      toast.success('Documento actualizado correctamente');
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving document:', err);
      toast.error('Error al guardar los cambios');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (field: FieldConfig) => {
    const value = formData[field.key] ?? '';

    switch (field.type) {
      case 'customer':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Select
              value={value ? value.toString() : ''}
              onValueChange={(v) => handleFieldChange(field.key, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id.toString()}>
                    {customer.first_name} {customer.last_name}
                    {customer.rut ? ` (${customer.rut})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'currency':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">{field.label}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                value={value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="pl-7"
                placeholder="0"
              />
            </div>
            {value > 0 && (
              <p className="text-xs text-muted-foreground">{formatCurrency(Number(value))}</p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !value && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {value ? format(new Date(value), 'PPP', { locale: es }) : 'Seleccionar fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={value ? new Date(value) : undefined}
                  onSelect={(date) => handleFieldChange(field.key, date?.toISOString() || '')}
                  locale={es}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Textarea
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              rows={4}
              placeholder={`Escribir ${field.label.toLowerCase()}...`}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
            />
          </div>
        );

      default:
        return (
          <div key={field.key} className="space-y-1.5">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Input
              type="text"
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.label}
            />
          </div>
        );
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={(o) => !o && onClose()} direction="right">
      <DrawerContentRight className="md:min-w-[420px] md:max-w-[500px]">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-4 py-5 border-b border-slate-100 shrink-0">
            <h2 className="text-sm md:text-base font-semibold text-slate-900">
              Editar {getDocumentTypeDisplay(documentType)}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Modifica los datos del documento y guarda los cambios
            </p>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Cargando datos...</span>
              </div>
            ) : fields.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Este tipo de documento no soporta edición directa desde aquí.
              </div>
            ) : (
              fields.map(renderField)
            )}
          </div>

          {/* Footer */}
          {!isLoading && fields.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 shrink-0 flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DrawerContentRight>
    </Drawer>
  );
};

export default DocumentEditDrawer;
