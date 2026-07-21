import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SourceGroup } from '@/types/tasador';
import { getSourceIcon } from './utils';
import ListingCard from './ListingCard';

interface SourceCardProps {
  group: SourceGroup;
  initialVisible?: number;
}

const SourceCard = ({ group, initialVisible = 3 }: SourceCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = getSourceIcon(group.name);
  const visibleListings = expanded
    ? group.listings
    : group.listings.slice(0, initialVisible);
  const remaining = group.listings.length - initialVisible;

  return (
    <div
      className={`rounded-2xl border overflow-hidden ${group.color.border} ${group.color.bg}`}
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${group.color.badge}`}
          >
            <Icon className={`h-4 w-4 ${group.color.icon}`} />
          </div>
          <span className={`font-medium ${group.color.text}`}>
            {group.name}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {group.listings.length} publicaciones
        </span>
      </div>

      {/* Listings */}
      <div className="px-4 pb-4 space-y-2">
        {visibleListings.map((listing, idx) => (
          <ListingCard key={idx} listing={listing} />
        ))}

        {remaining > 0 && !expanded && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 hover:text-primary rounded-xl hover:bg-white/80 transition-colors"
          >
            Ver {remaining} más
            <ChevronDown className="h-4 w-4" />
          </button>
        )}

        {expanded && remaining > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-500 hover:text-primary rounded-xl hover:bg-white/80 transition-colors"
          >
            Ver menos
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SourceCard;
