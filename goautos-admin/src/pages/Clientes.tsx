import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ClientDialog from '@/components/clients/ClientDialog';
import LoadingState from '@/components/users/LoadingState';
import ClientsTable from '@/components/clients/ClientsTable';
import CustomersTable from '@/components/clients/CustomersTable';
import EmptyState from '@/components/clients/EmptyState';
import PaginationControls from '@/components/clients/PaginationControls';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import { ExcelUploadDrawer } from '@/components/clients/ExcelUploadDrawer';
import useClients, { ClientStatusFilter } from '@/hooks/useClients';
import { useClientsImplementationScores } from '@/hooks/useClientsImplementationScores';
import useCustomers from '@/hooks/useCustomers';
import { useCustomerTransactions } from '@/hooks/useCustomerTransactions';
import formatDate from '@/utils/formatDate';
import { Client } from '@/components/clients/types';
import { Button } from '@/components/ui/button';
import { Upload, PlusCircle, Plus, Search, Download, ArrowUpDown, FileSpreadsheet, FileText, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import CustomerForm from '@/components/customer/CustomerForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import DashboardLayout from '@/components/DashboardLayout';
import { useI18n } from '@/hooks/useI18n';
import { useTranslation } from 'react-i18next';
import { exportCustomerTransactionsToExcel } from '@/utils/excelExport';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import posthog from '@/utils/posthog';

const Clientes = () => {
  const { clientId, userRole, isTenantOverride, userId } = useAuth();
  const { isSuperadmin } = usePermissions();
  const { tCommon } = useI18n();
  const { t: tCustomers, i18n } = useTranslation('customersPage');
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState(false);
  const [newCustomerDialogOpen, setNewCustomerDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [debouncedClientSearch, setDebouncedClientSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [clientSort, setClientSort] = useState<string>('newest');
  const [clientStatusFilter, setClientStatusFilter] = useState<ClientStatusFilter>('active');
  const [toggleTarget, setToggleTarget] = useState<Client | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const pageSize = 10;

  const {
    clients,
    loading: clientsLoading,
    currentPage: clientsPage,
    totalPages: clientsTotalPages,
    setCurrentPage: setClientsPage,
    handleDeleteClient,
    fetchClients,
  } = useClients(
    pageSize,
    debouncedClientSearch,
    clientSort === 'oldest' ? 'oldest' : 'newest',
    clientSort === 'impl_high' || clientSort === 'impl_low',
    clientStatusFilter
  );

  const {
    customers,
    loading: customersLoading,
    currentPage: customersPage,
    totalPages: customersTotalPages,
    totalCount: customersTotalCount,
    setCurrentPage: setCustomersPage,
    refetchCustomers,
  } = useCustomers(clientId, pageSize, searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClientSearch(clientSearchTerm);
      setClientsPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [clientSearchTerm]);

  const isSuperadminView = userRole === 'superadmin' && !isTenantOverride;

  const { scores: implementationScores } = useClientsImplementationScores(
    isSuperadminView ? clients : []
  );

  const { fetchAllTransactions } = useCustomerTransactions(
    typeof clientId === 'string' ? parseInt(clientId, 10) : clientId
  );

  const handleExportTransactions = async () => {
    if (exporting) return;
    setExporting(true);

    try {
      const transactions = await fetchAllTransactions();

      if (transactions.length === 0) {
        toast({
          title: tCustomers('export.noData') || 'Sin datos',
          description: tCustomers('export.noDataDescription') || 'No hay transacciones para exportar',
          variant: 'destructive',
        });
        return;
      }

      const language = i18n.language?.startsWith('es') ? 'es' : 'en';
      exportCustomerTransactionsToExcel({
        transactions,
        filename: 'transacciones-clientes',
        language,
      });

      posthog.capture({
        distinctId: userId || 'anonymous',
        event: 'customer_transactions_exported',
        properties: { count: transactions.length },
      });

      toast({
        title: tCustomers('export.success') || 'Exportación exitosa',
        description: tCustomers('export.successDescription') || `Se exportaron ${transactions.length} transacciones`,
      });
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast({
        title: tCustomers('export.error') || 'Error',
        description: tCustomers('export.errorDescription') || 'No se pudieron exportar las transacciones',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportClients = async (format: 'xlsx' | 'csv') => {
    try {
      // Fetch all clients matching current search + status filter
      let query = supabase.from('clients').select('*');
      if (clientStatusFilter === 'active') {
        query = query.eq('is_active', true);
      } else if (clientStatusFilter === 'inactive') {
        query = query.eq('is_active', false);
      }
      if (debouncedClientSearch.trim()) {
        const term = `%${debouncedClientSearch.trim()}%`;
        query = query.or(`name.ilike.${term},domain.ilike.${term}`);
      }
      const ascending = clientSort === 'oldest';
      const { data, error } = await query.order('created_at', { ascending });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: 'Sin datos', description: 'No hay clientes para exportar.', variant: 'destructive' });
        return;
      }

      // Build rows with implementation scores
      const rows = data.map((c: any) => {
        const score = implementationScores[c.id];
        return {
          ID: c.id,
          Nombre: c.name || '',
          Dominio: c.domain || '',
          Email: c.contact?.email || '',
          Teléfono: c.contact?.phone || '',
          Estado: c.has_demo ? 'Demo' : 'Producción',
          Implementación: score ? `${score.score}%` : '-',
          'Pasos completados': score ? `${score.completedCount}/${score.totalCount}` : '-',
          'Fecha registro': c.created_at ? new Date(c.created_at).toLocaleDateString('es-CL') : '',
        };
      });

      // Sort by implementation if needed
      if (clientSort === 'impl_high' || clientSort === 'impl_low') {
        rows.sort((a: any, b: any) => {
          const scoreA = parseInt(a.Implementación) || 0;
          const scoreB = parseInt(b.Implementación) || 0;
          return clientSort === 'impl_high' ? scoreB - scoreA : scoreA - scoreB;
        });
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

      const filename = `clientes-goauto-${new Date().toISOString().slice(0, 10)}`;
      XLSX.writeFile(wb, `${filename}.${format}`, {
        bookType: format === 'csv' ? 'csv' : 'xlsx',
      });

      toast({ title: 'Exportación exitosa', description: `Se exportaron ${rows.length} clientes.` });
    } catch (error) {
      console.error('Error exporting clients:', error);
      toast({ title: 'Error', description: 'No se pudieron exportar los clientes.', variant: 'destructive' });
    }
  };

  const handleOpenDialog = (client?: Client) => {
    setSelectedClient(client || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedClient(null);
  };

  const handleSaveDialog = () => {
    fetchClients();
    handleCloseDialog();
  };

  const handleToggleActive = (client: Client) => {
    if (!isSuperadmin) return;
    setToggleTarget(client);
  };

  const confirmToggleActive = async () => {
    if (!toggleTarget) return;
    const willDeactivate = toggleTarget.is_active !== false;
    const action = willDeactivate ? 'inactivar' : 'reactivar';

    setIsToggling(true);
    const { error } = await supabase
      .from('clients')
      .update({ is_active: !willDeactivate })
      .eq('id', toggleTarget.id);
    setIsToggling(false);

    if (error) {
      console.error(`Error al ${action} cliente:`, error);
      toast({
        title: `Error al ${action}`,
        description: error.message || `No se pudo ${action} el cliente.`,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: willDeactivate ? 'Cliente inactivado' : 'Cliente reactivado',
      description: `${toggleTarget.name || 'El cliente'} ${willDeactivate ? 'ya no aparecerá en activos' : 'volvió a activos'}.`,
    });
    setToggleTarget(null);
    fetchClients();
  };

  const handleNewCustomerSuccess = () => {
    setNewCustomerDialogOpen(false);
    refetchCustomers();
  };

  const customersToShow = customers;

  const isImplSort = clientSort === 'impl_high' || clientSort === 'impl_low';

  const sortedClients = useMemo(() => {
    if (isImplSort) {
      const sorted = [...clients].sort((a, b) => {
        const scoreA = implementationScores[a.id]?.score ?? 0;
        const scoreB = implementationScores[b.id]?.score ?? 0;
        return clientSort === 'impl_high' ? scoreB - scoreA : scoreA - scoreB;
      });
      // Client-side pagination when fetching all
      const start = (clientsPage - 1) * pageSize;
      return sorted.slice(start, start + pageSize);
    }
    return clients;
  }, [clients, clientSort, implementationScores, clientsPage, pageSize, isImplSort]);

  // Override totalPages for client-side pagination when sorting by implementation
  const effectiveTotalPages = isImplSort
    ? Math.ceil(clients.length / pageSize)
    : clientsTotalPages;

  const loading = isSuperadminView ? clientsLoading : customersLoading;

  return (
    <DashboardLayout>
      <main className={`flex flex-col h-full ${isSuperadminView ? '' : 'bg-[#f5f5f7]'}`}>
        <TooltipProvider>
          {/* Sticky Header */}
          <div className={`sticky top-0 z-10 border-b ${isSuperadminView ? 'bg-white border-gray-200' : 'bg-[#f5f5f7] border-slate-200/60'}`}>
            <div className={isSuperadminView ? 'p-6' : 'px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-2 sm:pb-3'}>
              {isSuperadminView ? (
                <div className='space-y-3' data-tour='customers-header'>
                  <div className='flex items-center justify-end'>
                    <div className='flex items-center gap-2'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='outline' size='sm' className='gap-1.5'>
                            <Download className='h-4 w-4' />
                            <span className='hidden sm:inline'>Exportar</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem onClick={() => handleExportClients('xlsx')}>
                            <FileSpreadsheet className='h-4 w-4 mr-2' />
                            Excel (.xlsx)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportClients('csv')}>
                            <FileText className='h-4 w-4 mr-2' />
                            CSV (.csv)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        onClick={() => handleOpenDialog()}
                        className='bg-primary text-white hover:bg-primary/90 gap-1.5'
                      >
                        <PlusCircle className='h-4 w-4' />
                        <span className='hidden sm:inline'>{tCustomers('buttons.newClient')}</span>
                        <span className='sm:hidden'>Nuevo</span>
                      </Button>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <div className='flex items-center gap-1 p-0.5 rounded-full bg-slate-100 shrink-0'>
                      <button
                        type='button'
                        onClick={() => { setClientStatusFilter('active'); setClientsPage(1); }}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                          clientStatusFilter === 'active'
                            ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        Activos
                      </button>
                      <button
                        type='button'
                        onClick={() => { setClientStatusFilter('inactive'); setClientsPage(1); }}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all whitespace-nowrap ${
                          clientStatusFilter === 'inactive'
                            ? 'bg-slate-800 text-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.12)]'
                            : 'text-slate-600 hover:bg-slate-200/60'
                        }`}
                      >
                        Inactivos
                      </button>
                    </div>
                    <div className='relative flex-1'>
                      <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400' />
                      <Input
                        placeholder='Buscar por nombre o dominio...'
                        value={clientSearchTerm}
                        onChange={(e) => setClientSearchTerm(e.target.value)}
                        className='pl-9 h-9 rounded-xl bg-white border-slate-200/60 text-[13px] text-slate-500 placeholder:text-slate-400 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
                      />
                    </div>
                    <Select value={clientSort} onValueChange={(v) => { setClientSort(v); setClientsPage(1); }}>
                      <SelectTrigger className='w-[200px] shrink-0 h-9 rounded-xl bg-white border-slate-200/60 text-[13px] text-slate-500 [&>svg]:text-slate-400 shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'>
                        <ArrowUpDown className='h-3.5 w-3.5 mr-1.5 text-gray-400' />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='newest'>Más recientes</SelectItem>
                        <SelectItem value='oldest'>Más antiguos</SelectItem>
                        <SelectItem value='impl_high'>Mayor implementación</SelectItem>
                        <SelectItem value='impl_low'>Menor implementación</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <div className='flex items-center gap-2' data-tour='customers-header'>
                  {/* Search */}
                  <div className='relative flex-1 min-w-0' data-tour='customers-search'>
                    <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
                    <input
                      type='text'
                      placeholder={tCustomers('search.placeholder')}
                      className='w-full h-9 pl-9 pr-3 rounded-xl bg-white border border-slate-200/60 text-[13px] text-slate-500 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)]'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Customer count badge */}
                  {!loading && customersTotalCount > 0 && (
                    <span className='hidden sm:inline-flex items-center h-7 px-2.5 rounded-lg bg-slate-100 text-[12px] font-medium text-slate-500 whitespace-nowrap shrink-0'>
                      {customersTotalCount} clientes
                    </span>
                  )}

                  {/* Actions popover (Upload + Export) */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type='button'
                        className='h-9 w-9 rounded-xl border border-slate-200/60 bg-white shadow-[0_1px_3px_-1px_rgba(0,0,0,0.06)] flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shrink-0'
                        title='Acciones'
                      >
                        <MoreVertical className='h-4 w-4' />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align='end' className='w-48 p-1.5'>
                      <button
                        onClick={() => setUploadDrawerOpen(true)}
                        className='flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50 transition-colors'
                      >
                        <Upload className='h-4 w-4 text-slate-400' />
                        {tCustomers('buttons.bulkUpload') || 'Subir Excel'}
                      </button>
                      <button
                        onClick={handleExportTransactions}
                        disabled={exporting}
                        className='flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50'
                      >
                        <Download className='h-4 w-4 text-slate-400' />
                        {exporting
                          ? (tCustomers('buttons.exporting') || 'Exportando...')
                          : (tCustomers('buttons.exportTransactions') || 'Exportar')}
                      </button>
                    </PopoverContent>
                  </Popover>

                  {/* Primary: Create Customer */}
                  <Button
                    className='rounded-xl h-9 text-[13px] font-medium flex items-center gap-2 px-3 bg-sky-400 hover:bg-sky-500 text-white border-0 shadow-none shrink-0'
                    onClick={() => setNewCustomerDialogOpen(true)}
                  >
                    <Plus className='h-4 w-4' />
                    <span className='hidden sm:inline'>{tCustomers('buttons.createCustomer')}</span>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Scrollable Content */}
          <div className={`flex-1 overflow-auto relative z-0 ${isSuperadminView ? 'bg-white' : ''}`}>
            <div className={`w-full ${isSuperadminView ? '' : 'px-4 sm:px-6 lg:px-8 py-3 sm:py-4'}`} data-tour='customers-table'>
              {loading ? (
                <LoadingState />
              ) : isSuperadminView ? (
                clients.length === 0 ? (
                  <EmptyState
                    title={tCustomers('empty.title')}
                    description={tCustomers('empty.superadminDescription')}
                  />
                ) : (
                  <>
                    <ClientsTable
                      clients={sortedClients}
                      formatDate={formatDate}
                      onEdit={handleOpenDialog}
                      onDelete={handleDeleteClient}
                      onToggleActive={isSuperadmin ? handleToggleActive : undefined}
                      implementationScores={implementationScores}
                    />

                    <div className='mt-4 px-6'>
                      <PaginationControls
                        currentPage={clientsPage}
                        totalPages={effectiveTotalPages}
                        onPageChange={setClientsPage}
                      />
                    </div>
                  </>
                )
              ) : customersToShow.length === 0 ? (
                <EmptyState
                  title={tCustomers('empty.title')}
                  description={tCustomers('empty.description')}
                />
              ) : (
                <CustomersTable
                  customers={customersToShow}
                  formatDate={formatDate}
                  onDelete={refetchCustomers}
                  onEdit={refetchCustomers}
                />
              )}
            </div>
          </div>

          {/* Pagination — fixed at bottom */}
          {!loading && !isSuperadminView && !searchTerm && customersTotalCount > 0 && (
            <VehiclesPagination
              currentPage={customersPage}
              totalPages={customersTotalPages}
              totalCount={customersTotalCount}
              pageSize={pageSize}
              onPageChange={setCustomersPage}
              isLoading={customersLoading}
              showingText='Mostrando {{start}} - {{end}} de {{total}} clientes'
            />
          )}
        </TooltipProvider>
      </main>

      <ClientDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveDialog}
        client={selectedClient}
      />

      <ExcelUploadDrawer
        open={uploadDrawerOpen}
        onClose={() => setUploadDrawerOpen(false)}
      />

      <Dialog
        open={newCustomerDialogOpen}
        onOpenChange={setNewCustomerDialogOpen}
      >
        <DialogContent className='sm:max-w-[500px]'>
          <DialogHeader>
            <DialogTitle>{tCustomers('dialog.newCustomerTitle')}</DialogTitle>
          </DialogHeader>
          <CustomerForm onSuccess={handleNewCustomerSuccess} />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={toggleTarget !== null}
        onOpenChange={(open) => !open && !isToggling && setToggleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {toggleTarget?.is_active === false
                ? `Reactivar ${toggleTarget?.name || 'cliente'}`
                : `Inactivar ${toggleTarget?.name || 'cliente'}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {toggleTarget?.is_active === false
                ? 'La automotora volverá a aparecer en la tab Activos y a contar en las métricas globales del dashboard superadmin.'
                : 'La automotora dejará de aparecer en la tab Activos y se excluirá de las métricas globales del dashboard superadmin. No se elimina nada — sus datos se conservan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isToggling}
              onClick={(e) => {
                e.preventDefault();
                confirmToggleActive();
              }}
            >
              {isToggling ? 'Procesando…' : 'Aceptar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Clientes;
