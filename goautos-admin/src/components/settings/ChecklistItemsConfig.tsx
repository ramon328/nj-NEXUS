import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  ClipboardCheck,
  Plus,
  Trash2,
  GripVertical,
  Pencil,
  Loader2,
  RefreshCw,
  Wrench,
  FileText,
  ShoppingCart,
  FolderOpen,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ClientChecklistItem } from '@/types/vehicleChecklist';
import {
  getClientChecklistItems,
  createClientChecklistItem,
  updateClientChecklistItem,
  hardDeleteClientChecklistItem,
  reorderClientChecklistItems,
} from '@/services/vehicleChecklistService';
import { useRoles } from '@/hooks/useRoles';

const CATEGORIES = [
  { value: 'operativo', label: 'Operativo', icon: Wrench, color: 'text-blue-600 bg-blue-50' },
  { value: 'documentacion', label: 'Documentación', icon: FileText, color: 'text-amber-600 bg-amber-50' },
  { value: 'venta', label: 'Venta', icon: ShoppingCart, color: 'text-green-600 bg-green-50' },
  { value: 'general', label: 'General', icon: FolderOpen, color: 'text-slate-600 bg-slate-50' },
];

const CATEGORY_ORDER = ['operativo', 'documentacion', 'venta', 'general'];

function getCategoryConfig(category: string) {
  return CATEGORIES.find(c => c.value === category) || CATEGORIES[3];
}

interface SortableChecklistRowProps {
  item: ClientChecklistItem;
  editingItem: ClientChecklistItem | null;
  setEditingItem: (item: ClientChecklistItem | null) => void;
  isSaving: boolean;
  roles: { id: number; name: string }[];
  onToggleActive: (item: ClientChecklistItem) => void;
  onDelete: (itemId: number) => void;
  onUpdateItem: () => void;
}

