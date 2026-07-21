import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatPrice, formatMileage } from '@/utils/facebookMarketplaceMapper';
import { cn } from '@/lib/utils';

interface VehicleSelectCardProps {
  vehicle: {
    id: number;
    brand_name?: string;
    model_name?: string;
    year?: number;
    price?: number;
    mileage?: number;
    main_image?: string;
    isPublished?: boolean;
    status?: { name: string; color: string };
  };
  isSelected: boolean;
  onSelect: (id: number) => void;
  onPreview: (vehicle: any) => void;
  disabled?: boolean;
}

export const VehicleSelectCard = ({
  vehicle,
  isSelected,
  onSelect,
  onPreview,
  disabled = false,
}: VehicleSelectCardProps) => {
  const handleCardClick = () => {
    onPreview(vehicle);
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && !vehicle.isPublished) {
      onSelect(vehicle.id);
    }
  };

  return (
    <Card
      className={cn(
        'relative cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-blue-500',
        (disabled || vehicle.isPublished) && 'opacity-60',
      )}
      onClick={handleCardClick}
    >
      {/* Checkbox overlay */}
      <div
        className="absolute top-3 left-3 z-10"
        onClick={handleCheckboxClick}
      >
        <Checkbox
          checked={isSelected}
          disabled={disabled || vehicle.isPublished}
          className={cn(
            "h-5 w-5 bg-white border-2",
            !disabled && !vehicle.isPublished && "cursor-pointer"
          )}
        />
      </div>

      {/* Status / Published badge */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-end">
        {vehicle.isPublished && (
          <Badge variant="secondary" className="bg-green-500 text-white text-[10px] shadow-sm">
            Publicado
          </Badge>
        )}
        {vehicle.status && (
          <Badge
            variant="secondary"
            className="text-[10px] font-semibold shadow-sm border"
            style={{
              backgroundColor: vehicle.status.color || '#6b7280',
              color: '#fff',
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            {vehicle.status.name}
          </Badge>
        )}
      </div>

      {/* Vehicle image */}
      <div className="aspect-[4/3] overflow-hidden rounded-t-lg bg-gray-100">
        {vehicle.main_image ? (
          <img
            src={vehicle.main_image}
            alt={`${vehicle.brand_name} ${vehicle.model_name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        {/* Title */}
        <h3 className="font-medium text-sm truncate">
          {[vehicle.year, vehicle.brand_name, vehicle.model_name, vehicle.version_name].filter(Boolean).join(' ')}
        </h3>

        {/* Details */}
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>{formatMileage(vehicle.mileage)}</span>
          <span className="font-semibold text-gray-900">
            {formatPrice(vehicle.price)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
