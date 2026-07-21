import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Receipt, Plus } from 'lucide-react';
import { useUnattributedExpenses } from '@/hooks/useUnattributedExpenses';
import { UnattributedExpense } from '@/types/unattributedExpenses';
import { useCurrency } from '@/hooks/useCurrency';

const todayIso = () => new Date().toISOString().slice(0, 10);
const toInputDate = (iso?: string) =>
  iso ? new Date(iso).toISOString().slice(0, 10) : todayIso();
const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-CL') : '-';
// Solo dígitos con separador de miles para mostrar mientras se escribe.
const formatThousands = (value: string) =>
  value.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

interface FormProps {
  expense?: UnattributedExpense;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

const ExpenseForm: React.FC<FormProps> = ({ expense, onSuccess, trigger }) => {
  const { createExpense, updateExpense } = useUnattributedExpenses();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState(expense?.title ?? '');
  const [amount, setAmount] = useState(
    expense?.amount ? formatThousands(String(expense.amount)) : ''
  );
  const [description, setDescription] = useState(expense?.description ?? '');
  const [date, setDate] = useState(toInputDate(expense?.created_at));

  const reset = () => {
    setTitle(expense?.title ?? '');
    setAmount(expense?.amount ? formatThousands(String(expense.amount)) : '');
    setDescription(expense?.description ?? '');
    setDate(toInputDate(expense?.created_at));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount.replace(/\./g, ''));
    if (!title.trim() || !numericAmount) return;

    setSubmitting(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      amount: numericAmount,
      expense_date: date,
    };
    const ok = expense
      ? await updateExpense(expense.id!, payload)
      : await createExpense(payload);
    setSubmitting(false);

    if (ok) {
      setOpen(false);
      if (!expense) reset();
      onSuccess?.();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className='w-4 h-4 mr-2' />
            Agregar gasto
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]'>
        <DialogHeader>
          <DialogTitle>
            {expense ? 'Editar gasto puntual' : 'Agregar gasto puntual'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-1.5'>
            <Label>Título *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Ej: Publicidad Instagram, arreglo letrero...'
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Monto ($) *</Label>
            <Input
              value={amount}
              onChange={(e) => setAmount(formatThousands(e.target.value))}
              placeholder='100.000'
              inputMode='numeric'
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Fecha *</Label>
            <Input
              type='date'
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className='space-y-1.5'>
            <Label>Descripción</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder='Detalle adicional del gasto...'
            />
          </div>
          <div className='flex justify-end space-x-2 pt-2'>
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type='submit' disabled={submitting}>
              {submitting ? 'Guardando...' : expense ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UnattributedExpensesManager: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { expenses, isLoading, deleteExpense, getTotalAmount, refetch } =
    useUnattributedExpenses();

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este gasto puntual?')) {
      await deleteExpense(id);
    }
  };

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <div>
          <CardTitle className='flex items-center gap-2'>
            <Receipt className='w-5 h-5' />
            Gastos puntuales del mes
          </CardTitle>
          <p className='text-sm text-muted-foreground mt-1'>
            Gastos que no son de un auto en particular (publicidad, reparaciones
            del local, etc.). Total registrado: {formatPrice(getTotalAmount())}
          </p>
        </div>
        <ExpenseForm onSuccess={refetch} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className='text-center py-8 text-muted-foreground'>Cargando...</div>
        ) : expenses.length === 0 ? (
          <div className='text-center py-8 text-muted-foreground'>
            No hay gastos puntuales registrados.
            <br />
            Agrega gastos sueltos del mes como publicidad, reparaciones, etc.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className='text-right'>Monto</TableHead>
                <TableHead className='text-center'>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.created_at)}</TableCell>
                  <TableCell className='font-medium'>{expense.title}</TableCell>
                  <TableCell className='text-muted-foreground'>
                    {expense.description || '-'}
                  </TableCell>
                  <TableCell className='text-right font-mono'>
                    {formatPrice(expense.amount)}
                  </TableCell>
                  <TableCell className='text-center'>
                    <div className='flex justify-center gap-2'>
                      <ExpenseForm
                        expense={expense}
                        onSuccess={refetch}
                        trigger={
                          <Button variant='ghost' size='sm'>
                            <Edit className='w-4 h-4' />
                          </Button>
                        }
                      />
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleDelete(expense.id!)}
                        className='text-destructive hover:text-destructive'
                      >
                        <Trash2 className='w-4 h-4' />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default UnattributedExpensesManager;