const SortableChecklistRow: React.FC<SortableChecklistRowProps> = ({
  item,
  editingItem,
  setEditingItem,
  isSaving,
  roles,
  onToggleActive,
  onDelete,
  onUpdateItem,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        item.is_active
          ? 'bg-white border-slate-200/60'
          : 'bg-slate-50/50 border-slate-100 opacity-60'
      } ${isDragging ? 'opacity-50 shadow-lg' : ''}`}
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors touch-none"
        {...attributes}
        {...listeners}
        aria-label="Reordenar item"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-700">{item.item_label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-slate-400">Clave: {item.item_key}</span>
          {item.assigned_role && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              {item.assigned_role.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor={`active-${item.id}`} className="text-[11px] text-slate-400">
            Activo
          </Label>
          <Switch
            id={`active-${item.id}`}
            checked={item.is_active}
            onCheckedChange={() => onToggleActive(item)}
          />
        </div>

        <Dialog
          open={editingItem?.id === item.id}
          onOpenChange={(open) => !open && setEditingItem(null)}
        >
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditingItem({ ...item })}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-label">Nombre del Item</Label>
                <Input
                  id="edit-label"
                  value={editingItem?.item_label || ''}
                  onChange={(e) =>
                    setEditingItem(
                      editingItem ? { ...editingItem, item_label: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={editingItem?.category || 'general'}
                  onValueChange={(val) =>
                    setEditingItem(
                      editingItem ? { ...editingItem, category: val } : null
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-3.5 w-3.5" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rol responsable</Label>
                <Select
                  value={editingItem?.assigned_role_id?.toString() || 'none'}
                  onValueChange={(val) =>
                    setEditingItem(
                      editingItem
                        ? { ...editingItem, assigned_role_id: val !== 'none' ? parseInt(val) : null }
                        : null
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin rol asignado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin rol asignado</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="edit-active">Activo</Label>
                <Switch
                  id="edit-active"
                  checked={editingItem?.is_active || false}
                  onCheckedChange={(checked) =>
                    setEditingItem(
                      editingItem ? { ...editingItem, is_active: checked } : null
                    )
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button onClick={onUpdateItem} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar Item</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminar permanentemente "{item.item_label}"? Esta acción no se
                puede deshacer. Si sólo quieres ocultarlo de los nuevos vehículos,
                usa el switch "Activo" en lugar de eliminar.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(item.id)}
                className="bg-red-500 hover:bg-red-600"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

const ChecklistItemsConfig: React.FC = () => {
  const { clientId } = useAuth();
  const { roles } = useRoles();
  const [items, setItems] = useState<ClientChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ClientChecklistItem | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemKey, setNewItemKey] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('general');
  const [newItemRoleId, setNewItemRoleId] = useState<string>('none');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const fetchItems = async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const data = await getClientChecklistItems(clientId);
      setItems(data);
    } catch (error) {
      console.error('Error fetching checklist items:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los items del checklist',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Group items by category, preserving the canonical category order
  const groupedItems = useMemo(() => {
    const groups: Record<string, ClientChecklistItem[]> = {};
    items.forEach(item => {
      const cat = item.category || 'general';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const ia = CATEGORY_ORDER.indexOf(a);
      const ib = CATEGORY_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [items]);

  const generateItemKey = (label: string): string => {
    return label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 50);
  };

  const handleAddItem = async () => {
    if (!clientId || !newItemLabel.trim()) return;

    setIsSaving(true);
    try {
      const itemKey = newItemKey.trim() || generateItemKey(newItemLabel);

      await createClientChecklistItem({
        client_id: clientId,
        item_key: itemKey,
        item_label: newItemLabel.trim(),
        category: newItemCategory,
        assigned_role_id: newItemRoleId !== 'none' ? parseInt(newItemRoleId) : null,
      });

      toast({
        title: 'Item agregado',
        description: 'El item del checklist se ha agregado correctamente',
      });

      setNewItemLabel('');
      setNewItemKey('');
      setNewItemCategory('general');
      setNewItemRoleId('none');
      setIsAddDialogOpen(false);
      fetchItems();
    } catch (error: any) {
      console.error('Error adding checklist item:', error);
      toast({
        title: 'Error',
        description: error?.message?.includes('duplicate')
          ? 'Ya existe un item con esa clave'
          : 'No se pudo agregar el item',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    setIsSaving(true);
    try {
      await updateClientChecklistItem(editingItem.id, {
        item_label: editingItem.item_label,
        is_active: editingItem.is_active,
        category: editingItem.category,
        assigned_role_id: editingItem.assigned_role_id || null,
      });

      toast({
        title: 'Item actualizado',
        description: 'El item del checklist se ha actualizado correctamente',
      });

      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error('Error updating checklist item:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el item',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (item: ClientChecklistItem) => {
    try {
      await updateClientChecklistItem(item.id, {
        is_active: !item.is_active,
      });

      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_active: !i.is_active } : i
        )
      );
    } catch (error) {
      console.error('Error toggling item active state:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del item',
        variant: 'destructive',
      });
    }
  };

  // Hard delete: removes the row from the DB. Use the Switch (handleToggleActive)
  // for soft removal — that hides the item from new vehicles without losing data.
  const handleDeleteItem = async (itemId: number) => {
    const previous = items;
    // Optimistic: drop the row immediately
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await hardDeleteClientChecklistItem(itemId);
      toast({
        title: 'Item eliminado',
        description: 'El item se eliminó permanentemente',
      });
    } catch (error) {
      console.error('Error deleting checklist item:', error);
      // Rollback on failure
      setItems(previous);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el item',
        variant: 'destructive',
      });
    }
  };

  // Drag end inside a single category. Reorders items within that category and
  // pushes the new global order to the DB. Categories themselves stay in their
  // canonical order.
  const handleDragEnd = (category: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!clientId || !over || active.id === over.id) return;

    const inCategory = items.filter((i) => (i.category || 'general') === category);
    const oldIndex = inCategory.findIndex((i) => i.id === active.id);
    const newIndex = inCategory.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedCategory = arrayMove(inCategory, oldIndex, newIndex);

    // Compose the new global ordering: walk categories in canonical order,
    // substituting the reordered list for the affected one.
    const otherItems: Record<string, ClientChecklistItem[]> = {};
    items.forEach((i) => {
      const cat = i.category || 'general';
      if (cat === category) return;
      if (!otherItems[cat]) otherItems[cat] = [];
      otherItems[cat].push(i);
    });

    const knownCats = CATEGORY_ORDER;
    const allCats = Array.from(
      new Set([...knownCats, ...Object.keys(otherItems), category])
    );
    const newGlobal: ClientChecklistItem[] = [];
    for (const cat of allCats) {
      if (cat === category) {
        newGlobal.push(...reorderedCategory);
      } else if (otherItems[cat]) {
        newGlobal.push(...otherItems[cat]);
      }
    }

    // Optimistic update
    const previous = items;
    setItems(newGlobal);

    reorderClientChecklistItems(
      clientId,
      newGlobal.map((i) => i.id)
    ).catch((err) => {
      console.error('Error reordering checklist items:', err);
      setItems(previous);
      toast({
        title: 'Error',
        description: 'No se pudo guardar el nuevo orden',
        variant: 'destructive',
      });
    });
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 tracking-tight">
            <ClipboardCheck className="h-5 w-5" />
            Configuración de Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 tracking-tight">
              <ClipboardCheck className="h-5 w-5" />
              Configuración de Checklist
            </CardTitle>
            <CardDescription className="mt-1 text-[13px] text-slate-500">
              Organiza los items por categoría y asigna responsables por rol.
              Arrastra desde el ícono ⋮⋮ para reordenar dentro de cada categoría.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-9 rounded-xl text-[13px]" onClick={fetchItems}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 rounded-xl text-[13px]">
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Item de Checklist</DialogTitle>
                  <DialogDescription>
                    Agrega un nuevo item que aparecerá en el checklist de todos los vehículos nuevos
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="item-label">Nombre del Item *</Label>
                    <Input
                      id="item-label"
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      placeholder="Ej: Verificar frenos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="item-key">
                      Clave (opcional)
                      <span className="text-xs text-gray-500 ml-1">
                        Se genera automáticamente si no se especifica
                      </span>
                    </Label>
                    <Input
                      id="item-key"
                      value={newItemKey}
                      onChange={(e) => setNewItemKey(e.target.value)}
                      placeholder="Ej: verificar_frenos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            <div className="flex items-center gap-2">
                              <cat.icon className="h-3.5 w-3.5" />
                              {cat.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Rol responsable (opcional)</Label>
                    <Select value={newItemRoleId} onValueChange={setNewItemRoleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin rol asignado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin rol asignado</SelectItem>
                        {roles.map(role => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-slate-400">
                      Si asignas un rol, solo los usuarios con ese rol verán este item como su responsabilidad
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddItem}
                    disabled={!newItemLabel.trim() || isSaving}
                  >
                    {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Agregar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>No hay items de checklist configurados</p>
            <p className="text-sm mt-1">
              Haz clic en "Agregar Item" para comenzar
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedItems.map(([category, categoryItems]) => {
              const config = getCategoryConfig(category);
              const Icon = config.icon;

              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {categoryItems.length} item{categoryItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Sortable items within this category */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd(category)}
                  >
                    <SortableContext
                      items={categoryItems.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {categoryItems.map((item) => (
                          <SortableChecklistRow
                            key={item.id}
                            item={item}
                            editingItem={editingItem}
                            setEditingItem={setEditingItem}
                            isSaving={isSaving}
                            roles={roles}
                            onToggleActive={handleToggleActive}
                            onDelete={handleDeleteItem}
                            onUpdateItem={handleUpdateItem}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChecklistItemsConfig;
