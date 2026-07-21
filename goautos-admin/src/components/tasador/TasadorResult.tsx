import { Card } from '@/components/ui/card';
import {
  Info,
  Globe,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  SearchX,
} from 'lucide-react';
import type { AppraisalResponse } from '@/types/tasador';
import LoadingSteps from './LoadingSteps';
import SingleVehicleView from './SingleVehicleView';
import ComparisonView from './ComparisonView';

interface TasadorResultProps {
  appraisalData: AppraisalResponse | null;
  isLoading: boolean;
  onRetry?: () => void;
}

const TasadorResult = ({ appraisalData, isLoading, onRetry }: TasadorResultProps) => {
  if (isLoading) {
    return <LoadingSteps />;
  }

  if (!appraisalData) return null;

  const { sources, vehicle_details, appraisal, search_stats } = appraisalData;

  // ── Backend rejected the query (plate, unidentified vehicle) ──
  // Show the specific message returned by the edge function instead
  // of the generic "no listings" copy. Retry would be useless.
  if (sources.length === 0 && search_stats?.rejected && appraisal) {
    const isPlate =
      search_stats.reason === 'license_plate' ||
      search_stats.reason === 'license_plate_unknown';
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
          <Info className="w-8 h-8 text-amber-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isPlate ? 'Esto parece una patente' : 'Necesito más detalles'}
        </h3>
        <p className="text-sm text-gray-600 max-w-lg leading-relaxed whitespace-pre-line">
          {appraisal}
        </p>
      </div>
    );
  }

  // ── No sources found — show retry ──────────────────────────
  if (sources.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
          <SearchX className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No se encontraron publicaciones
        </h3>
        <p className="text-sm text-gray-500 max-w-md mb-6 leading-relaxed">
          No pudimos encontrar publicaciones verificadas para este vehículo en este momento. Esto puede ocurrir por baja disponibilidad en el mercado o por un error temporal.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-primary to-cyan-500 rounded-xl hover:shadow-lg hover:shadow-primary/25 hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar tasación
          </button>
        )}
      </div>
    );
  }

  // ── Structured data path ──────────────────────────────────
  if (sources.length > 0) {
    const isComparison =
      vehicle_details?.isComparison &&
      (vehicle_details.comparisonVehicles?.length ?? 0) >= 2;

    if (isComparison) {
      return <ComparisonView data={appraisalData} />;
    }

    return <SingleVehicleView data={appraisalData} />;
  }

  // ── Fallback: no structured sources ───────────────────────
  // Try to parse informational content (numbered lists with links)
  const parseInformationalContent = (text: string) => {
    const items: {
      number: string;
      title: string;
      description: string;
      source?: { name: string; url: string };
    }[] = [];

    const itemPattern =
      /(\d+)\.\s*\*\*([^*]+)\*\*:\s*([^(\n]+)(?:\(\[([^\]]+)\]\((https?:\/\/[^)]+)\)\))?/g;
    let match;

    while ((match = itemPattern.exec(text)) !== null) {
      items.push({
        number: match[1],
        title: match[2].trim(),
        description: match[3].trim(),
        source:
          match[4] && match[5]
            ? { name: match[4], url: match[5] }
            : undefined,
      });
    }

    const introMatch = text.match(/^([^1-9]*?)(?=\d+\.\s*\*\*)/s);
    const intro = introMatch ? introMatch[1].trim() : '';

    const lastItemIndex = text.lastIndexOf('10.');
    const conclusionMatch =
      lastItemIndex > -1
        ? text.substring(lastItemIndex).match(/\)\)\s*\n\n(.+)$/s)
        : null;
    const conclusion = conclusionMatch ? conclusionMatch[1].trim() : '';

    return { intro, items, conclusion };
  };

  const info = parseInformationalContent(appraisal);

  if (info.items.length > 0) {
    return (
      <div className="mt-8 space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Información del mercado
            </h3>
          </div>
          {info.intro && (
            <p className="text-gray-600 leading-relaxed">{info.intro}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {info.items.map((item, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:border-primary/20 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {item.number}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {item.title}
                  </h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                  {item.source && (
                    <a
                      href={item.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      <Globe className="h-3 w-3" />
                      {item.source.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {info.conclusion && (
          <div className="bg-primary/5 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 leading-relaxed">
                {info.conclusion}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Ultimate fallback: basic markdown rendering
  return (
    <Card className="mt-8 p-8 border border-gray-200/50 shadow-sm bg-white/50 backdrop-blur-sm">
      <div className="prose max-w-none">
        <div className="mb-4 pb-4 border-b border-gray-100">
          <h3 className="text-xl font-semibold text-gray-800">Resultado</h3>
        </div>
        <div
          className="text-gray-700 whitespace-pre-line"
          dangerouslySetInnerHTML={{
            __html: appraisal
              .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
              .replace(
                /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
                '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary hover:text-primary/80 hover:underline">$1</a>',
              ),
          }}
        />
      </div>
    </Card>
  );
};

export default TasadorResult;
