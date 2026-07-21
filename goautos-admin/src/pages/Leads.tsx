import { useState, useMemo, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { useLeads } from '@/hooks/useLeads';
import { Lead } from '@/types/leads';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';
import { useTranslation } from 'react-i18next';
import LoadingState from '@/components/users/LoadingState';
import CreateLeadDialog from '@/components/leads/CreateLeadDialog';
import EditNotesDialog from '@/components/leads/EditNotesDialog';
import DeleteLeadDialog from '@/components/leads/DeleteLeadDialog';
import LeadStatusCards from '@/components/leads/LeadStatusCards';
import LeadViewToggle from '@/components/leads/LeadViewToggle';
import LeadFilters from '@/components/leads/LeadFilters';
import LeadKanban from '@/components/leads/LeadKanban';
import LeadTable from '@/components/leads/LeadTable';
import LeadDetailSheet from '@/components/leads/LeadDetailSheet';
import VehiclesPagination from '@/components/vehiculos/VehiclesPagination';
import { LeadStatus, TabType, ViewMode } from '@/components/leads/leadConstants';
import { getLeadOrigin } from '@/components/leads/leadOrigin';
import { useVehicleRequests } from '@/hooks/useVehicleRequests';
import { useAssignableSellers } from '@/hooks/useAssignableSellers';
import { usePermissions } from '@/hooks/usePermissions';
import { PermissionCode } from '@/types/permissions';
import { exportLeadsToExcel } from '@/utils/excelExport';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PAGE_SIZE = 10;

const Leads = () => {
  const { clientId, userData } = useAuth();
  const { t, i18n } = useTranslation('leadsPage');
  const { hasPermission } = usePermissions();
  const canExport = hasPermission(PermissionCode.LEADS_VIEW);
  const [isExporting, setIsExporting] = useState(false);

  // Core state
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 768;
  const [viewMode, setViewMode] = useState<ViewMode>(isMobileInit ? 'table' : 'kanban');
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedOrigin, setSelectedOrigin] = useState('all');
  const [activeStatus, setActiveStatus] = useState<LeadStatus | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('alertFilter') === 'pending-leads') {
      window.history.replaceState({}, '', window.location.pathname);
      return 'pending';
    }
    return null;
  });

  // Detail / CRUD state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editNotesLead, setEditNotesLead] = useState<Lead | null>(null);
  const [deleteLeadTarget, setDeleteLeadTarget] = useState<Lead | null>(null);

  const {
    isLoading,
    error,
    groupedLeads,
    updateLeadStatus,
    createLead,
    deleteLead,
    updateLeadNotes,
    assignLead,
    claimLead,
    releaseLead,
    canAssignLeads,
    canClaim,
  } = useLeads({ clientId: +clientId });

  const { createRequest } = useVehicleRequests();
  // Vendedores para el selector de asignación (solo se carga si puede asignar).
  const { data: sellers = [] } = useAssignableSellers(+clientId, canAssignLeads);

  // Current tab's raw leads
  const rawLeads = activeTab === 'buy' ? groupedLeads.buyLeads : groupedLeads.sellLeads;

  // Keep selectedLead in sync with latest data
  useEffect(() => {
    if (selectedLead) {
      const allLeads = [...groupedLeads.buyLeads, ...groupedLeads.sellLeads];
      const updated = allLeads.find((l) => l.id === selectedLead.id);
      if (updated && updated !== selectedLead) setSelectedLead(updated);
    }
  }, [groupedLeads, selectedLead]);

  // Filtered leads
  const filteredLeads = useMemo(() => {
    let result = rawLeads;

    // Status filter
    if (activeStatus) {
      result = result.filter((l) => l.status === activeStatus);
    }

    // Type filter
    if (selectedType !== 'all') {
      result = result.filter((l) => l.type === selectedType);
    }

    // Origin filter (ChileAutos / Otros)
    if (selectedOrigin !== 'all') {
      result = result.filter((l) => getLeadOrigin(l).key === selectedOrigin);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((l) => {
        const name = `${l.customer?.first_name || ''} ${l.customer?.last_name || ''}`.toLowerCase();
        const email = (l.customer?.email || '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    return result;
  }, [rawLeads, activeStatus, selectedType, selectedOrigin, search]);

  // Pagination (client-side)
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / PAGE_SIZE));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLeads.slice(start, start + PAGE_SIZE);
  }, [filteredLeads, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatus, selectedType, selectedOrigin, search, activeTab]);

  const hasActiveFilters = !!activeStatus || selectedType !== 'all' || selectedOrigin !== 'all' || search.trim() !== '';
  const totalLeadsCount = groupedLeads.buyLeads.length + groupedLeads.sellLeads.length;

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    await updateLeadStatus(leadId, newStatus);
  };

  const handleReset = () => {
    setActiveStatus(null);
    setSelectedType('all');
    setSelectedOrigin('all');
    setSearch('');
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedType('all');
    setSelectedOrigin('all');
    setActiveStatus(null);
  };

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    posthog.capture({
      distinctId: clientId ? String(clientId) : 'anonymous',
      event: 'lead_view_switched',
      properties: { view_type: mode },
    });
  }, [clientId]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (value.trim().length > 0) {
      posthog.capture({
        distinctId: clientId ? String(clientId) : 'anonymous',
        event: 'lead_searched',
        properties: { query_length: value.trim().length },
      });
    }
  }, [clientId]);

  // Exporta a Excel la vista ACTUAL (tab + filtros). Usa `filteredLeads`, NO
  // `paginatedLeads` (no truncar a una página). Respeta la visibilidad porque
  // `filteredLeads` deriva de los leads que el hook ya filtró por vendedor.
  const handleExport = async () => {
    if (isExporting) return;
    if (filteredLeads.length === 0) {
      toast.error(t('export.empty', 'No hay leads para exportar con los filtros actuales.'));
      return;
    }
    setIsExporting(true);
    try {
      await exportLeadsToExcel({
        leads: filteredLeads,
        clientId: +clientId,
        filename: `leads-${activeTab}`,
        language: i18n.language?.startsWith('en') ? 'en' : 'es',
      });
      posthog.capture({
        distinctId: clientId ? String(clientId) : 'anonymous',
        event: 'leads_exported',
        properties: { count: filteredLeads.length, tab: activeTab, client_id: clientId },
      });
      // Auditoría en BD: quién descargó, cuántos leads y con qué filtros. Fire-and-forget:
      // si el registro falla, la descarga igual se completó (no rompemos la acción del usuario).
      supabase
        .rpc('log_lead_export', {
          p_client_id: +clientId,
          p_count: filteredLeads.length,
          p_tab: activeTab,
          p_filters: {
            status: activeStatus,
            type: selectedType,
            origin: selectedOrigin,
            search: search.trim().length > 0,
          },
        })
        .then(({ error }) => {
          if (error) console.error('No se pudo registrar la exportación:', error);
        });
      toast.success(t('export.success', { defaultValue: 'Exportados {{count}} leads', count: filteredLeads.length }));
    } catch (err) {
      console.error('Error exportando leads:', err);
      toast.error(t('export.error', 'No pudimos exportar los leads. Intenta de nuevo.'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="flex flex-col h-full bg-[#f5f5f7]">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#f5f5f7] border-b border-slate-200/60">
          <div className="px-4 sm:px-6 lg:px-8 pt-2 sm:pt-3 pb-2 sm:pb-3 space-y-2 sm:space-y-3">
            {!isLoading && !error && (
              <>
                <div data-tour="leads-status-cards" className="block md:hidden">
                  <LeadStatusCards
                    leads={rawLeads}
                    activeStatus={activeStatus}
                    onStatusClick={setActiveStatus}
                  />
                </div>

                <div data-tour="leads-tabs" className="w-full flex items-center gap-2">
                  <LeadViewToggle
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                    buyCount={groupedLeads.buyLeads.length}
                    sellCount={groupedLeads.sellLeads.length}
                    selectedType={selectedType}
                    onTypeChange={setSelectedType}
                    selectedOrigin={selectedOrigin}
                    onOriginChange={setSelectedOrigin}
                    onCreateLead={() => setCreateDialogOpen(true)}
                    search={search}
                    onSearchChange={handleSearchChange}
                    onExport={handleExport}
                    canExport={canExport}
                    isExporting={isExporting}
                  />
                </div>

                <div data-tour="leads-filters" className="md:hidden">
                  <LeadFilters
                    search={search}
                    onSearchChange={handleSearchChange}
                    activeStatus={activeStatus}
                    onStatusChange={setActiveStatus}
                    hasActiveFilters={hasActiveFilters}
                    onReset={handleReset}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 min-h-0 px-2 sm:px-6 lg:px-8 py-2 sm:py-4 ${viewMode === 'kanban' && !isLoading && !error ? 'overflow-x-auto overflow-y-hidden' : 'overflow-auto'}`} data-tour="leads-content">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingState />
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <div className="bg-red-50 p-4 rounded-2xl inline-block">
                <p className="text-[13px] text-red-800 font-medium">{t('errors.load')}</p>
                <p className="text-[12px] text-red-600 mt-1">{error}</p>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === 'kanban' ? (
                <motion.div
                  key="kanban"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <LeadKanban
                    leads={filteredLeads}
                    onSelectLead={setSelectedLead}
                    onStatusChange={handleStatusChange}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="table"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <LeadTable
                    leads={paginatedLeads}
                    totalLeadsCount={totalLeadsCount}
                    onSelectLead={setSelectedLead}
                    onEditNotes={setEditNotesLead}
                    onDeleteLead={setDeleteLeadTarget}
                    onStatusChange={handleStatusChange}
                    onCreateLead={() => setCreateDialogOpen(true)}
                    showAssignee={canAssignLeads}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Pagination — fixed above bottom nav */}
        {viewMode === 'table' && !isLoading && !error && filteredLeads.length > PAGE_SIZE && (
          <div className="bg-white/80 backdrop-blur-sm border-t border-slate-200/40">
            <VehiclesPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={filteredLeads.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              isLoading={false}
            />
          </div>
        )}
      </main>

      {/* Detail sheet */}
      <LeadDetailSheet
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => { if (!open) setSelectedLead(null); }}
        onStatusChange={handleStatusChange}
        onUpdateNotes={updateLeadNotes}
        onDeleteLead={(lead) => { setSelectedLead(null); setDeleteLeadTarget(lead); }}
        onCreateRequest={createRequest}
        canAssign={canAssignLeads}
        sellers={sellers}
        onAssign={assignLead}
        canClaim={canClaim}
        currentUserId={userData?.id ?? null}
        onClaim={claimLead}
        onRelease={releaseLead}
      />

      {/* CRUD Dialogs */}
      <CreateLeadDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreateLead={createLead}
      />

      {editNotesLead && (
        <EditNotesDialog
          open={!!editNotesLead}
          onOpenChange={(open) => { if (!open) setEditNotesLead(null); }}
          leadId={editNotesLead.id}
          currentNotes={editNotesLead.notes || ''}
          onUpdateNotes={updateLeadNotes}
        />
      )}

      {deleteLeadTarget && (
        <DeleteLeadDialog
          open={!!deleteLeadTarget}
          onOpenChange={(open) => { if (!open) setDeleteLeadTarget(null); }}
          leadId={deleteLeadTarget.id}
          onDeleteLead={deleteLead}
        />
      )}
    </DashboardLayout>
  );
};

export default Leads;
