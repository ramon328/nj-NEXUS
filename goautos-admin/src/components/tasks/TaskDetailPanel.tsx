import { useState } from 'react';
import { Drawer, DrawerContentRight, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import {
  Car,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Pencil,
  Tag,
  ChevronDown,
  Check,
  ClipboardCheck,
  X,
} from 'lucide-react';
import type { Task, TaskStatus } from '@/types/task';
import {
  TASK_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  getCategoryConfig,
  getRelativeTime,
  formatDueDate,
} from './taskConstants';
import { cn } from '@/lib/utils';

interface TaskDetailPanelProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (id: string, status: TaskStatus) => Promise<{ error: string | null }>;
  onDelete: (id: string) => Promise<{ error: string | null }>;
  onEdit?: (task: Task) => void;
  canApproveTasks?: boolean;
  onApprove?: (id: string) => Promise<{ error: string | null }>;
  onReject?: (id: string) => Promise<{ error: string | null }>;
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-[0_1px_4px_-1px_rgba(0,0,0,0.06)] border border-slate-200/60">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-400" />
        <h4 className="text-[13px] font-semibold text-slate-700 tracking-tight">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, className }: { label: string; value?: string | null; className?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-b-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className={cn("text-[12px] font-medium text-slate-900 text-right max-w-[60%] break-words", className)}>{value}</span>
    </div>
  );
}

