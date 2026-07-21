import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LuArrowLeft, LuClock, LuCalendar, LuUser, LuTag, LuSparkles, LuBookOpen, LuCode2 } from 'react-icons/lu';
import { getUpdateBySlug, UpdateWithAuthor } from '@/services/updatesService';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Helper function to parse gradient
const parseGradient = (gradient?: string) => {
  if (!gradient) return { type: 'class', value: 'from-blue-600 to-slate-900' };

  // Check if it's a custom gradient with hex colors
  const hexPattern = /from-\[(#[0-9a-fA-F]{6})\]\s+to-\[(#[0-9a-fA-F]{6})\]/;
  const match = gradient.match(hexPattern);

  if (match) {
    return {
      type: 'inline',
      value: `linear-gradient(to right, ${match[1]}, ${match[2]})`
    };
  }

  return { type: 'class', value: gradient };
};

const UpdateDetail = () => {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [update, setUpdate] = useState<UpdateWithAuthor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.slug) {
      loadUpdate(params.slug);
    }
  }, [params.slug]);

  const loadUpdate = async (slug: string) => {
    setLoading(true);
    try {
      const data = await getUpdateBySlug(slug);
      if (data) {
        setUpdate(data);
      } else {
        navigate('/novedades');
      }
    } catch (error) {
      console.error('Error loading update:', error);
      navigate('/novedades');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
            <p className="mt-6 text-slate-600 font-medium">Cargando novedad...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!update) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <LuBookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">Novedad no encontrada</p>
            <Button onClick={() => navigate('/novedades')} className="mt-6">
              <LuArrowLeft className="w-4 h-4 mr-2" />
              Volver a Novedades
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getTypeLabel = (type: string) => {
    const labels = {
      tutorial: 'Tutorial',
      feature: 'Feature',
      changelog: 'Changelog',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const gradientConfig = parseGradient(update.gradient);

  return (
    <DashboardLayout>
      <div>
        {/* Hero Section */}
        <div
          className={cn("relative overflow-hidden", gradientConfig.type === 'class' && 'bg-gradient-to-br')}
          style={gradientConfig.type === 'inline' ? { background: gradientConfig.value } : undefined}
        >
          {gradientConfig.type === 'class' && (
            <div className={cn("absolute inset-0 bg-gradient-to-br", gradientConfig.value)} />
          )}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 py-8 lg:py-12">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/novedades')}
              className="text-white/80 hover:text-white hover:bg-white/10 mb-4 text-xs -ml-2"
            >
              <LuArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Volver a Novedades
            </Button>

            <div className="space-y-3 max-w-3xl">
              {/* Type and Version Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-2 py-0.5 text-[11px] font-semibold">
                  {getTypeLabel(update.type)}
                </Badge>
                {update.version && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm font-mono px-2 py-0.5 text-[11px]">
                    {update.version}
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-[1.15]">
                {update.title}
              </h1>

              {/* Excerpt */}
              <p className="text-sm text-white/80 leading-relaxed max-w-2xl">
                {update.excerpt}
              </p>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-white/70 text-xs">
                {update.author_name && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[9px] font-bold">
                      {update.author_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <span className="font-medium">{update.author_name}</span>
                  </div>
                )}
                {update.published_at && (
                  <div className="flex items-center gap-1">
                    <LuCalendar className="w-3 h-3" />
                    <span>{new Date(update.published_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}</span>
                  </div>
                )}
                {update.read_time && (
                  <div className="flex items-center gap-1">
                    <LuClock className="w-3 h-3" />
                    <span>{update.read_time}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {update.tags && update.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {update.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-white/10 text-white/70 text-[10px] font-medium rounded-full border border-white/15"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto px-6 -mt-6 relative z-20">
          {/* Featured Image Card */}
          {update.image_url && (
            <div className="mb-8 rounded-2xl overflow-hidden ring-1 ring-slate-900/5 bg-white">
              <img
                src={update.image_url}
                alt={update.title}
                className="w-full h-auto object-cover"
              />
            </div>
          )}

          {/* Main Content Card */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-900/5 overflow-hidden">
            {/* Video */}
            {update.video_url && (
              <div className="aspect-video bg-slate-900">
                <iframe
                  src={update.video_url.replace('watch?v=', 'embed/')}
                  title={update.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}

            {/* Markdown Content - Atractivo y Balanceado */}
            {update.content_markdown && (
              <article className="px-6 md:px-10 lg:px-14 py-10 max-w-none
                [&>*]:max-w-3xl [&>*]:mx-auto

                /* H1 */
                [&>h1]:text-2xl [&>h1]:md:text-3xl [&>h1]:font-bold [&>h1]:text-slate-800
                [&>h1]:leading-tight [&>h1]:tracking-tight
                [&>h1]:mb-4 [&>h1]:mt-0

                /* H2 */
                [&>h2]:text-xl [&>h2]:md:text-2xl [&>h2]:font-bold [&>h2]:text-slate-800
                [&>h2]:leading-tight [&>h2]:tracking-tight
                [&>h2]:mt-10 [&>h2]:mb-3
                [&>h2]:pb-2 [&>h2]:border-b-2 [&>h2]:border-sky-200

                /* H3 */
                [&>h3]:text-lg [&>h3]:md:text-xl [&>h3]:font-semibold [&>h3]:text-slate-700
                [&>h3]:leading-snug
                [&>h3]:mt-8 [&>h3]:mb-2

                /* H4 */
                [&>h4]:text-base [&>h4]:md:text-lg [&>h4]:font-semibold [&>h4]:text-slate-700
                [&>h4]:leading-snug [&>h4]:mt-6 [&>h4]:mb-2

                /* P */
                [&>p]:text-sm [&>p]:md:text-base [&>p]:leading-relaxed [&>p]:text-slate-600
                [&>p]:mb-4 [&>p]:mt-0

                /* LINKS */
                [&_a]:text-sky-600 [&_a]:font-medium [&_a]:no-underline
                [&_a:hover]:text-sky-700 [&_a:hover]:underline

                /* STRONG */
                [&_strong]:text-slate-800 [&_strong]:font-semibold

                /* UL */
                [&>ul]:my-5 [&>ul]:space-y-2 [&>ul]:pl-0
                [&>ul>li]:text-sm [&>ul>li]:md:text-base [&>ul>li]:leading-relaxed [&>ul>li]:text-slate-600
                [&>ul>li]:pl-5 [&>ul>li]:relative
                [&>ul>li:before]:content-[''] [&>ul>li:before]:absolute [&>ul>li:before]:left-0
                [&>ul>li:before]:top-[0.6em] [&>ul>li:before]:w-1.5 [&>ul>li:before]:h-1.5
                [&>ul>li:before]:rounded-full [&>ul>li:before]:bg-sky-400

                /* OL */
                [&>ol]:my-5 [&>ol]:space-y-2
                [&>ol]:list-decimal [&>ol]:list-outside
                [&>ol]:pl-5
                [&>ol]:marker:text-sky-500 [&>ol]:marker:font-semibold [&>ol]:marker:text-sm
                [&>ol>li]:text-sm [&>ol>li]:md:text-base [&>ol>li]:leading-relaxed [&>ol>li]:text-slate-600
                [&>ol>li]:pl-1

                /* BLOCKQUOTES */
                [&>blockquote]:border-l-[3px] [&>blockquote]:border-sky-400
                [&>blockquote]:bg-sky-50/50
                [&>blockquote]:px-4 [&>blockquote]:py-3 [&>blockquote]:rounded-r-xl
                [&>blockquote]:my-5
                [&>blockquote]:text-slate-600 [&>blockquote]:text-sm [&>blockquote]:md:text-base
                [&>blockquote]:not-italic [&>blockquote]:leading-relaxed

                /* INLINE CODE */
                [&_code]:text-pink-600 [&_code]:bg-pink-50
                [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded
                [&_code]:font-mono [&_code]:text-sm [&_code]:font-medium

                /* CODE BLOCKS */
                [&>pre]:bg-slate-900 [&>pre]:text-slate-100
                [&>pre]:rounded-xl [&>pre]:my-6 [&>pre]:p-4
                [&>pre]:ring-1 [&>pre]:ring-slate-700
                [&>pre]:text-sm [&>pre]:leading-relaxed [&>pre]:overflow-x-auto

                /* IMAGES */
                [&>img]:rounded-xl [&>img]:my-6
                [&>img]:ring-1 [&>img]:ring-slate-200

                /* HR */
                [&>hr]:my-10 [&>hr]:border-0 [&>hr]:h-px
                [&>hr]:bg-slate-200

                /* TABLES */
                [&>table]:my-6 [&>table]:text-sm [&>table]:border-collapse [&>table]:w-full
                [&>table]:rounded-lg [&>table]:overflow-hidden
                [&_thead]:bg-slate-50
                [&_th]:px-4 [&_th]:py-2 [&_th]:text-slate-700 [&_th]:font-semibold [&_th]:text-left
                [&_td]:px-4 [&_td]:py-2 [&_td]:text-slate-600 [&_td]:border-b [&_td]:border-slate-100
                [&_tbody_tr:hover]:bg-sky-50/50 [&_tbody_tr]:transition-colors
                [&_tbody_tr:last-child_td]:border-b-0
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {update.content_markdown}
                </ReactMarkdown>
              </article>
            )}

            {/* Author Card Inside Content */}
            {update.author_name && (
              <div className="mx-6 md:mx-10 lg:mx-14 mb-6 pt-4 pb-2 border-t border-slate-100 flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shrink-0">
                  {update.author_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span className="text-xs text-slate-400">Escrito por</span>
                <span className="text-xs font-semibold text-slate-600">{update.author_name}</span>
              </div>
            )}
          </div>

          {/* Call to Action */}
          <div className="mt-6 mb-10 text-center">
            <Button
              variant="outline"
              onClick={() => navigate('/novedades')}
              className="text-sm"
            >
              <LuArrowLeft className="w-3.5 h-3.5 mr-1.5" />
              Ver todas las novedades
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UpdateDetail;
