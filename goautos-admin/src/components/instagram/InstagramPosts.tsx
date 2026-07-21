import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Instagram, ExternalLink, Heart, MessageCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface InstagramPost {
  id: string;
  media_url: string;
  caption?: string;
  permalink: string;
  timestamp: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  like_count: number;
  comments_count: number;
}

interface InstagramPostsProps {
  integrationId: number;
}

export function InstagramPosts({ integrationId }: InstagramPostsProps) {
  const { t, i18n } = useTranslation('common');
  const {
    data: posts,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['instagram-posts', integrationId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'instagram-posts',
        {
          body: { integrationId },
        }
      );

      if (error) throw error;
      return data.data as InstagramPost[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[14px]">{t('instagram.posts.loadingPosts')}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('instagram.posts.errorLoading')}
        </AlertDescription>
      </Alert>
    );
  }

  if (!posts?.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] text-slate-400">
        <Instagram className="w-8 h-8 mb-2" />
        <p className="text-[14px]">{t('instagram.posts.noPosts')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] overflow-hidden group"
        >
          {/* Media */}
          <div className="relative">
            {post.media_type === 'VIDEO' ? (
              <video
                src={post.media_url}
                controls
                className="w-full aspect-square object-cover"
              />
            ) : (
              <img
                src={post.media_url}
                alt={post.caption || 'Instagram post'}
                className="w-full aspect-square object-cover"
              />
            )}
            {/* Hover overlay with stats */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 pointer-events-none">
              <div className="flex items-center gap-1.5 text-white font-semibold text-[14px]">
                <Heart className="w-5 h-5 fill-white" />
                {(post.like_count || 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-1.5 text-white font-semibold text-[14px]">
                <MessageCircle className="w-5 h-5 fill-white" />
                {(post.comments_count || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4">
            {post.caption && (
              <p className="text-[13px] text-slate-600 leading-relaxed line-clamp-2 mb-3">
                {post.caption}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-[12px] text-slate-400">
                {new Date(post.timestamp).toLocaleDateString(i18n.language === 'es' ? 'es-CL' : 'en-US', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>

              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {t('instagram.posts.viewOnInstagram')}
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