export default function TaskDetailPanel({
  task,
  open,
  onOpenChange,
  onStatusChange,
  onDelete,
  onEdit,
  canApproveTasks = false,
  onApprove,
  onReject,
}: TaskDetailPanelProps) {
  const [statusDrawerOpen, setStatusDrawerOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!task) return null;

  const showApprovalActions =
    task.status === 'pending_approval' && canApproveTasks && onApprove && onReject;

  const handleApprove = async () => {
    if (!onApprove) return;
    setIsApproving(true);
    try {
      await onApprove(task.id);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    setIsRejecting(true);
    try {
      await onReject(task.id);
    } finally {
      setIsRejecting(false);
    }
  };

  const colors = STATUS_COLORS[task.status];
  const priorityConfig = PRIORITY_COLORS[task.priority];
  const categoryConfig = getCategoryConfig(task.category);
  const dueInfo = formatDueDate(task.due_date);
  const vehicleLabel = task.vehicle
    ? `${task.vehicle.brand?.name || ''} ${task.vehicle.model?.name || ''} ${task.vehicle.year || ''}`.trim()
    : null;
  const assigneeName = task.assigned_user
    ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}`.trim()
    : null;

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="right">
        <DrawerContentRight className="bg-[#f5f5f7] p-0 md:min-w-[480px]">
          <DrawerTitle className="sr-only">Detalle de tarea</DrawerTitle>
          <DrawerDescription className="sr-only">Información de la tarea</DrawerDescription>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain">
            {/* Header */}
            <div className="bg-white p-5 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[18px] font-semibold text-slate-900 tracking-tight">{task.title}</h2>
                  <p className="text-[12px] text-slate-500">{getRelativeTime(task.created_at)}</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Status badge — opens drawer */}
                <button
                  onClick={() => setStatusDrawerOpen(true)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1 rounded-full border hover:opacity-90 transition-opacity',
                    colors.bg, colors.ring.replace('ring-', 'border-')
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', colors.dot)} />
                  <span className={cn('text-[11px] font-medium', colors.text)}>{STATUS_LABELS[task.status]}</span>
                  <ChevronDown className={cn('w-3 h-3 opacity-60', colors.text)} />
                </button>

                {/* Priority badge */}
                <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-medium', priorityConfig.bg, priorityConfig.text)}>
                  {priorityConfig.label}
                </span>

                {/* Category badge */}
                <span className={cn('px-2 py-0.5 rounded-md text-[11px] font-medium', categoryConfig.color)}>
                  {categoryConfig.label}
                </span>

                {task.source_type === 'checklist' && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-[11px] font-medium text-purple-700">
                    Checklist
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Description */}
              {task.description && (
                <Section title="Descripción" icon={Tag}>
                  <p className="text-[13px] text-slate-700 whitespace-pre-wrap">{task.description}</p>
                </Section>
              )}

              {/* Vehicle */}
              {task.vehicle && (
                <Section title="Vehículo asociado" icon={Car}>
                  <div className="flex items-center gap-3">
                    {task.vehicle.main_image ? (
                      <img
                        src={task.vehicle.main_image}
                        alt=""
                        className="h-12 w-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-12 w-16 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Car className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-slate-900">{vehicleLabel}</p>
                      {task.vehicle.license_plate && (
                        <p className="text-[11px] text-slate-500">{task.vehicle.license_plate}</p>
                      )}
                    </div>
                    <button
                      onClick={() => window.open(`/vehiculos/${task.vehicle!.id}`, '_blank')}
                      className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  </div>
                </Section>
              )}

              {/* Details */}
              <Section title="Detalles" icon={Clock}>
                <InfoRow
                  label="Asignado a"
                  value={assigneeName || task.assigned_role?.name || 'Sin asignar'}
                />
                {dueInfo && (
                  <InfoRow
                    label="Fecha límite"
                    value={dueInfo.label}
                    className={dueInfo.isOverdue ? 'text-red-600' : ''}
                  />
                )}
                {task.creator_name && (
                  <InfoRow label="Creada por" value={task.creator_name} />
                )}
                {task.completed_at && (
                  <InfoRow
                    label="Completada"
                    value={getRelativeTime(task.completed_at)}
                  />
                )}
              </Section>

              {/* Bloque de aprobacion (solo visible para admins cuando la tarea esta pending_approval) */}
              {showApprovalActions && (
                <Section title="Aprobación pendiente" icon={ClipboardCheck}>
                  <p className="text-[12px] text-slate-600 mb-3">
                    Esta tarea fue marcada como completada por un usuario no-admin y necesita tu validación.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 gap-1.5 rounded-xl text-[12px] h-9 bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleApprove}
                      disabled={isApproving || isRejecting}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isApproving ? 'Aprobando...' : 'Aprobar'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 rounded-xl text-[12px] h-9 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={handleReject}
                      disabled={isApproving || isRejecting}
                    >
                      <X className="w-3.5 h-3.5" />
                      {isRejecting ? 'Rechazando...' : 'Rechazar'}
                    </Button>
                  </div>
                </Section>
              )}

              {/* Editar / Eliminar */}
              <div className="pt-2 pb-4 space-y-2">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 rounded-xl text-[12px] h-9"
                    onClick={() => onEdit(task)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar tarea
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 rounded-xl text-[12px] h-9 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={async () => {
                    if (window.confirm('¿Eliminar esta tarea permanentemente?')) {
                      await onDelete(task.id);
                      onOpenChange(false);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar tarea
                </Button>
              </div>
            </div>
          </div>
        </DrawerContentRight>
      </Drawer>

      {/* Status change drawer (bottom sheet) */}
      <Drawer open={statusDrawerOpen} onOpenChange={setStatusDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="px-5 pb-3 pt-2">
            <p className="text-[15px] font-semibold text-slate-900">Cambiar estado</p>
          </div>
          <div
            className="px-5 pb-4 space-y-1"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            {TASK_STATUSES.map((s) => {
              const sColors = STATUS_COLORS[s];
              const isActive = task.status === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (!isActive) onStatusChange(task.id, s);
                    setStatusDrawerOpen(false);
                  }}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-[13px] transition-colors',
                    isActive ? 'bg-slate-50 font-medium text-slate-900' : 'text-slate-600 active:bg-slate-50'
                  )}
                >
                  <span className={cn('w-2 h-2 rounded-full', sColors.dot)} />
                  <span className="flex-1 text-left">{STATUS_LABELS[s]}</span>
                  {isActive && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
