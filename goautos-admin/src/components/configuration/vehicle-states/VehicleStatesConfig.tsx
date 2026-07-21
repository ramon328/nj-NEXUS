import React from 'react';
import { useTranslation } from 'react-i18next';
import { useStatuses, Status } from '@/hooks/useStatuses';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Edit, Trash2, Globe, EyeOff, Loader2, GripVertical } from 'lucide-react';
import StateDialog from './StateDialog';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStatusOrder } from '@/hooks/useStatusOrder';
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

interface SortableRowProps {
  state: Status;
  index: number;
  total: number;
  onEdit: (state: Status) => void;
  onDelete: (state: Status) => void;
}

const SortableRow = ({ state, index, onEdit, onDelete }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: state.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`hover:bg-slate-50/50 transition-colors ${isDragging ? 'opacity-50 bg-slate-50' : ''}`}
    >
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-slate-500 text-[13px] w-4">{index + 1}</span>
        </div>
      </TableCell>
      <TableCell>{state.name}</TableCell>
      <TableCell>{state.description}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: state.color || '#000000' }}
          />
          <span>{state.name}</span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span title={state.show_in_web ? 'Visible en la web' : 'No visible en la web'}>
          {state.show_in_web ? (
            <Globe className="h-4 w-4 text-green-600 mx-auto" />
          ) : (
            <EyeOff className="h-4 w-4 text-gray-400 mx-auto" />
          )}
        </span>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(state)}
            className="group hover:bg-[#e6f6fd]"
          >
            <Edit className="h-4 w-4 group-hover:text-[#2da2e7] transition-colors duration-200" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(state)}
            disabled={state.is_disabled}
            className="group hover:bg-[#fee2e2]"
            title={state.is_disabled ? 'No se puede eliminar este estado del sistema' : ''}
          >
            <Trash2 className="h-4 w-4 group-hover:text-[#ef4444] transition-colors duration-200" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const VehicleStatesConfig = () => {
  const { t } = useTranslation('common');
  const { statuses, isLoading, fetchStatuses } = useStatuses();
  const [showDialog, setShowDialog] = React.useState(false);
  const [selectedState, setSelectedState] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { clientId } = useAuth();
  const { reorderStatuses } = useStatusOrder(fetchStatuses);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const nextOrder = React.useMemo(() => {
    if (statuses.length === 0) return 1;
    return Math.max(...statuses.map((s) => s.order ?? 0)) + 1;
  }, [statuses]);

  const handleAddState = () => {
    setSelectedState(null);
    setShowDialog(true);
  };

  const handleEditState = (state: any) => {
    setSelectedState(state);
    setShowDialog(true);
  };

  const handleDeleteState = async (state: any) => {
    if (state.is_disabled) {
      toast({
        title: t('configuration.states.toasts.nonEditable.title'),
        description: t('configuration.states.toasts.nonEditable.deleteDescription'),
        variant: 'destructive',
      });
      return;
    }

    if (!confirm(t('configuration.states.confirmDelete'))) return;

    try {
      const { error } = await supabase
        .from('clients_vehicles_states')
        .delete()
        .eq('id', state.id)
        .eq('client_id', clientId);

      if (error) throw error;

      toast({
        title: t('configuration.states.toasts.deleted.title'),
        description: t('configuration.states.toasts.deleted.description'),
      });

      fetchStatuses();
    } catch (error) {
      console.error('Error deleting state:', error);
      toast({
        title: t('actions.error'),
        description: t('configuration.states.toasts.deleteErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = statuses.findIndex((s) => s.id === active.id);
    const newIndex = statuses.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(statuses, oldIndex, newIndex);
    reorderStatuses(newOrder);
  };

  const filteredStates = statuses.filter(
    (state) =>
      state.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      state.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-[17px] font-semibold text-slate-900 tracking-tight">
            {t('configuration.states.title')}
          </h2>
          <p className="text-[13px] text-slate-500">
            {t('configuration.states.subtitle')}
          </p>
        </div>
        <Button className="h-9 rounded-xl text-[13px]" onClick={handleAddState}>
          + {t('configuration.states.addButton')}
        </Button>
      </div>

      <div className="flex items-center py-4">
        <Input
          placeholder={t('configuration.states.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm h-9 rounded-xl border-slate-200/60 text-[13px] shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]"
        />
      </div>

      <div className="rounded-2xl overflow-hidden shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-100">
              <TableHead className="w-[80px] bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                {t('configuration.states.table.order')}
              </TableHead>
              <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                {t('configuration.states.table.name')}
              </TableHead>
              <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                {t('configuration.states.table.description')}
              </TableHead>
              <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                {t('configuration.states.table.color')}
              </TableHead>
              <TableHead className="bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3 text-center">
                Web
              </TableHead>
              <TableHead className="text-right bg-slate-50/80 h-9 text-[11px] uppercase tracking-wider text-slate-400 font-medium px-3">
                {t('configuration.states.table.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredStates.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredStates.map((state, index) => (
                  <SortableRow
                    key={state.id}
                    state={state}
                    index={index}
                    total={filteredStates.length}
                    onEdit={handleEditState}
                    onDelete={handleDeleteState}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </TableBody>
        </Table>
      </div>

      <StateDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        state={selectedState}
        nextOrder={nextOrder}
        onSuccess={() => {
          setShowDialog(false);
          fetchStatuses();
        }}
      />
    </div>
  );
};

export default VehicleStatesConfig;
