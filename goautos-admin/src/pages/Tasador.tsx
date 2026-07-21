import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Send, Car, ArrowRight, BarChart3, Plus, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContentLeft } from '@/components/ui/drawer';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from '@/assets/ai-animation.json';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import TasadorResult from '@/components/tasador/TasadorResult';
import VehiclePicker from '@/components/tasador/VehiclePicker';
import ExportAppraisalPDF from '@/components/tasador/ExportAppraisalPDF';
import AppraisalHistoryPanel from '@/components/tasador/AppraisalHistoryPanel';
import { useAppraisalHistory, AppraisalRecord } from '@/hooks/useAppraisalHistory';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { AppraisalResponse } from '@/types/tasador';
import posthog from '@/utils/posthog';

const Tasador = () => {
  const { clientId, userId } = useAuth();
  const { t } = useTranslation('appraisel');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appraisalData, setAppraisalData] = useState<AppraisalResponse | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const { history, loading: historyLoading, refetch: refetchHistory } = useAppraisalHistory(clientId);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [placeholderText, setPlaceholderText] = useState('');

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Animated placeholder
  const placeholders = [
    'Toyota Corolla 2020 con 45.000 km...',
    'Nissan Versa 2022 automático...',
    'Comparar Kia Sportage vs Hyundai Tucson 2021...',
    'Suzuki Swift 2019 full equipo...',
  ];

  useEffect(() => {
    let currentPlaceholder = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const animate = () => {
      const text = placeholders[currentPlaceholder];

      if (!isDeleting) {
        charIndex++;
        setPlaceholderText(text.substring(0, charIndex));

        if (charIndex === text.length) {
          timer = setTimeout(() => {
            isDeleting = true;
            animate();
          }, 2500);
          return;
        }
        timer = setTimeout(animate, 60);
      } else {
        charIndex--;
        setPlaceholderText(text.substring(0, charIndex));

        if (charIndex === 0) {
          isDeleting = false;
          currentPlaceholder = (currentPlaceholder + 1) % placeholders.length;
          timer = setTimeout(animate, 400);
          return;
        }
        timer = setTimeout(animate, 30);
      }
    };

    timer = setTimeout(animate, 800);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    setIsLoading(true);
    setAppraisalData(null);
    setSelectedRecordId(null);
    try {
      const response = await supabase.functions.invoke('car_appraiser', {
        body: {
          query: query.trim(),
          client_id: clientId,
          user_id: userId,
        },
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      posthog.capture({
        distinctId: userId || 'anonymous',
        event: 'appraisal_requested',
        properties: { query: query.trim() },
      });
      setAppraisalData(response.data);
      refetchHistory();
    } catch (error) {
      console.error('Error fetching appraisal:', error);
      toast({
        title: t('common:actions.error'),
        description: t('page.errors.fetch'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleText: string) => {
    setQuery(exampleText);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !isLoading) {
        handleSubmit(e as any);
      }
    }
  };

  const examples = [
    { text: 'Toyota Corolla 2020', desc: 'Sedán popular', icon: Car },
    { text: 'Comparar Kia Sportage vs Hyundai Tucson 2021', desc: 'SUV comparativa', icon: BarChart3 },
  ];

  const handleNewSearch = () => {
    setAppraisalData(null);
    setQuery('');
    setSelectedRecordId(null);
    inputRef.current?.focus();
  };

  const handleSelectHistory = (record: AppraisalRecord) => {
    posthog.capture({
      distinctId: userId || 'anonymous',
      event: 'appraisal_history_viewed',
      properties: { record_id: record.id, query: record.query },
    });
    setQuery(record.query);
    setSelectedRecordId(record.id);
    setAppraisalData({
      appraisal: record.appraisal_result,
      vehicle_details: record.vehicle_details,
      original_query: record.query,
      contains_links: (record.sources?.length || 0) > 0,
      sources: record.sources || [],
      price_analysis: record.price_analysis,
      estimated_range: record.estimated_range,
      confidence: record.confidence,
      search_stats: { totalGroups: 0, successful: 0, failed: 0, sourcesBeforeDedup: 0, sourcesAfterDedup: 0, distinctSites: 0 },
      saved: true,
    });
    setSheetOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* History list */}
      <div className="flex-1 overflow-hidden">
        <AppraisalHistoryPanel
          history={history}
          loading={historyLoading}
          onSelect={handleSelectHistory}
          onDeleted={refetchHistory}
          selectedId={selectedRecordId}
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex h-full overflow-hidden">
        {/* Desktop sidebar — collapsible */}
        <div
          className={cn(
            'hidden md:flex border-r border-slate-200/60 shrink-0 transition-[width] duration-300 overflow-hidden',
            sidebarCollapsed ? 'w-0 border-r-0' : 'w-72'
          )}
        >
          <div className="w-72 h-full">
            {sidebarContent}
          </div>
        </div>

        {/* Mobile sidebar — Drawer from the left */}
        <Drawer direction="left" open={sheetOpen} onOpenChange={setSheetOpen}>
          <DrawerContentLeft className="p-0 border-0 overflow-hidden">
            {sidebarContent}
          </DrawerContentLeft>
        </Drawer>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-gradient-to-b from-slate-50/80 to-white">
          {/* Top bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 shrink-0">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 shrink-0 text-slate-400"
              onClick={() => setSheetOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Desktop sidebar toggle */}
            <div className="hidden md:flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-slate-400 hover:text-slate-600"
                onClick={() => setSidebarCollapsed((v) => !v)}
                title={sidebarCollapsed ? 'Mostrar historial' : 'Ocultar historial'}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
              <span className="text-[11px] text-slate-400 font-medium">Historial de Tasación</span>
            </div>

            {/* Title — only show query when there's data */}
            {appraisalData && (
              <div className="min-w-0">
                <h1 className="font-semibold text-sm text-slate-800 leading-tight truncate">
                  {query}
                </h1>
              </div>
            )}

            {/* Actions (top right) */}
            <div className="ml-auto flex items-center gap-1">
              {appraisalData && appraisalData.sources.length > 0 && (
                <ExportAppraisalPDF data={appraisalData} />
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNewSearch}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 h-8 w-8 shrink-0"
                title="Nueva tasación"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
              <AnimatePresence mode="wait">
                {!appraisalData && !isLoading ? (
                  <motion.div
                    key="search"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col min-h-[calc(100vh-14rem)]"
                  >
                    {/* Top spacer */}
                    <div className="flex-1 min-h-8" />

                    {/* Hero */}
                    <div className="text-center mb-8">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.5 }}
                      >
                        <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-4">
                          <div
                            className="absolute inset-[-12px] rounded-full animate-pulse"
                            style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)' }}
                          />
                          <div className="absolute inset-[-5px] animate-spin" style={{ animationDuration: '10s' }}>
                            <div className="w-full h-full rounded-full" style={{
                              background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(6,182,212,0.4) 78%, transparent 100%)',
                              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                              mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                            }} />
                          </div>
                          <div className="absolute inset-[-5px] animate-spin" style={{ animationDuration: '14s', animationDirection: 'reverse' }}>
                            <div className="w-full h-full rounded-full" style={{
                              background: 'conic-gradient(from 180deg, transparent 0%, transparent 60%, rgba(59,130,246,0.3) 80%, transparent 100%)',
                              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                              mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                            }} />
                          </div>
                          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400/25 via-cyan-500/20 to-blue-600/25 shadow-[0_0_20px_0px_rgba(6,182,212,0.15)]" />
                          <Lottie animationData={aiAnimation} loop className="relative w-14 h-14" />
                        </div>
                      </motion.div>

                      <motion.h1
                        className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                      >
                        Tasador GAIA
                      </motion.h1>

                      <motion.p
                        className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                      >
                        Obtén el valor de mercado de cualquier vehículo en segundos
                      </motion.p>
                    </div>

                    {/* Example Cards */}
                    <motion.div
                      className="grid grid-cols-2 gap-2 mb-3"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                    >
                      {examples.map((example, idx) => {
                        const Icon = example.icon;
                        return (
                          <motion.button
                            key={idx}
                            onClick={() => handleExampleClick(example.text)}
                            className="group relative overflow-hidden flex items-center gap-3 p-3 text-left bg-white border border-gray-200/60 rounded-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                          >
                            <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-primary/20 transition-colors">
                              <Icon className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 text-[13px] truncate group-hover:text-primary transition-colors">
                                {example.text}
                              </p>
                              <p className="text-[11px] text-gray-500">
                                {example.desc}
                              </p>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                          </motion.button>
                        );
                      })}
                    </motion.div>

                    {/* Vehicle Picker from inventory */}
                    <motion.div
                      className="mb-6"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45, duration: 0.5 }}
                    >
                      <VehiclePicker
                        onSelect={(vehicleQuery, vehicleId) => {
                          setQuery(vehicleQuery);
                          setTimeout(() => {
                            setIsLoading(true);
                            setAppraisalData(null);
                            setSelectedRecordId(null);
                            supabase.functions.invoke('car_appraiser', {
                              body: {
                                query: vehicleQuery.trim(),
                                client_id: clientId,
                                user_id: userId,
                                vehicle_id: vehicleId,
                              },
                            }).then(({ data, error }) => {
                              if (error) {
                                toast({
                                  title: t('common:actions.error'),
                                  description: t('page.errors.fetch'),
                                  variant: 'destructive',
                                });
                              } else {
                                posthog.capture({
                                  distinctId: userId || 'anonymous',
                                  event: 'appraisal_requested',
                                  properties: { query: vehicleQuery.trim(), source: 'vehicle_picker' },
                                });
                                setAppraisalData(data);
                                refetchHistory();
                              }
                              setIsLoading(false);
                            });
                          }, 0);
                        }}
                      />
                    </motion.div>

                    {/* Search Form */}
                    <motion.form
                      onSubmit={handleSubmit}
                      className="relative"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                    >
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-cyan-400/20 to-primary/20 rounded-[20px] blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

                        <div className="relative bg-white rounded-2xl shadow-xl shadow-gray-200/40 border border-gray-200/80 focus-within:border-primary/40 focus-within:shadow-primary/10 transition-all duration-300">
                          <textarea
                            ref={inputRef}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={placeholderText}
                            disabled={isLoading}
                            rows={1}
                            className="w-full px-5 py-4 pr-14 text-gray-900 text-base placeholder:text-gray-400 bg-transparent resize-none focus:outline-none disabled:opacity-50"
                            style={{ minHeight: '56px', maxHeight: '120px' }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                            }}
                          />
                          <button
                            type="submit"
                            disabled={isLoading || !query.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-cyan-500 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95 transition-all duration-200"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-center text-xs text-gray-400 mt-4">
                        Presiona Enter para enviar · Datos de Chileautos, Yapo y más
                      </p>
                    </motion.form>

                    {/* Bottom spacer */}
                    <div className="flex-1 min-h-8" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Result Component */}
                    <TasadorResult
                      appraisalData={appraisalData}
                      isLoading={isLoading}
                      onRetry={() => {
                        if (query.trim()) {
                          handleSubmit({ preventDefault: () => {} } as any);
                        }
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Tasador;
