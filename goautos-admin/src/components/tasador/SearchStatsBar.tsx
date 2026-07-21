import { Database, AlertTriangle } from 'lucide-react';
import type { SearchStats } from '@/types/tasador';

interface SearchStatsBarProps {
  stats: SearchStats;
}

const SearchStatsBar = ({ stats }: SearchStatsBarProps) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-600">
        <Database className="w-3.5 h-3.5 text-gray-400" />
        <span>
          <span className="font-semibold">{stats.sourcesAfterDedup}</span>{' '}
          publicaciones de{' '}
          <span className="font-semibold">{stats.distinctSites}</span> fuentes
        </span>
      </div>

      {stats.failed > 0 && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>
            {stats.failed} de {stats.totalGroups} búsquedas no respondieron
          </span>
        </div>
      )}
    </div>
  );
};

export default SearchStatsBar;
