import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ExternalLink,
  MoreVertical,
  Pause,
  Play,
  Trash2,
  Loader2,
  Store,
} from 'lucide-react';
import { FbMarketplacePost } from '@/types/facebookMarketplace';
import { formatPrice, formatMileage, getStatusColor, getStatusLabel } from '@/utils/facebookMarketplaceMapper';

interface FbMarketplacePublicationsGridProps {
  publications: FbMarketplacePost[];
  isLoading?: boolean;
  onPause: (postId: number) => void;
  onActivate: (postId: number) => void;
  onDelete: (postId: number) => void;
  isUpdating?: boolean;
}

export const FbMarketplacePublicationsGrid = ({
  publications,
  isLoading,
  onPause,
  onActivate,
  onDelete,
  isUpdating,
}: FbMarketplacePublicationsGridProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!publications || publications.length === 0) {
    return (
      <div className="text-center py-12">
        <Store className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Sin publicaciones
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Aún no has publicado vehículos en Facebook Marketplace.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {publications.map((post) => (
        <Card key={post.id} className="overflow-hidden">
          {/* Vehicle image */}
          <div className="aspect-[4/3] overflow-hidden bg-gray-100 relative">
            {post.vehicle?.main_image ? (
              <img
                src={post.vehicle.main_image}
                alt={post.title || 'Vehículo'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Store className="h-12 w-12" />
              </div>
            )}

            {/* Status badge */}
            <div className="absolute top-2 left-2">
              <Badge className={getStatusColor(post.status)}>
                {getStatusLabel(post.status)}
              </Badge>
            </div>

            {/* Actions dropdown */}
            <div className="absolute top-2 right-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-white/90 hover:bg-white"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreVertical className="h-4 w-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {post.fb_product_url && (
                    <DropdownMenuItem asChild>
                      <a
                        href={post.fb_product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver en Facebook
                      </a>
                    </DropdownMenuItem>
                  )}

                  {post.status === 'active' && (
                    <DropdownMenuItem
                      onClick={() => onPause(post.id)}
                      className="flex items-center gap-2"
                    >
                      <Pause className="h-4 w-4" />
                      Pausar
                    </DropdownMenuItem>
                  )}

                  {post.status === 'paused' && (
                    <DropdownMenuItem
                      onClick={() => onActivate(post.id)}
                      className="flex items-center gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Activar
                    </DropdownMenuItem>
                  )}

                  {post.status !== 'deleted' && (
                    <DropdownMenuItem
                      onClick={() => onDelete(post.id)}
                      className="flex items-center gap-2 text-red-600 focus:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <CardContent className="p-3">
            {/* Title */}
            <h3 className="font-medium text-sm truncate">
              {post.title || `${post.vehicle?.year} ${post.vehicle?.brand?.name} ${post.vehicle?.model?.name}`}
            </h3>

            {/* Details */}
            <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
              <span>{formatMileage(post.vehicle?.mileage)}</span>
              <span className="font-semibold text-gray-900">
                {formatPrice(post.price)}
              </span>
            </div>

            {/* Sync error */}
            {post.sync_error && (
              <p className="mt-2 text-xs text-red-500 truncate" title={post.sync_error}>
                Error: {post.sync_error}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
