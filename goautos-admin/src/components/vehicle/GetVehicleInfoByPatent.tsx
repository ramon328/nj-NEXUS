import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import {
  Loader2,
  Search,
  Sparkles,
  Car,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  Fuel,
  Gauge,
  Calendar,
  Palette,
  Settings2,
  Hash,
  DollarSign,
  Pencil,
  Key,
  Zap,
  Clock,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  ExternalLink,
  Globe,
  Shield,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { useVehicleInfoByPatent } from '@/integrations/getapi';
import { MappedVehicleData } from '@/types/getapi';
import { useBrands } from '@/hooks/useBrands';
import { useModels } from '@/hooks/useModels';
import { useFuelTypes } from '@/hooks/useFuelTypes';
import { useColors } from '@/hooks/useColors';
import { useConditions } from '@/hooks/useConditions';
import { useCategories } from '@/hooks/useCategories';
import { VEHICLE_TYPE_CATEGORIES, VEHICLE_TYPE_LABELS, type VehicleType } from '@/types/vehicle';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { checkDuplicateVehicle, DuplicateVehicleInfo } from '@/services/vehicleService';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from '@/assets/ai-animation.json';

interface VehicleSource {
  source: string;
  vehicle: string;
  year: number | null;
  version: string | null;
  mileage: number | null;
  price: number;
  url: string;
}

interface PriceAnalysis {
  min: number | null;
  max: number | null;
  average: number | null;
  median: number | null;
  sampleSize: number;
}

interface AppraisalData {
  sources: VehicleSource[];
  price_analysis: PriceAnalysis | null;
  estimated_range: { low: number; high: number } | null;
  confidence: 'high' | 'medium' | 'low';
}

interface GetVehicleInfoByPatentProps {
  onVehicleDataFound: (data: MappedVehicleData) => void;
  onSkip: () => void;
}

// El error que llega desde GetAPI / la Edge Function puede traer el cuerpo crudo
// (ej: `Vehicle info request failed: {"status":404,...,"message":"vehiculo no encontrado"}`).
// Lo convertimos en un mensaje corto y entendible para la automotora.
function humanizePatentError(rawError?: string | null): string {
  const fallback = 'No encontramos información para esta patente';
  if (!rawError) return fallback;
  const lower = rawError.toLowerCase();
  if (
    lower.includes('no encontrado') ||
    lower.includes('not found') ||
    lower.includes('404')
  ) {
    return 'No encontramos un vehículo con esa patente';
  }
  return fallback;
}

const GetVehicleInfoByPatent: React.FC<GetVehicleInfoByPatentProps> = ({
  onVehicleDataFound,
  onSkip,
}) => {
  const [patent, setPatent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<{
    success: boolean;
    data?: MappedVehicleData;
    originalData?: any;
    message: string;
  } | null>(null);
  const [editData, setEditData] = useState<MappedVehicleData | null>(null);
  const [visibleTechFields, setVisibleTechFields] = useState<Set<string>>(new Set());
  const [appraisalData, setAppraisalData] = useState<AppraisalData | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [showFiscalPrices, setShowFiscalPrices] = useState(false);
  const [duplicateVehicle, setDuplicateVehicle] = useState<DuplicateVehicleInfo | null>(null);

  const { brands } = useBrands();
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const { models } = useModels(selectedBrandId);
  const { fuelTypes } = useFuelTypes();
  const { colors } = useColors();
  const { conditions } = useConditions();
  const { categories } = useCategories();
  const { fetchAndMapVehicleInfo } = useVehicleInfoByPatent();
  const { t } = useTranslation('common');
  const { clientId, user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editData?.brand_id) setSelectedBrandId(editData.brand_id);
  }, [editData?.brand_id]);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, []);

  const fetchMarketPrices = async (query: string) => {
    setIsLoadingPrices(true);
    setAppraisalData(null);
    try {
      const { data, error } = await supabase.functions.invoke('car_appraiser', {
        body: { query, client_id: clientId, user_id: user?.id },
      });
      if (!error && data) {
        setAppraisalData({
          sources: data.sources || [],
          price_analysis: data.price_analysis || null,
          estimated_range: data.estimated_range || null,
          confidence: data.confidence || 'low',
        });
      }
    } catch {
      // Silent fail — fallback to GetAPI prices
    } finally {
      setIsLoadingPrices(false);
    }
  };

  const handleSearch = async () => {
    if (!patent.trim()) {
      toast({
        title: t('addVehicle.autocomplete.toasts.required.title'),
        description: t('addVehicle.autocomplete.toasts.required.description'),
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setSearchResult(null);
    setEditData(null);
    setAppraisalData(null);
    setShowFiscalPrices(false);
    setDuplicateVehicle(null);
    try {
      // Check for duplicate vehicle before external API call
      if (clientId) {
        const duplicate = await checkDuplicateVehicle(patent.trim(), clientId);
        if (duplicate) {
          setDuplicateVehicle(duplicate);
        }
      }
      const { mappedData, originalData, error } = await fetchAndMapVehicleInfo(
        patent, brands, [], fuelTypes, colors, conditions, categories
      );
      if (mappedData) {
        setSearchResult({ success: true, data: mappedData, originalData, message: '' });
        setEditData({ ...mappedData });
        // Track which technical fields came with data so they stay visible even if cleared
        const techFields = new Set<string>();
        if (mappedData.engine_number) techFields.add('engine_number');
        if (mappedData.chassis_number) techFields.add('chassis_number');
        if (mappedData.engine) techFields.add('engine');
        if (mappedData.doors) techFields.add('doors');
        setVisibleTechFields(techFields);

        // Launch AI appraisal and fines check in background
        const vehicleQuery = `${mappedData.brand_name} ${mappedData.model_name} ${mappedData.year}${mappedData.mileage ? ` con ${mappedData.mileage.toLocaleString()} km` : ''}`;
        fetchMarketPrices(vehicleQuery);
      } else {
        setSearchResult({ success: false, message: humanizePatentError(error) });
      }
    } catch {
      setSearchResult({ success: false, message: t('addVehicle.autocomplete.results.error') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseData = () => { if (editData) onVehicleDataFound(editData); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };
  const updateField = (field: keyof MappedVehicleData, value: any) => {
    setEditData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return formatCurrency(amount);
  };

  const LoadingDots = () => (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-blue-500"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );

  const hasResults = searchResult?.success && editData;
  const hasTechnical = editData && (editData.engine_number || editData.chassis_number || editData.engine || editData.doors);
  const hasFiscalPrices = editData && (editData.price != null || editData.price_min != null || editData.price_max != null);
  const hasUsefulAppraisal = appraisalData && (
    appraisalData.estimated_range ||
    (appraisalData.price_analysis && (appraisalData.price_analysis.min != null || appraisalData.price_analysis.max != null)) ||
    appraisalData.sources.length > 0
  );
  const showPricesSidebar = isLoadingPrices || hasUsefulAppraisal || hasFiscalPrices;

  const confidenceConfig = {
    high: { label: 'Alta confianza', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: ShieldCheck },
    medium: { label: 'Confianza media', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: Shield },
    low: { label: 'Baja confianza', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: ShieldAlert },
  };

  // ===== Animated placeholder for patent input =====
  const examplePatents = ['BBFL32', 'KXRY58', 'JHTP91', 'CLWD47'];
  const [placeholderText, setPlaceholderText] = useState('');
  const placeholderIdx = useRef(0);
  const charIdx = useRef(0);
  const phaseRef = useRef<'typing' | 'pause' | 'erasing'>('typing');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (patent) return;
    const current = examplePatents[placeholderIdx.current % examplePatents.length];
    let timeout: ReturnType<typeof setTimeout>;

    if (phaseRef.current === 'typing') {
      timeout = setTimeout(() => {
        charIdx.current++;
        setPlaceholderText(current.slice(0, charIdx.current));
        if (charIdx.current >= current.length) {
          phaseRef.current = 'pause';
        }
        setTick((t) => t + 1);
      }, 90);
    } else if (phaseRef.current === 'pause') {
      timeout = setTimeout(() => {
        phaseRef.current = 'erasing';
        setTick((t) => t + 1);
      }, 1500);
    } else if (phaseRef.current === 'erasing') {
      timeout = setTimeout(() => {
        charIdx.current--;
        setPlaceholderText(current.slice(0, charIdx.current));
        if (charIdx.current <= 0) {
          placeholderIdx.current++;
          phaseRef.current = 'typing';
        }
        setTick((t) => t + 1);
      }, 50);
    }

    return () => clearTimeout(timeout);
  }, [tick, patent]);

  // ===== INITIAL STATE — no results, not loading =====
  if (!searchResult && !isLoading) {
    return (
      <div className="flex flex-col items-center px-4 pt-[18vh]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg mx-auto text-center"
        >
          {/* Lottie AI icon with glow */}
          <div className="relative w-28 h-28 mx-auto mb-5">
            <motion.div
              className="absolute inset-[-16px] rounded-full"
              animate={{
                background: [
                  'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
                  'radial-gradient(circle, rgba(56,189,248,0.25) 0%, transparent 70%)',
                  'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div
              className="absolute inset-[-6px] animate-spin"
              style={{ animationDuration: '10s' }}
            >
              <div className="w-full h-full rounded-full" style={{
                background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(56,189,248,0.35) 78%, transparent 100%)',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
              }} />
            </div>
            <div className="absolute inset-[-12px] rounded-full bg-white/70 blur-md" />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Lottie animationData={aiAnimation} loop className="w-20 h-20" />
            </motion.div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-lg font-semibold text-slate-800"
          >
            {t('addVehicle.autocomplete.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[13px] text-slate-400 mt-1.5 mb-7"
          >
            {t('addVehicle.autocomplete.subtitle')}
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="relative bg-white rounded-xl border border-slate-200/60 shadow-sm p-1.5 mb-5"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={placeholderText || ''}
                  value={patent}
                  onChange={(e) => setPatent(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  className="pl-11 h-9 text-base font-semibold tracking-widest uppercase bg-transparent border-0 focus:ring-0 focus-visible:ring-0 shadow-none placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-wider"
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isLoading || !patent.trim()}
                className="h-9 px-4 bg-sky-400 hover:bg-sky-500 text-white font-medium rounded-lg text-sm inline-flex items-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Buscar</span>
              </Button>
            </div>
          </motion.div>

          {/* Duplicate vehicle alert */}
          <AnimatePresence>
            {duplicateVehicle && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="mb-5 rounded-xl border border-amber-300 bg-amber-50/90 backdrop-blur-sm p-4 text-left shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">
                      {duplicateVehicle.sold_only
                        ? 'Este vehículo figura como vendido en tu inventario'
                        : 'Este vehiculo ya existe en tu inventario'}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      <span className="font-medium">
                        {[duplicateVehicle.brand_name, duplicateVehicle.model_name, duplicateVehicle.year].filter(Boolean).join(' ')}
                      </span>
                      {duplicateVehicle.status_name && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-200/60 text-amber-800">
                          {duplicateVehicle.status_name}
                        </span>
                      )}
                      {duplicateVehicle.dealership_name && (
                        <span className="text-amber-600 ml-1">
                          · {duplicateVehicle.dealership_name}
                        </span>
                      )}
                    </p>
                    {duplicateVehicle.sold_only && (
                      <p className="text-xs text-amber-700 mt-1">
                        Puedes continuar: se creará como una unidad nueva
                        (recompra), sin tocar la venta anterior.
                      </p>
                    )}
                    <a
                      href={`/vehiculos/${duplicateVehicle.id}`}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors underline underline-offset-2"
                    >
                      Ver vehiculo existente
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {duplicateVehicle.main_image && (
                    <img
                      src={duplicateVehicle.main_image}
                      alt=""
                      className="w-16 h-12 rounded-lg object-cover shrink-0 border border-amber-200"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            type="button"
            onClick={onSkip}
            className="text-[13px] text-slate-500 hover:text-slate-700 font-medium transition-colors inline-flex items-center gap-1.5 group"
          >
            Omitir y llenar manualmente
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <div className="flex flex-col items-center px-4 pt-[18vh]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg mx-auto text-center"
        >
          {/* Amplified orb */}
          <div className="relative w-28 h-28 mx-auto mb-5">
            <motion.div
              className="absolute inset-[-16px] rounded-full"
              animate={{
                background: [
                  'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
                  'radial-gradient(circle, rgba(56,189,248,0.35) 0%, transparent 70%)',
                  'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div
              className="absolute inset-[-6px] animate-spin"
              style={{ animationDuration: '4s' }}
            >
              <div className="w-full h-full rounded-full" style={{
                background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(56,189,248,0.35) 78%, transparent 100%)',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
              }} />
            </div>
            <div className="absolute inset-[-12px] rounded-full bg-white/70 blur-md" />
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Lottie animationData={aiAnimation} loop className="w-20 h-20" />
            </motion.div>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="text-lg font-semibold text-slate-800"
          >
            Analizando con IA
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[13px] text-slate-400 mt-1.5 mb-5"
          >
            Buscando información para <span className="font-semibold text-slate-600 tracking-widest">{patent}</span>
          </motion.p>

          {/* Thinking dots */}
          <div className="flex items-center justify-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-slate-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (searchResult && !searchResult.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] px-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <p className="font-semibold text-red-800 text-lg">{searchResult.message}</p>
          <p className="text-sm text-slate-500 mt-1.5 mb-6">
            Revisa que la patente esté bien escrita, o ingresa la marca y el modelo de tu vehículo manualmente
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                setSearchResult(null);
                setPatent('');
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              variant="outline"
              className="h-11 px-5 border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl"
            >
              <Search className="w-4 h-4 mr-2" />
              Intentar otra patente
            </Button>
            <Button
              onClick={onSkip}
              className="h-11 px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-sm"
            >
              Llenar manualmente
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== RESULTS STATE =====
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 max-w-[1400px] mx-auto"
    >
      {/* Content: 2 stacked cards on left + prices sidebar on right */}
      <div className={cn('grid gap-3', showPricesSidebar ? 'grid-cols-1 lg:grid-cols-[1fr_300px]' : 'grid-cols-1')}>
        {/* Left column: top bar + fields card stacked */}
        <div className="space-y-3">
          {/* Top bar: vehicle name + actions */}
          <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 px-4 py-3">
            <Input
              ref={inputRef}
              type="text"
              value={patent}
              onChange={(e) => setPatent(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="h-7 w-24 text-xs font-medium text-slate-400 tracking-wider uppercase border-slate-200 rounded-lg px-2 text-center flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-slate-900 tracking-tight truncate">
                {editData!.brand_name || 'Marca'} {editData!.model_name || 'Modelo'} {editData!.year || ''}
                {editData!.version && <span className="text-slate-400 font-normal ml-1.5">{editData!.version}</span>}
              </p>
            </div>
            {/* Actions */}
            <div className="hidden xl:flex items-center gap-2 flex-shrink-0 pl-2 border-l border-slate-200">
              <motion.button
                onClick={handleUseData}
                className="h-9 px-4 bg-sky-400 hover:bg-sky-500 text-white font-medium rounded-xl text-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                Continuar
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* Duplicate vehicle alert */}
          <AnimatePresence>
            {duplicateVehicle && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                className="rounded-xl border border-amber-300 bg-amber-50/90 backdrop-blur-sm p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">
                      {duplicateVehicle.sold_only
                        ? 'Este vehículo figura como vendido en tu inventario'
                        : 'Este vehiculo ya existe en tu inventario'}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      <span className="font-medium">
                        {[duplicateVehicle.brand_name, duplicateVehicle.model_name, duplicateVehicle.year].filter(Boolean).join(' ')}
                      </span>
                      {duplicateVehicle.status_name && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-200/60 text-amber-800">
                          {duplicateVehicle.status_name}
                        </span>
                      )}
                      {duplicateVehicle.dealership_name && (
                        <span className="text-amber-600 ml-1">
                          · {duplicateVehicle.dealership_name}
                        </span>
                      )}
                    </p>
                    {duplicateVehicle.sold_only && (
                      <p className="text-xs text-amber-700 mt-1">
                        Puedes continuar: se creará como una unidad nueva
                        (recompra), sin tocar la venta anterior.
                      </p>
                    )}
                    <a
                      href={`/vehiculos/${duplicateVehicle.id}`}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors underline underline-offset-2"
                    >
                      Ver vehiculo existente
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {duplicateVehicle.main_image && (
                    <img
                      src={duplicateVehicle.main_image}
                      alt=""
                      className="w-16 h-12 rounded-lg object-cover shrink-0 border border-amber-200"
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fields card */}
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden">
          <div className="p-4">
            {/* All fields in a flowing grid — 4 cols on lg, 5 on xl */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-x-3 gap-y-2.5">
              <FieldSelect
                icon={Car} label="Marca"
                value={editData!.brand_id || ''} warn={!editData!.brand_id}
                options={brands.map((b) => ({ value: b.id, label: b.name }))}
                onChange={(v) => {
                  const brand = brands.find((b) => b.id === v);
                  updateField('brand_id', v); updateField('brand_name', brand?.name || '');
                  updateField('model_id', ''); updateField('model_name', '');
                  setSelectedBrandId(v);
                }}
              />
              <FieldSelect
                icon={Settings2} label="Modelo"
                value={editData!.model_id || ''} warn={!editData!.model_id}
                disabled={!editData!.brand_id}
                options={models.map((m) => ({ value: String(m.id), label: m.name }))}
                onChange={(v) => {
                  const model = models.find((m) => String(m.id) === v);
                  updateField('model_id', v); updateField('model_name', model?.name || '');
                }}
              />
              <FieldInput icon={Calendar} label="Año" value={editData!.year?.toString() || ''} placeholder="2022"
                onChange={(v) => updateField('year', parseInt(v) || undefined)} inputMode="numeric" />
              <FieldInput icon={Gauge} label="Kilometraje"
                value={editData!.mileage?.toLocaleString('es-CL') || ''} placeholder="45.000"
                onChange={(v) => { const raw = v.replace(/\D/g, ''); updateField('mileage', raw ? parseInt(raw) : undefined); }}
                inputMode="numeric" />
              <FieldSelect icon={Settings2} label="Transmisión" value={editData!.transmission || ''}
                options={[{ value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automática' }]}
                onChange={(v) => updateField('transmission', v)} />
              <FieldSelect icon={Settings2} label="Tracción" value={editData!.traction || ''}
                options={[{ value: '4x2', label: '4x2' }, { value: '4x4', label: '4x4' }, { value: 'AWD', label: 'AWD' }]}
                onChange={(v) => updateField('traction', v)} />
              <FieldSelect icon={Fuel} label="Combustible" value={editData!.fuel_type_id || ''} warn={!editData!.fuel_type_id}
                options={fuelTypes.map((f) => ({ value: String(f.id), label: f.name }))}
                onChange={(v) => { const fuel = fuelTypes.find((f) => String(f.id) === v); updateField('fuel_type_id', v); updateField('fuel_name', fuel?.name || ''); }} />
              <FieldSelect icon={Palette} label="Color" value={editData!.color_id || ''} warn={!editData!.color_id}
                options={colors.map((c) => ({ value: String(c.id), label: c.name }))}
                onChange={(v) => { const color = colors.find((c) => String(c.id) === v); updateField('color_id', v); updateField('color_name', color?.name || ''); }} />
              <FieldSelect icon={Car} label="Categoría" value={editData!.category_id || ''} warn={!editData!.category_id}
                groups={buildCategoryGroups(categories)}
                onChange={(v) => { const cat = categories.find((c) => String(c.id) === v); updateField('category_id', v); updateField('category_name', cat?.name || ''); }} />
              {/* Technical fields inline */}
              {visibleTechFields.has('engine_number') && (
                <FieldInput icon={Hash} label="N° Motor" value={editData!.engine_number || ''} mono
                  onChange={(v) => updateField('engine_number', v)} />
              )}
              {visibleTechFields.has('chassis_number') && (
                <FieldInput icon={Hash} label="Chasis/VIN" value={editData!.chassis_number || ''} mono
                  onChange={(v) => updateField('chassis_number', v)} />
              )}
              {visibleTechFields.has('engine') && (
                <FieldInput icon={Settings2} label="Motor" value={editData!.engine || ''}
                  onChange={(v) => updateField('engine', v)} />
              )}
              {visibleTechFields.has('doors') && (
                <FieldInput icon={Key} label="Puertas" value={editData!.doors?.toString() || ''}
                  onChange={(v) => updateField('doors', v)} inputMode="numeric" />
              )}
            </div>

            {/* Warnings */}
            {(!editData!.brand_id || !editData!.model_id) && (
              <div className="flex gap-2.5 p-2.5 mt-3 bg-amber-50 border border-amber-200/60 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">
                  {!editData!.brand_id && <>La marca no se mapeó. </>}
                  {!editData!.model_id && editData!.brand_id && <>Modelo no encontrado. </>}
                  Selecciónalos arriba.
                </p>
              </div>
            )}

            {/* Mobile-only actions */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 xl:hidden">
              <motion.button
                onClick={handleUseData}
                className="flex-1 h-10 bg-sky-400 hover:bg-sky-500 text-white font-medium rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </div>
        </div>

        {/* Prices sidebar */}
        {showPricesSidebar && (
          <div className="bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border border-slate-200/60 overflow-hidden h-full flex flex-col">
            <div className={cn('p-3 space-y-2.5 flex-1', isLoadingPrices && !hasUsefulAppraisal && 'flex flex-col justify-center')}>
              {/* Loading state */}
              {isLoadingPrices && !hasUsefulAppraisal && (
                <div className="flex flex-col items-center space-y-3">
                  {/* Mini orb */}
                  <div className="relative w-20 h-20">
                    <motion.div
                      className="absolute inset-[-10px] rounded-full"
                      animate={{
                        background: [
                          'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
                          'radial-gradient(circle, rgba(56,189,248,0.3) 0%, transparent 70%)',
                          'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
                        ],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    <div
                      className="absolute inset-[-4px] animate-spin"
                      style={{ animationDuration: '4s' }}
                    >
                      <div className="w-full h-full rounded-full" style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(56,189,248,0.3) 78%, transparent 100%)',
                        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                        mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                      }} />
                    </div>
                    <div className="absolute inset-[-8px] rounded-full bg-white/60 blur-sm" />
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Lottie animationData={aiAnimation} loop className="w-14 h-14" />
                    </motion.div>
                  </div>
                  <motion.span
                    className="text-[11px] text-slate-400"
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    Buscando precios reales...
                  </motion.span>
                  <PriceLoadingSteps />
                </div>
              )}

              {/* AI Appraisal data */}
              {hasUsefulAppraisal && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2.5"
                >
                  {/* Estimated range */}
                  {appraisalData.estimated_range && (
                    <div className="text-center p-2.5 bg-sky-50 rounded-xl border border-sky-200/60">
                      <p className="text-[10px] text-sky-500 uppercase tracking-wide font-medium flex items-center justify-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Rango de mercado
                      </p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5">
                        {formatCurrency(appraisalData.estimated_range.low)}
                        <span className="text-slate-400 font-normal mx-1">—</span>
                        {formatCurrency(appraisalData.estimated_range.high)}
                      </p>
                    </div>
                  )}

                  {/* Real listings */}
                  {appraisalData.sources.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-500 px-0.5">Publicaciones encontradas</p>
                      <div className="space-y-1">
                        {appraisalData.sources.slice(0, 3).map((source, idx) => (
                          <a
                            key={idx}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors group"
                          >
                            <p className="text-[11px] font-medium text-slate-700 truncate group-hover:text-sky-600 transition-colors">
                              {source.vehicle}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className="text-[11px] text-slate-400">
                                {source.mileage != null && `${source.mileage.toLocaleString()} km · `}
                                <span className="font-semibold text-slate-600">{formatCurrency(source.price)}</span>
                              </span>
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-500 font-medium">
                                {source.source}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Fiscal prices collapsible */}
                  {hasFiscalPrices && (
                    <div className="border-t border-slate-100 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowFiscalPrices(!showFiscalPrices)}
                        className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 font-medium transition-colors w-full"
                      >
                        <ChevronDown className={cn('w-3 h-3 transition-transform', showFiscalPrices && 'rotate-180')} />
                        Precio fiscal (GetAPI)
                      </button>
                      <AnimatePresence>
                        {showFiscalPrices && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="pt-2 space-y-1.5">
                              {editData!.price != null && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] text-slate-400">Promedio fiscal</span>
                                  <span className="text-xs font-semibold text-slate-600">{formatCurrency(editData!.price)}</span>
                                </div>
                              )}
                              {editData!.price_min != null && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] text-slate-400">Banda mínima</span>
                                  <span className="text-xs font-semibold text-slate-600">{formatCurrency(editData!.price_min)}</span>
                                </div>
                              )}
                              {editData!.price_max != null && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] text-slate-400">Banda máxima</span>
                                  <span className="text-xs font-semibold text-slate-600">{formatCurrency(editData!.price_max)}</span>
                                </div>
                              )}
                              {editData!.trade_in_price != null && (
                                <div className="flex justify-between items-center">
                                  <span className="text-[11px] text-slate-400">Retoma</span>
                                  <span className="text-xs font-semibold text-amber-600">{formatCurrency(editData!.trade_in_price)}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <Search className="w-3 h-3 text-slate-300" />
                    <p className="text-[10px] text-slate-400">
                      Datos de Chileautos, Yapo y MercadoLibre
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Fallback: only GetAPI prices, no useful AI data and not loading */}
              {!hasUsefulAppraisal && !isLoadingPrices && hasFiscalPrices && (
                <div className="space-y-2">
                  {editData!.price != null && (
                    <div className="text-center p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                      <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Promedio</p>
                      <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(editData!.price)}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-1.5">
                    {editData!.price_min != null && (
                      <div className="text-center p-2 bg-slate-50 rounded-xl">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Mínimo</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatCurrency(editData!.price_min)}</p>
                      </div>
                    )}
                    {editData!.price_max != null && (
                      <div className="text-center p-2 bg-slate-50 rounded-xl">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide">Máximo</p>
                        <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatCurrency(editData!.price_max)}</p>
                      </div>
                    )}
                  </div>
                  {editData!.trade_in_price != null && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500">Retoma</span>
                      <span className="text-sm font-semibold text-amber-600">{formatCurrency(editData!.trade_in_price)}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 text-center pt-1">Solo referencia</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

    </motion.div>
  );
};

// ===== Price loading steps animation =====

function PriceLoadingSteps() {
  const steps = ['Chileautos', 'Yapo', 'MercadoLibre'];
  return (
    <div className="space-y-1">
      {steps.map((step, i) => (
        <motion.div
          key={step}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 1.5, duration: 0.3 }}
          className="flex items-center gap-2 px-1"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 1.5 + 0.2, duration: 0.2 }}
          >
            <Globe className="w-3 h-3 text-slate-300" />
          </motion.div>
          <span className="text-[10px] text-slate-400">Consultando {step}...</span>
        </motion.div>
      ))}
    </div>
  );
}

// ===== Reusable field components =====

// Agrupa las categorías por tipo de vehículo (Auto / Camión / Maquinaria / Náutico)
// siguiendo el orden lógico de VEHICLE_TYPE_CATEGORIES, en vez de una lista plana
// alfabética. Las que no matchean ningún tipo quedan al final en "Otros".
const CATEGORY_GROUP_ORDER: VehicleType[] = ['car', 'truck', 'machinery', 'nautical'];
function buildCategoryGroups(categories: { id: number; name: string | null }[]) {
  const used = new Set<string>();
  const groups = CATEGORY_GROUP_ORDER.map((type) => {
    const names = VEHICLE_TYPE_CATEGORIES[type] || [];
    const options: { value: string; label: string }[] = [];
    names.forEach((n) => {
      const cat = categories.find(
        (c) => (c.name || '').toLowerCase() === n && !used.has(String(c.id))
      );
      if (cat) {
        used.add(String(cat.id));
        options.push({ value: String(cat.id), label: cat.name || '' });
      }
    });
    return { label: VEHICLE_TYPE_LABELS[type], options };
  }).filter((g) => g.options.length > 0);

  const leftover = categories
    .filter((c) => !used.has(String(c.id)))
    .map((c) => ({ value: String(c.id), label: c.name || '' }));
  if (leftover.length) groups.push({ label: 'Otros', options: leftover });
  return groups;
}

function FieldSelect({ icon: _Icon, label, value, options, groups, onChange, warn, disabled }: {
  icon: React.ElementType; label: string; value: string;
  options?: { value: string; label: string }[];
  groups?: { label: string; options: { value: string; label: string }[] }[];
  onChange: (v: string) => void; warn?: boolean; disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-500">
        {label}
      </label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={cn('h-9 text-sm', warn && 'border-red-300 bg-red-50/50')}>
          <SelectValue placeholder="Selecciona" />
        </SelectTrigger>
        <SelectContent>
          {groups
            ? groups.map((g) => (
                <SelectGroup key={g.label}>
                  <SelectLabel>{g.label}</SelectLabel>
                  {g.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectGroup>
              ))
            : (options ?? []).map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldInput({ icon: _Icon, label, value, onChange, placeholder, readOnly, mono, inputMode }: {
  icon: React.ElementType; label: string; value: string;
  onChange?: (v: string) => void; placeholder?: string;
  readOnly?: boolean; mono?: boolean; inputMode?: 'numeric' | 'text';
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-500">
        {label}
      </label>
      <Input
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        readOnly={readOnly}
        placeholder={placeholder}
        inputMode={inputMode}
        className={cn('h-9 text-sm', mono && 'font-mono', readOnly && 'bg-slate-50')}
      />
    </div>
  );
}

export default GetVehicleInfoByPatent;
