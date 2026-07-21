import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/hooks/useI18n';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Phone,
  Calendar,
  Edit,
  Eye,
  Cake,
  Mail,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateShort } from '@/lib/utils';
import { getCustomerDisplayName, isCompanyCustomer } from '@/utils/customerName';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import CustomerDetailSheet from '@/components/customer/CustomerDetailSheet';

type Customer = {
  id: number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  phone: string;
  rut: string;
  address: string;
  birth_date?: string;
  created_at: string;
};

interface CustomersTableProps {
  customers: Customer[];
  formatDate: (date: string) => string;
  onDelete?: () => void;
  onEdit?: () => void;
}

function capitalizeWords(str: string) {
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  );
}

// Nombre a mostrar: razón social tal cual para empresa; nombre+apellido
// capitalizado para persona.
function displayCustomerName(customer: any) {
  return isCompanyCustomer(customer)
    ? getCustomerDisplayName(customer)
    : capitalizeWords(getCustomerDisplayName(customer));
}

function formatBirthday(dateString: string) {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

const CustomersTable: React.FC<CustomersTableProps> = ({
  customers,
  formatDate,
  onDelete,
  onEdit,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'edit'>('view');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Keep selectedCustomer in sync with fresh data
  useEffect(() => {
    if (selectedCustomer) {
      const fresh = customers.find(c => c.id === selectedCustomer.id);
      if (fresh && fresh !== selectedCustomer) setSelectedCustomer(fresh);
    }
  }, [customers]);

  const handleViewClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const handleEditClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const { tCommon } = useI18n();

  return (
    <>
      {/* Mobile cards */}
      <div className='space-y-2 md:hidden'>
        {customers.map((customer, index) => (
          <motion.div
            key={customer.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
            className='bg-white rounded-2xl border border-slate-200/60 p-3.5'
            onClick={() => handleViewClick(customer)}
          >
            {/* Top row: info + actions */}
            <div className='flex items-start gap-3'>
              {/* Info */}
              <div className='flex-1 min-w-0'>
                <h3 className='text-[14px] font-semibold text-slate-900 truncate'>
                  {displayCustomerName(customer)}
                </h3>

                {customer.email && (
                  <div className='flex items-center gap-1 mt-0.5'>
                    <Mail className='h-3 w-3 text-slate-400 flex-shrink-0' />
                    <span className='text-[12px] text-slate-500 truncate'>{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className='flex items-center gap-1 mt-0.5'>
                    <Phone className='h-3 w-3 text-slate-400 flex-shrink-0' />
                    <span className='text-[12px] text-slate-500'>{customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className='flex items-center gap-0.5 flex-shrink-0'>
                <button
                  onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                  className='w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors'
                >
                  <Edit className='h-3.5 w-3.5' />
                </button>
              </div>
            </div>

            {/* Bottom row: metadata */}
            <div className='flex items-center gap-2 mt-2.5 pt-2.5 border-t border-slate-100'>
              {customer.rut && (
                <Badge variant='outline' className='text-[11px] px-1.5 py-0 h-5 rounded-md border-slate-200 text-slate-500 font-normal'>
                  {customer.rut}
                </Badge>
              )}
              {customer.birth_date && (
                <span className='flex items-center gap-1 text-[11px] text-slate-400'>
                  <Cake className='h-3 w-3' />
                  {formatBirthday(customer.birth_date)}
                </span>
              )}
              <span className='flex items-center gap-1 text-[11px] text-slate-400'>
                <Calendar className='h-3 w-3' />
                {formatDateShort(customer.created_at)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop table */}
      <div className='hidden md:block bg-white rounded-2xl border border-slate-200/60 overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='hover:bg-transparent border-b border-slate-100'>
              <TableHead className='text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9'>
                {tCommon('customers.table.headers.name')}
              </TableHead>
              <TableHead className='text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9'>
                {tCommon('customers.table.headers.email')}
              </TableHead>
              <TableHead className='text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9'>
                {tCommon('customers.table.headers.phone')}
              </TableHead>
              <TableHead className='text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9 hidden xl:table-cell'>
                {tCommon('customers.table.headers.birthday')}
              </TableHead>
              <TableHead className='text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9'>
                {tCommon('customers.table.headers.registeredAt')}
              </TableHead>
              <TableHead className='text-right text-[11px] uppercase tracking-wider text-slate-400 font-medium bg-slate-50/80 h-9'>
                {tCommon('general.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const fullName = displayCustomerName(customer);
              return (
                <TableRow key={customer.id} className='hover:bg-slate-50/50 transition-colors border-b border-slate-100 cursor-pointer' onClick={() => handleViewClick(customer)}>
                  <TableCell className='text-[13px] text-slate-700'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className='font-medium truncate max-w-[160px] block'>
                          {fullName}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{fullName}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className='text-[13px] text-slate-600'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className='block max-w-[180px] truncate'>
                          {customer.email || '-'}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent delayDuration={0}>
                        {customer.email || '-'}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className='text-[13px] text-slate-600'>{customer.phone || '-'}</TableCell>
                  <TableCell className='text-[13px] text-slate-600 hidden xl:table-cell'>
                    {customer.birth_date ? formatBirthday(customer.birth_date) : '-'}
                  </TableCell>
                  <TableCell className='text-[13px] text-slate-500'>{formatDateShort(customer.created_at)}</TableCell>
                  <TableCell className='text-right'>
                    <div className='flex items-center justify-end gap-0.5'>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewClick(customer); }}
                        className='w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-500 hover:bg-sky-50 transition-colors'
                      >
                        <Eye className='h-3.5 w-3.5' />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(customer); }}
                        className='w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors'
                      >
                        <Edit className='h-3.5 w-3.5' />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CustomerDetailSheet
        customer={selectedCustomer}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onDeleteSuccess={() => { onDelete?.(); setDrawerOpen(false); }}
        onEditSuccess={() => { onEdit?.(); }}
        initialMode={drawerMode}
      />
    </>
  );
};

export default CustomersTable;
