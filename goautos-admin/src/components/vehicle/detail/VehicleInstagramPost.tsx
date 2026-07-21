
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Vehicle } from '@/types/vehicle';
import { format } from 'date-fns';

interface Props {
  vehicle: Vehicle;
  clientId: number;
}

export function VehicleInstagramPost({ vehicle, clientId }: Props) {
  const { t } = useTranslation('common');
  const { data: post, isLoading, error } = useQuery({
    queryKey: ['instagram-post', vehicle.instagram_post_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('instagram-post', {
        body: {
          postId: vehicle.instagram_post_id,
          clientId
        }
      });

      if (error) throw error;
      return data;
    },
    enabled: !!vehicle.instagram_post_id && !!clientId
  });

  if (!vehicle.instagram_post_id) {
    return null;
  }

  if (isLoading) {
    return <div className="animate-pulse h-[300px] bg-gray-100 rounded-lg" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('instagram.vehicleTab.errorLoading')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="mt-8">
      <CardContent className="p-6">
        <div className="flex gap-6">
          <div className="flex-shrink-0">
            {post.media_type === 'VIDEO' ? (
              <video
                src={post.media_url}
                controls
                className="w-[200px] h-[300px] object-cover rounded-lg"
                poster={post.thumbnail_url}
              />
            ) : (
              <img
                src={post.media_url}
                alt={post.caption || 'Instagram post'}
                className="w-[200px] h-[300px] object-cover rounded-lg"
              />
            )}
          </div>

          <div className="flex-1 space-y-4">
            {post.caption && (
              <p className="text-gray-600">{post.caption}</p>
            )}

            <div className="flex justify-between items-center text-sm text-gray-500">
              <div className="flex gap-4">
                <span>{format(new Date(post.timestamp), 'PPP')}</span>
                <span>{post.like_count} {t('instagram.vehicleTab.likes')}</span>
                <span>{post.comments_count} {t('instagram.vehicleTab.comments')}</span>
              </div>
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {t('instagram.vehicleTab.viewOnInstagram')}
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
