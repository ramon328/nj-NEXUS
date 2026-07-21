import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ClipboardCheck,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Wrench,
  FileText,
  ShoppingCart,
  FolderOpen,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { getChecklistCommentCounts } from '@/services/vehicleChecklistService';
import ChecklistItemComments from './ChecklistItemComments';

interface ChecklistItem {
  id: number;
  vehicle_id: number;
  item_id: number;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  item_label: string;
  item_key: string;
  category: string;
  display_order: number;
  assigned_role_id?: number | null;
  assigned_role_name?: string | null;
}

interface VehicleChecklistProps {
  vehicleId: number;
  isOpen?: boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  operativo: { label: 'Operativo', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
  documentacion: { label: 'Documentación', icon: FileText, color: 'text-amber-600 bg-amber-50' },
  venta: { label: 'Venta', icon: ShoppingCart, color: 'text-green-600 bg-green-50' },
  general: { label: 'General', icon: FolderOpen, color: 'text-slate-600 bg-slate-50' },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
}

const VehicleChecklist: React.FC<VehicleChecklistProps> = ({
  vehicleId,
  isOpen: defaultOpen = true,
}) => {
  const { clientId } = useAuth();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommentsItemId, setExpandedCommentsItemId] = useState<number | null>(null);
  const [commentCounts, setCommentCounts] = useState<Map<number, number>>(new Map());

