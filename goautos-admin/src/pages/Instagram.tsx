import DashboardLayout from '@/components/DashboardLayout';
import { InstagramPosts } from '@/components/instagram/InstagramPosts';
import { InstagramVehicleGrid } from '@/components/instagram/InstagramVehicleGrid';
import { IntegrationHeader } from '@/components/integrations/IntegrationHeader';
import { IntegrationTermsDialog } from '@/components/integrations/IntegrationTermsDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { INSTAGRAM_APP_ID } from '@/config/env';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import posthog from '@/utils/posthog';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Info, Instagram as InstagramIcon, Upload, LayoutGrid, Users, Trash2, BadgeCheck, User, Image, BarChart3, Shield, ArrowRight, CheckCircle2, Sparkles, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';

type InstagramIntegration = {
  id: number;
  client_id: number;
  ig_account_id: string;
  username: string | null;
  access_token: string;
  created_at: string;
  followers_count: number;
  profile_picture_url: string | null;
  biography: string | null;
  name: string | null;
  account_type: string | null;
};

const instagramConfig = {
  gradientFrom: 'from-purple-600',
  gradientTo: 'to-pink-600',
};

const InstagramPage = () => {
  const { t } = useTranslation('common');
  const { clientId } = useAuth();
  const [location, navigate] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('publish');
  const [showTermsDialog, setShowTermsDialog] = useState(false);

  const {
    data: instagramIntegrations,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['instagram-integrations', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_integrations')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;
      return (data as InstagramIntegration[]) || [];
    },
    enabled: !!clientId,
  });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const code = query.get('code');
    const errorMessage = query.get('error_description');

    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
      navigate('/instagram', { replace: true });
      return;
    }

    if (code && !isProcessing) {
      setIsProcessing(true);
      setError(null);
      handleInstagramCallback(code);
    }
  }, []);

  const handleInstagramCallback = async (code: string) => {
    try {
      console.log('Processing Instagram callback with code');
      const { data, error } = await supabase.functions.invoke(
        'instagram-auth',
        {
          body: { code, clientId },
        }
      );

      if (error) {
        console.error('Error from edge function:', error);
        let errorMessage = 'No se pudo conectar con Instagram. Intenta de nuevo.';
        try {
          // Try json first, then text as fallback
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const errorBody = await ctx.json();
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
          }
        } catch {
          try {
            const ctx = (error as any).context;
            if (ctx && typeof ctx.text === 'function') {
              const text = await ctx.text();
              const parsed = JSON.parse(text);
              if (parsed?.error) errorMessage = parsed.error;
            }
          } catch {
            // Could not parse error body, use default message
          }
        }
        throw new Error(errorMessage);
      }

      if (data?.error) {
        console.error('API error:', data.error, data.details);
        throw new Error(data.error);
      }

      posthog.capture({
        distinctId: String(clientId),
        event: 'instagram_connected',
        properties: {},
      });

      toast({
        title: t('instagram.toasts.connectSuccess.title'),
        description: t('instagram.toasts.connectSuccess.description'),
      });

      navigate('/instagram', { replace: true });

      refetch();
    } catch (error: any) {
      console.error('Error connecting Instagram account:', error);
      const msg = error?.message || t('instagram.errors.connectFailed');
      const isNeedsHelp = msg.includes('WhatsApp');
      setError(msg);
      toast({
        title: isNeedsHelp
          ? t('instagram.toasts.connectNeedsHelp.title')
          : t('instagram.toasts.connectError.title'),
        description: msg.length > 120 ? msg.slice(0, 120) + '...' : msg,
        variant: isNeedsHelp ? 'default' : 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteIntegration = async (id: number) => {
    try {
      const { error } = await supabase
        .from('instagram_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      posthog.capture({
        distinctId: String(clientId),
        event: 'instagram_disconnected',
        properties: {},
      });

      toast({
        title: t('instagram.toasts.disconnectSuccess.title'),
        description: t('instagram.toasts.disconnectSuccess.description'),
      });

      refetch();
    } catch (error) {
      console.error('Error deleting Instagram integration:', error);
      toast({
        title: t('instagram.toasts.disconnectError.title'),
        description: t('instagram.toasts.disconnectError.description'),
        variant: 'destructive',
      });
    }
  };

  const handleConnectClick = () => {
    setShowTermsDialog(true);
  };

  const handleConnect = () => {
    setShowTermsDialog(false);
    const redirectUri = 'https://portal.goauto.cl/instagram';
    // Instagram Business Login scopes
    const scopes = [
      'instagram_business_basic',
      'instagram_business_content_publish',
    ].join(',');

    // Instagram Business Login OAuth URL
    const authUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&client_id=${INSTAGRAM_APP_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(scopes)}`;

    window.location.href = authUrl;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className='p-6 max-w-7xl mx-auto'>
          <div className='flex items-center justify-center min-h-[50vh]'>
            <div className='animate-pulse text-gray-400'>{t('instagram.loading')}</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const hasIntegration = instagramIntegrations && instagramIntegrations.length > 0;

  return (
    <DashboardLayout>
      <div className='p-6 max-w-7xl mx-auto'>
        <IntegrationHeader
          title={t('instagram.header.title')}
          description={t('instagram.header.description')}
          icon={InstagramIcon}
          gradientFrom={instagramConfig.gradientFrom}
          gradientTo={instagramConfig.gradientTo}
        />

        {error && (
          error.includes('WhatsApp') ? (
            <Alert className='mt-4 mb-6 border-blue-200 bg-blue-50 text-blue-900 [&>svg]:text-blue-600'>
              <Info className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Alert variant='destructive' className='mt-4 mb-6'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )
        )}

        {hasIntegration ? (
          <div className='space-y-6'>
            {/* Profile cards - connected state */}
            {instagramIntegrations.map((ig) => (
              <div
                key={ig.id}
                className="rounded-2xl border border-slate-200/60 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] overflow-hidden"
              >
                {/* Gradient banner */}
                <div className="h-20 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 relative">
                  <div className="absolute -bottom-8 left-6">
                    {ig.profile_picture_url ? (
                      <img
                        src={ig.profile_picture_url}
                        alt={ig.username || ''}
                        className="w-16 h-16 rounded-2xl border-4 border-white shadow-md object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl border-4 border-white shadow-md bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <InstagramIcon className="w-7 h-7 text-white" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile info */}
                <div className="pt-12 px-6 pb-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {ig.name || ig.username || 'Instagram Account'}
                        </h3>
                        {ig.account_type && (
                          <Badge className="text-[10px] bg-blue-50 text-blue-700 border-0 gap-1">
                            <BadgeCheck className="w-3 h-3" />
                            {ig.account_type === 'BUSINESS' ? t('instagram.card.business') : t('instagram.card.creator')}
                          </Badge>
                        )}
                      </div>
                      {ig.username && (
                        <p className="text-[14px] text-slate-500 mt-0.5">@{ig.username}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
                      onClick={() => handleDeleteIntegration(ig.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('instagram.page.disconnect')}
                    </Button>
                  </div>

                  {/* Bio */}
                  {ig.biography && (
                    <p className="text-[13px] text-slate-600 leading-relaxed mb-4 max-w-xl">
                      {ig.biography}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-6 pb-1">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="text-[14px] font-semibold text-slate-900">
                        {(ig.followers_count || 0).toLocaleString()}
                      </span>
                      <span className="text-[13px] text-slate-500">{t('instagram.page.followers')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-[13px] text-slate-500">ID:</span>
                      <span className="text-[13px] font-mono text-slate-600">{ig.ig_account_id}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Tabs: Publicar / Publicaciones */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value='publish' className='flex items-center gap-2'>
                  <Upload className='h-4 w-4' />
                  {t('instagram.page.tabPublish')}
                </TabsTrigger>
                <TabsTrigger value='posts' className='flex items-center gap-2'>
                  <LayoutGrid className='h-4 w-4' />
                  {t('instagram.page.tabPosts')}
                </TabsTrigger>
              </TabsList>

              {/* Publish tab - Vehicle grid */}
              <TabsContent value='publish' className='mt-4'>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('instagram.page.selectVehicleTitle')}</CardTitle>
                    <CardDescription>
                      {t('instagram.page.selectVehicleDesc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InstagramVehicleGrid />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Posts tab - Existing posts */}
              <TabsContent value='posts' className='mt-4'>
                {instagramIntegrations.map((integration) => (
                  <div key={`posts-${integration.id}`} className='mb-8'>
                    <div className='flex items-center space-x-2 mb-6'>
                      <InstagramIcon className='w-5 h-5 text-purple-600' />
                      <h2 className='text-xl font-semibold'>
                        {t('instagram.posts.title', { username: integration.username || integration.ig_account_id })}
                      </h2>
                    </div>
                    <InstagramPosts integrationId={integration.id} />
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Hero section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-8 sm:p-12">
              {/* Decorative blurs */}
              <div className="absolute top-[-80px] right-[-60px] w-[250px] h-[250px] rounded-full bg-white/10 blur-[80px] pointer-events-none" />
              <div className="absolute bottom-[-60px] left-[-40px] w-[200px] h-[200px] rounded-full bg-purple-400/20 blur-[60px] pointer-events-none" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-[12px] font-medium mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('instagram.page.officialIntegration')}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
                    {t('instagram.page.heroTitle')}
                  </h2>
                  <p className="text-[15px] text-white/80 leading-relaxed mb-6">
                    {t('instagram.page.heroDesc')}
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Button
                      onClick={handleConnectClick}
                      disabled={isProcessing}
                      size="lg"
                      className="bg-white text-purple-700 hover:bg-white/90 font-semibold shadow-lg shadow-purple-900/20 h-12 px-6 text-[15px]"
                    >
                      <InstagramIcon className="w-5 h-5 mr-2" />
                      {isProcessing ? t('instagram.page.connecting') : t('instagram.page.connectInstagram')}
                      {!isProcessing && <ArrowRight className="w-4 h-4 ml-2" />}
                    </Button>
                    <span className="text-[12px] text-white/60 flex items-center gap-1.5">
                      <Shield className="w-3 h-3" />
                      {t('instagram.page.secureConnection')}
                    </span>
                  </div>
                </div>

                {/* Mock Instagram post preview */}
                <div className="hidden lg:block w-[280px] shrink-0">
                  <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 shadow-2xl">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                      <div>
                        <div className="h-2.5 w-20 rounded-full bg-white/40" />
                        <div className="h-2 w-14 rounded-full bg-white/20 mt-1" />
                      </div>
                    </div>
                    <div className="aspect-square rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-3">
                      <Image className="w-10 h-10 text-white/30" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-white/20" />
                      <div className="h-2 w-3/4 rounded-full bg-white/15" />
                      <div className="h-2 w-1/2 rounded-full bg-white/10" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: Upload,
                  iconBg: 'bg-purple-50',
                  iconColor: 'text-purple-600',
                  title: t('instagram.page.featurePublishTitle'),
                  desc: t('instagram.page.featurePublishDesc'),
                },
                {
                  icon: LayoutGrid,
                  iconBg: 'bg-pink-50',
                  iconColor: 'text-pink-600',
                  title: t('instagram.page.featureManageTitle'),
                  desc: t('instagram.page.featureManageDesc'),
                },
                {
                  icon: BarChart3,
                  iconBg: 'bg-orange-50',
                  iconColor: 'text-orange-600',
                  title: t('instagram.page.featureProfileTitle'),
                  desc: t('instagram.page.featureProfileDesc'),
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.1)] transition-shadow"
                >
                  <div className={`w-10 h-10 rounded-xl ${feature.iconBg} flex items-center justify-center mb-3`}>
                    <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                  </div>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-1">{feature.title}</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* How it works + Requirements */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* How it works */}
              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]">
                <h3 className="text-[16px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Eye className="w-4.5 h-4.5 text-slate-400" />
                  {t('instagram.page.howItWorks')}
                </h3>
                <div className="space-y-4">
                  {[
                    { step: '1', text: t('instagram.page.step1') },
                    { step: '2', text: t('instagram.page.step2') },
                    { step: '3', text: t('instagram.page.step3') },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-[12px] font-bold shrink-0">
                        {item.step}
                      </div>
                      <p className="text-[14px] text-slate-600 leading-relaxed pt-0.5">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)]">
                <h3 className="text-[16px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                  {t('instagram.page.requirements')}
                </h3>
                <div className="space-y-3">
                  {[
                    t('instagram.page.req1'),
                    t('instagram.page.req2'),
                    t('instagram.page.req3'),
                  ].map((req) => (
                    <div key={req} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <p className="text-[14px] text-slate-600">{req}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <p className="text-[12px] text-slate-400 flex items-center gap-1.5">
                    <Shield className="w-3 h-3" />
                    {t('instagram.page.privacyNote')}{' '}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-medium">
                      {t('instagram.page.privacyPolicy')}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <IntegrationTermsDialog
        open={showTermsDialog}
        onOpenChange={setShowTermsDialog}
        onAccept={handleConnect}
        integrationType="instagram"
      />
    </DashboardLayout>
  );
};

export default InstagramPage;
