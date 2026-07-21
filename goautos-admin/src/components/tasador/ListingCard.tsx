import { ExternalLink } from 'lucide-react';
import type { TasadorSource } from '@/types/tasador';
import { formatPrice, getSourceColor } from './utils';

interface ListingCardProps {
  listing: TasadorSource;
  showSource?: boolean;
}

const ListingCard = ({ listing, showSource = false }: ListingCardProps) => {
  const mileageDisplay =
    listing.mileage && listing.mileage > 0
      ? `${listing.mileage.toLocaleString('es-CL')} km`
      : 'Sin uso';

  const color = showSource ? getSourceColor(listing.source) : null;

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-primary/5 transition-colors group"
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="min-w-0">
          <p className="font-medium text-gray-900 text-sm truncate">
            {listing.vehicle}
            {listing.year && (
              <span className="text-gray-400 font-normal ml-1">
                {listing.year}
              </span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {listing.version && (
              <>
                <span className="text-xs text-gray-400">
                  {listing.version}
                </span>
                <span className="text-xs text-gray-300">·</span>
              </>
            )}
            <span className="text-xs text-gray-400">{mileageDisplay}</span>
            {showSource && color && (
              <>
                <span className="text-xs text-gray-300">·</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${color.badge}`}
                >
                  {listing.source}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className="font-semibold text-gray-900">
          {formatPrice(listing.price)}
        </span>
        <div className="p-2 rounded-lg text-gray-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
          <ExternalLink className="h-4 w-4" />
        </div>
      </div>
    </a>
  );
};

export default ListingCard;