  // Cargar checklist
  const loadChecklist = async () => {
    if (!vehicleId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('vehicle_checklist')
        .select(`
          id,
          vehicle_id,
          item_id,
          is_completed,
          completed_at,
          notes,
          client_checklist_items (
            item_key,
            item_label,
            category,
            display_order,
            assigned_role_id,
            assigned_role:assigned_role_id(id, name)
          )
        `)
        .eq('vehicle_id', vehicleId);

      if (fetchError) {
        console.error('Error loading checklist:', fetchError);
        setError(fetchError.message);
        return;
      }

      const formattedItems = (data || []).map((item: any) => ({
        id: item.id,
        vehicle_id: item.vehicle_id,
        item_id: item.item_id,
        is_completed: item.is_completed,
        completed_at: item.completed_at,
        notes: item.notes,
        item_label: item.client_checklist_items?.item_label || 'Item',
        item_key: item.client_checklist_items?.item_key || '',
        category: item.client_checklist_items?.category || 'general',
        display_order: item.client_checklist_items?.display_order ?? 0,
        assigned_role_id: item.client_checklist_items?.assigned_role_id,
        assigned_role_name: item.client_checklist_items?.assigned_role?.name,
      }));

      setItems(formattedItems);

      // Cargar conteos de comentarios en paralelo (no bloquea el render del checklist)
      const ids = formattedItems.map((i) => i.id);
      if (ids.length > 0) {
        getChecklistCommentCounts(ids)
          .then(setCommentCounts)
          .catch((e) => console.error('Error loading comment counts:', e));
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    items.forEach(item => {
      const cat = item.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    // Sort items within each category by display_order
    Object.values(groups).forEach(group => {
      group.sort((a, b) => a.display_order - b.display_order);
    });
    // Sort categories: operativo, documentacion, venta, general, then any others
    const order = ['operativo', 'documentacion', 'venta', 'general'];
    const sorted = Object.entries(groups).sort(([a], [b]) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return sorted;
  }, [items]);

  // Inicializar checklist
  const handleInitialize = async () => {
    if (!vehicleId || !clientId) {
      toast({
        title: 'Error',
        description: `Faltan datos: vehicleId=${vehicleId}, clientId=${clientId}`,
        variant: 'destructive',
      });
      return;
    }

    setIsInitializing(true);
    setError(null);

    try {
      const { data: clientItems, error: clientItemsError } = await supabase
        .from('client_checklist_items')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (!clientItems || clientItems.length === 0) {
        const defaultItems = [
          { client_id: clientId, item_key: 'maintenance', item_label: 'Mantenimiento realizado', display_order: 1, is_active: true, category: 'operativo' },
          { client_id: clientId, item_key: 'spare_parts', item_label: 'Repuestos verificados', display_order: 2, is_active: true, category: 'operativo' },
          { client_id: clientId, item_key: 'tires', item_label: 'Neumáticos revisados', display_order: 3, is_active: true, category: 'operativo' },
          { client_id: clientId, item_key: 'keys', item_label: 'Llaves completas', display_order: 4, is_active: true, category: 'operativo' },
          { client_id: clientId, item_key: 'safety_kit', item_label: 'Kit de seguridad', display_order: 5, is_active: true, category: 'operativo' },
          { client_id: clientId, item_key: 'cleaning', item_label: 'Limpieza realizada', display_order: 6, is_active: true, category: 'operativo' },
          { client_id: clientId, item_key: 'documentation', item_label: 'Documentación completa', display_order: 7, is_active: true, category: 'documentacion' },
          { client_id: clientId, item_key: 'photos', item_label: 'Fotos tomadas', display_order: 8, is_active: true, category: 'venta' },
        ];

        const { error: insertError } = await supabase
          .from('client_checklist_items')
          .upsert(defaultItems, { onConflict: 'client_id,item_key' })
          .select();

        if (insertError) {
          throw new Error(`Error creando items base: ${insertError.message}`);
        }
      }

      const { data: freshItems, error: freshError } = await supabase
        .from('client_checklist_items')
        .select('id')
        .eq('client_id', clientId)
        .eq('is_active', true);

      if (freshError || !freshItems || freshItems.length === 0) {
        throw new Error('No se pudieron obtener los items del cliente');
      }

      const checklistItems = freshItems.map(item => ({
        vehicle_id: vehicleId,
        item_id: item.id,
        is_completed: false,
      }));

      const { data: createdChecklist, error: createError } = await supabase
        .from('vehicle_checklist')
        .upsert(checklistItems, { onConflict: 'vehicle_id,item_id' })
        .select();

      if (createError) {
        throw new Error(`Error creando checklist: ${createError.message}`);
      }

      toast({
        title: 'Checklist creado',
        description: `Se crearon ${createdChecklist?.length || 0} items`,
      });

      await loadChecklist();
    } catch (err: any) {
      console.error('Initialize error:', err);
      setError(err.message || 'Error al inicializar');
      toast({
        title: 'Error',
        description: err.message || 'No se pudo crear el checklist',
        variant: 'destructive',
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // Toggle item
  const handleToggle = async (itemId: number, currentState: boolean) => {
    const newState = !currentState;

    setItems(prev =>
      prev.map(item =>
        item.id === itemId
          ? { ...item, is_completed: newState, completed_at: newState ? new Date().toISOString() : null }
          : item
      )
    );

    try {
      const { error: updateError } = await supabase
        .from('vehicle_checklist')
        .update({
          is_completed: newState,
          completed_at: newState ? new Date().toISOString() : null,
        })
        .eq('id', itemId);

      if (updateError) {
        console.error('Update error:', updateError);
        loadChecklist();
        toast({
          title: 'Error',
          description: 'No se pudo actualizar',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Toggle error:', err);
      loadChecklist();
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [vehicleId]);

  // Calcular resumen
  const total = items.length;
  const completed = items.filter(i => i.is_completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] p-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando checklist...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] p-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700 flex-1">{error}</span>
          <Button variant="outline" size="sm" onClick={loadChecklist}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] p-6">
        <div className="text-center">
          <ClipboardCheck className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-900 mb-1">
            Sin checklist de preparación
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Crea un checklist para controlar la preparación de este vehículo
          </p>
          <Button
            onClick={handleInitialize}
            disabled={isInitializing}
            size="sm"
          >
            {isInitializing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando checklist...
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Crear Checklist
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                "flex items-center justify-center w-7 h-7 rounded-lg",
                percent === 100 ? "bg-emerald-100" : "bg-slate-100"
              )}>
                {percent === 100 ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <ClipboardCheck className="h-3.5 w-3.5 text-slate-500" />
                )}
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-slate-800">
                  Checklist de Preparación
                </h3>
                <span className="text-xs text-slate-500">
                  {completed}/{total} completados ({percent}%)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    percent === 100 ? "bg-emerald-500" : "bg-primary"
                  )}
                  style={{ width: `${percent}%` }}
                />
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Items grouped by category */}
        <CollapsibleContent>
          <div className="px-4 pb-3 space-y-3">
            {groupedItems.map(([category, categoryItems]) => {
              const config = getCategoryConfig(category);
              const Icon = config.icon;
              const catCompleted = categoryItems.filter(i => i.is_completed).length;
              const catTotal = categoryItems.length;

              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium", config.color)}>
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {catCompleted}/{catTotal}
                    </span>
                  </div>

                  {/* Category items */}
                  <div className="space-y-1">
                    {categoryItems.map((item) => {
                      const commentCount = commentCounts.get(item.id) || 0;
                      const isCommentsOpen = expandedCommentsItemId === item.id;
                      return (
                        <div key={item.id}>
                          <div
                            className={cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
                              item.is_completed
                                ? "bg-slate-50 hover:bg-slate-100"
                                : "hover:bg-slate-50"
                            )}
                            onClick={() => handleToggle(item.id, item.is_completed)}
                          >
                            <Checkbox
                              checked={item.is_completed}
                              className={cn(
                                "h-4 w-4",
                                item.is_completed && "bg-emerald-500 border-emerald-500 text-white"
                              )}
                            />
                            <span
                              className={cn(
                                "text-sm flex-1",
                                item.is_completed
                                  ? "text-slate-500 line-through"
                                  : "text-slate-800"
                              )}
                            >
                              {item.item_label}
                            </span>
                            {item.assigned_role_name && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal text-slate-400 border-slate-200">
                                {item.assigned_role_name}
                              </Badge>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCommentsItemId(isCommentsOpen ? null : item.id);
                              }}
                              className={cn(
                                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-colors flex-shrink-0",
                                commentCount > 0
                                  ? "text-slate-600 hover:bg-slate-200"
                                  : "text-slate-400 hover:bg-slate-200 hover:text-slate-600",
                                isCommentsOpen && "bg-slate-200 text-slate-700"
                              )}
                              title={commentCount > 0 ? `${commentCount} comentario${commentCount === 1 ? '' : 's'}` : 'Agregar comentario'}
                            >
                              <MessageSquare className="h-3 w-3" />
                              {commentCount > 0 && <span>{commentCount}</span>}
                            </button>
                            {item.is_completed && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                            )}
                          </div>
                          {isCommentsOpen && (
                            <ChecklistItemComments
                              vehicleChecklistId={item.id}
                              onCountChange={(newCount) =>
                                setCommentCounts((prev) => {
                                  const next = new Map(prev);
                                  next.set(item.id, newCount);
                                  return next;
                                })
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
              <span className="text-xs text-slate-500">
                {completed === total ? (
                  <span className="text-emerald-600 font-medium">Checklist completado</span>
                ) : (
                  <>{total - completed} items pendientes</>
                )}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  loadChecklist();
                }}
                className="h-7 text-xs text-slate-500"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Actualizar
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default VehicleChecklist;
