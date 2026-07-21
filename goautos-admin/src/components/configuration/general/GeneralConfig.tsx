import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGeneralConfig } from './useGeneralConfig';
import { useAuth } from '@/contexts/AuthContext';
import { uploadFile } from '@/utils/storage';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import LottieImport from 'lottie-react';
const Lottie = (typeof LottieImport === 'object' && 'default' in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from '@/assets/ai-animation.json';
import { supabase } from '@/integrations/supabase/client';

import LanguageSelector from '@/components/sidebar/LanguageSelector';
import SubscriptionSettings from '@/components/configuration/subscription/SubscriptionSettings';
import CustomDomainSettings from '@/components/configuration/general/CustomDomainSettings';
import posthog from '@/utils/posthog';

const GeneralConfig = () => {
  const { t } = useTranslation('common');
  const { clientId, userId } = useAuth();
  const { form, isLoading, loadInitialData, saveConfig } =
    useGeneralConfig(clientId);

  // Helper function to safely get field value for inputs
  const getFieldValue = (value: any, defaultValue: string = '') => {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    return value;
  };

  const [isUploadingLightLogo, setIsUploadingLightLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [selectedTab, setSelectedTab] = useState('basic');
  const [indicatorStyle, setIndicatorStyle] = useState({
    left: '0px',
    width: '0px',
  });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleGenerateSeo = async () => {
    if (!clientId) return;
    setIsGeneratingSeo(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-seo', {
        body: { client_id: clientId },
      });
      if (error) throw error;
      if (data?.success && data?.seo) {
        form.setValue('metaTitle', data.seo.title || '');
        form.setValue('description', data.seo.description || '');
        form.setValue('keywords', Array.isArray(data.seo.keywords) ? data.seo.keywords.join(', ') : '');
        toast.success('SEO generado con IA', {
          description: `Basado en ${data.context?.totalVehicles || 0} vehículos en stock`,
        });
      } else {
        toast.error('Error al generar SEO', { description: data?.error || 'Respuesta inválida' });
      }
    } catch (err: any) {
      toast.error('No se pudo generar el SEO con IA. Intenta de nuevo.');
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadInitialData();
    }
  }, [clientId, loadInitialData]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeTab = tabRefs.current.find(
        (ref) => ref?.getAttribute('data-value') === selectedTab
      );
      if (activeTab) {
        setIndicatorStyle({
          left: `${activeTab.offsetLeft}px`,
          width: `${activeTab.offsetWidth}px`,
        });
      }
    };

    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [selectedTab]);

  const onSubmit = async (data: any) => {
    await saveConfig(data);
    posthog.capture({
      distinctId: userId || 'anonymous',
      event: 'settings_saved',
      properties: { section: 'general' },
    });
  };

  const onFormError = (errors: any) => {
    const firstError = Object.values(errors)[0] as any;
    if (firstError?.message) {
      toast.error(firstError.message);
    }
  };

  const handleFileUpload = async (
    file: File,
    fieldName: 'lightModeLogo' | 'favicon',
    setUploadingState: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (!file) return;

    setUploadingState(true);
    try {
      let path = 'logos/';
      if (fieldName === 'favicon') {
        path = 'favicons/';
      }
      const publicUrl = await uploadFile(file, 'production', path);
      form.setValue(fieldName, { type: 'url', value: publicUrl });
      await form.trigger(fieldName);
      toast.success('Archivo subido exitosamente!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al subir el archivo.'
      );
    } finally {
      setUploadingState(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onFormError)} className='space-y-8'>
        <div className='relative mt-2 overflow-x-auto' style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <div className='flex items-end min-w-max'>
          <div
            className='absolute h-[2px] bg-slate-800 rounded-full z-10 transition-all duration-300'
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              bottom: 0,
            }}
          />
          <button
            ref={(el) => (tabRefs.current[0] = el)}
            onClick={() => setSelectedTab('basic')}
            data-value='basic'
            type='button'
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-[13px] sm:text-[14px] font-medium transition-colors duration-200 relative z-20 mb-3 whitespace-nowrap
              ${
                selectedTab === 'basic' ? 'text-slate-800 font-medium' : 'text-gray-500'
              }`}
            style={{ background: 'transparent' }}
          >
            General
          </button>
          <button
            ref={(el) => (tabRefs.current[7] = el)}
            onClick={() => setSelectedTab('website')}
            data-value='website'
            type='button'
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-[13px] sm:text-[14px] font-medium transition-colors duration-200 relative z-20 mb-3 whitespace-nowrap
              ${
                selectedTab === 'website' ? 'text-slate-800 font-medium' : 'text-gray-500'
              }`}
            style={{ background: 'transparent' }}
          >
            Sitio Web
          </button>
          <button
            ref={(el) => (tabRefs.current[3] = el)}
            onClick={() => setSelectedTab('contact')}
            data-value='contact'
            type='button'
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-[13px] sm:text-[14px] font-medium transition-colors duration-200 relative z-20 mb-3 whitespace-nowrap
              ${
                selectedTab === 'contact' ? 'text-slate-800 font-medium' : 'text-gray-500'
              }`}
            style={{ background: 'transparent' }}
          >
            {t('configuration.general.tabs.contact')}
          </button>
          <button
            ref={(el) => (tabRefs.current[5] = el)}
            onClick={() => setSelectedTab('subscription')}
            data-value='subscription'
            type='button'
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 text-[13px] sm:text-[14px] font-medium transition-colors duration-200 relative z-20 mb-3 whitespace-nowrap
              ${
                selectedTab === 'subscription' ? 'text-slate-800 font-medium' : 'text-gray-500'
              }`}
            style={{ background: 'transparent' }}
          >
            {t('configuration.general.tabs.subscription')}
          </button>
          </div>
        </div>

        {selectedTab === 'basic' && (
          <Card className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
            <CardContent className='space-y-4 pt-6'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('configuration.general.labels.dealershipName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t(
                          'configuration.general.placeholders.dealershipName'
                        )}
                        {...field}
                        value={getFieldValue(field.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='border-t border-slate-100 pt-4'>
                <FormLabel className='mb-2 block'>Idioma de la aplicación</FormLabel>
                <LanguageSelector collapsed={false} />
                <p className='text-xs text-muted-foreground mt-3'>
                  El idioma se guarda para tus próximas visitas y afecta la interfaz de usuario.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === 'website' && <CustomDomainSettings />}

        {selectedTab === 'website' && (
          <Card className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
            <CardContent className='space-y-4 pt-6'>
              <FormField
                control={form.control}
                name='favicon'
                render={({ field }) => (
                  <FormItem>
                    <div className='flex flex-col gap-0'>
                      <FormLabel className='mb-0'>
                        {t('configuration.general.favicon.title')}
                      </FormLabel>
                      <FormDescription className='text-xs mt-0 mb-2'>
                        {t('configuration.general.favicon.description')}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <div className='space-y-4'>
                        <div className='flex gap-1 mb-2'>
                          <Button
                            type='button'
                            variant={
                              field.value?.type === 'url'
                                ? 'default'
                                : 'outline'
                            }
                            className={`px-3 py-1 rounded-lg border transition-colors text-[12px] h-8
                              ${
                                field.value?.type === 'url'
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'border-slate-200/60 text-slate-600'
                              }
                            `}
                            onClick={() =>
                              field.onChange({ ...field.value, type: 'url' })
                            }
                            disabled={isUploadingFavicon}
                          >
                            {t('configuration.general.favicon.urlTab')}
                          </Button>
                          <Button
                            type='button'
                            variant={
                              field.value?.type === 'file'
                                ? 'default'
                                : 'outline'
                            }
                            className={`px-3 py-1 rounded-lg border transition-colors text-[12px] h-8
                              ${
                                field.value?.type === 'file'
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'border-slate-200/60 text-slate-600'
                              }
                            `}
                            onClick={() =>
                              field.onChange({ ...field.value, type: 'file' })
                            }
                            disabled={isUploadingFavicon}
                          >
                            {t('configuration.general.favicon.uploadTab')}
                          </Button>
                        </div>
                        <div className='mb-4'>
                          {field.value?.type === 'url' ? (
                            <Input
                              placeholder={t(
                                'configuration.general.favicon.urlPlaceholder'
                              )}
                              value={field.value?.value || ''}
                              onChange={(e) =>
                                field.onChange({
                                  ...field.value,
                                  value: e.target.value,
                                })
                              }
                              disabled={isUploadingFavicon}
                              className='h-8 text-sm px-2'
                            />
                          ) : (
                            <Input
                              type='file'
                              accept='image/x-icon, image/png, image/svg+xml'
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(
                                    file,
                                    'favicon',
                                    setIsUploadingFavicon
                                  );
                                }
                              }}
                              disabled={isUploadingFavicon}
                            />
                          )}
                        </div>
                        {form.watch('favicon.value') && (
                          <div className='mb-2'>
                            <p className='text-sm text-muted-foreground'>
                              {t('configuration.general.favicon.current')}
                            </p>
                            <div className='bg-gray-50 rounded-md p-2 inline-block'>
                              <img
                                src={form.watch('favicon.value')}
                                alt='Favicon'
                                className='h-12 w-12'
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {selectedTab === 'website' && (
          <Card className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
            <CardHeader>
              <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
                {t('configuration.general.titles.theme')}
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='primaryColor'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('configuration.general.theme.primaryColorLight')}
                      </FormLabel>
                      <FormControl>
                        <div className='flex gap-2'>
                          <Input
                            type='color'
                            {...field}
                            value={getFieldValue(field.value, '#000000')}
                          />
                          <Input
                            type='text'
                            {...field}
                            value={getFieldValue(field.value)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='secondaryColor'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t('configuration.general.theme.secondaryColorLight')}
                      </FormLabel>
                      <FormControl>
                        <div className='flex gap-2'>
                          <Input
                            type='color'
                            {...field}
                            value={getFieldValue(field.value, '#ffffff')}
                          />
                          <Input
                            type='text'
                            {...field}
                            value={getFieldValue(field.value)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name='lightModeLogo'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo Tema Claro</FormLabel>
                    <FormDescription className='text-xs'>
                      La página en modo claro mostrará este logo. <strong>Este logo también se usa en todos los documentos</strong> (notas de venta, compra, consignaciones, etc.)
                    </FormDescription>
                    <FormControl>
                      <div className='space-y-2'>
                        <div className='flex gap-1'>
                          <Button
                            type='button'
                            variant={
                              field.value.type === 'url' ? 'default' : 'outline'
                            }
                            className={`px-3 py-1 rounded-lg border transition-colors text-[12px] h-8
                              ${
                                field.value.type === 'url'
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'border-slate-200/60 text-slate-600'
                              }
                            `}
                            onClick={() =>
                              field.onChange({ ...field.value, type: 'url' })
                            }
                            disabled={isUploadingLightLogo}
                          >
                            URL
                          </Button>
                          <Button
                            type='button'
                            variant={
                              field.value.type === 'file'
                                ? 'default'
                                : 'outline'
                            }
                            className={`px-3 py-1 rounded-lg border transition-colors text-[12px] h-8
                              ${
                                field.value.type === 'file'
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'border-slate-200/60 text-slate-600'
                              }
                            `}
                            onClick={() =>
                              field.onChange({ ...field.value, type: 'file' })
                            }
                            disabled={isUploadingLightLogo}
                          >
                            Subir Archivo
                          </Button>
                        </div>
                        {field.value.type === 'url' ? (
                          <Input
                            placeholder='Ingrese la URL del logo'
                            value={field.value.value}
                            onChange={(e) =>
                              field.onChange({
                                ...field.value,
                                value: e.target.value,
                              })
                            }
                            disabled={isUploadingLightLogo}
                            className='h-8 text-sm px-2'
                          />
                        ) : (
                          <Input
                            type='file'
                            accept='image/*'
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(
                                  file,
                                  'lightModeLogo',
                                  setIsUploadingLightLogo
                                );
                              }
                            }}
                            disabled={isUploadingLightLogo}
                          />
                        )}
                        {field.value.value && (
                          <div className='mt-1'>
                            <p className='text-xs text-muted-foreground mb-1'>
                              Vista previa
                            </p>
                            <div className='bg-gray-50 border border-slate-200/60 rounded-md p-2 inline-block'>
                              <img
                                src={field.value.value}
                                alt='Logo'
                                className='h-12 max-w-[160px] w-auto object-contain'
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        )}

        {selectedTab === 'website' && (
          <Card className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
            <CardHeader>
              <div className='flex items-center justify-between'>
                <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
                  Configuración SEO
                </CardTitle>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleGenerateSeo}
                  disabled={isGeneratingSeo}
                  className='gap-1 text-[12px] font-medium rounded-xl bg-gradient-to-r from-sky-50 to-cyan-50 border-sky-200 text-sky-700 hover:from-sky-100 hover:to-cyan-100 hover:text-sky-800'
                >
                  {isGeneratingSeo ? (
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <div className='relative h-4 w-4 flex-shrink-0'>
                      <Lottie animationData={aiAnimation} loop className='absolute inset-[-50%] pointer-events-none' />
                    </div>
                  )}
                  {isGeneratingSeo ? 'Generando...' : 'Generar con GAIA'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='metaTitle'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título Meta</FormLabel>
                    <FormControl>
                      <Input placeholder='Ingrese el título meta' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder='Ingrese una descripción de la automotora'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='keywords'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Palabras Clave</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Ingrese palabras clave separadas por comas'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='googleSiteVerification'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verificación de Google Search Console</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Código de la etiqueta google-site-verification'
                        {...field}
                        value={getFieldValue(field.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      Solo el código (sin la etiqueta meta). Lo encuentras en
                      Search Console → Configuración → Verificación por etiqueta HTML.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className='pt-2'>
                <FormLabel className='text-[13px] font-medium text-slate-700'>
                  Redes sociales
                </FormLabel>
                <FormDescription className='mb-3'>
                  Ayudan a Google a vincular tu sitio con tus perfiles (sameAs).
                </FormDescription>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {(
                    [
                      ['instagramUrl', 'Instagram', 'https://instagram.com/tu_automotora'],
                      ['facebookUrl', 'Facebook', 'https://facebook.com/tu_automotora'],
                      ['tiktokUrl', 'TikTok', 'https://tiktok.com/@tu_automotora'],
                      ['youtubeUrl', 'YouTube', 'https://youtube.com/@tu_automotora'],
                    ] as const
                  ).map(([name, label, placeholder]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={placeholder}
                              {...field}
                              value={getFieldValue(field.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === 'contact' && (
          <Card className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
            <CardHeader>
              <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight'>
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Principal</FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder='Ingrese el email principal'
                          {...field}
                          value={getFieldValue(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Ingrese el teléfono'
                          {...field}
                          value={getFieldValue(field.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='border-t pt-4'>
                <h3 className='text-lg font-medium mb-3'>
                  Emails Específicos para Formularios
                </h3>
                <p className='text-sm text-muted-foreground mb-4'>
                  Configure emails específicos para cada tipo de formulario. Si
                  no se especifican, se utilizará el email principal.
                </p>

                <Tabs defaultValue='finance' className='w-full'>
                  <TabsList className='grid w-full grid-cols-4'>
                    <TabsTrigger value='finance'>Financiamientos</TabsTrigger>
                    <TabsTrigger value='consignments'>
                      Consignaciones
                    </TabsTrigger>
                    <TabsTrigger value='buy'>Compras Directas</TabsTrigger>
                    <TabsTrigger value='search'>Buscar tu Auto</TabsTrigger>
                  </TabsList>

                  <TabsContent value='finance' className='space-y-4 mt-4'>
                    <div className='rounded-lg border p-4 '>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                        <h4 className='font-medium text-gray-700'>
                          Formularios de Financiamiento
                        </h4>
                      </div>
                      <FormField
                        control={form.control}
                        name='finance_emails'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emails de Destino</FormLabel>
                            <FormControl>
                              <Input
                                placeholder='email1@ejemplo.com, email2@ejemplo.com'
                                {...field}
                                value={getFieldValue(field.value)}
                                className='bg-white'
                              />
                            </FormControl>
                            <FormDescription className='text-xs'>
                              {field.value
                                ? `Los formularios de financiamiento se enviarán a: ${field.value}`
                                : 'Si no se especifican emails, se enviará al email principal de la automotora.'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value='consignments' className='space-y-4 mt-4'>
                    <div className='rounded-lg border p-4 '>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                        <h4 className='font-medium text-gray-700'>
                          Formularios de Consignación
                        </h4>
                      </div>
                      <FormField
                        control={form.control}
                        name='consignments_emails'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emails de Destino</FormLabel>
                            <FormControl>
                              <Input
                                placeholder='email1@ejemplo.com, email2@ejemplo.com'
                                {...field}
                                value={getFieldValue(field.value)}
                                className='bg-white'
                              />
                            </FormControl>
                            <FormDescription className='text-xs'>
                              {field.value
                                ? `Los formularios de consignación se enviarán a: ${field.value}`
                                : 'Si no se especifican emails, se enviará al email principal de la automotora.'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value='buy' className='space-y-4 mt-4'>
                    <div className='rounded-lg border p-4 '>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                        <h4 className='font-medium text-gray-700'>
                          Formularios de Compra Directa
                        </h4>
                      </div>
                      <FormField
                        control={form.control}
                        name='buy_emails'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emails de Destino</FormLabel>
                            <FormControl>
                              <Input
                                placeholder='email1@ejemplo.com, email2@ejemplo.com'
                                {...field}
                                value={getFieldValue(field.value)}
                                className='bg-white'
                              />
                            </FormControl>
                            <FormDescription className='text-xs'>
                              {field.value
                                ? `Los formularios de compra directa se enviarán a: ${field.value}`
                                : 'Si no se especifican emails, se enviará al email principal de la automotora.'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value='search' className='space-y-4 mt-4'>
                    <div className='rounded-lg border p-4 '>
                      <div className='flex items-center gap-2 mb-3'>
                        <div className='w-2 h-2 bg-blue-400 rounded-full'></div>
                        <h4 className='font-medium text-gray-700'>
                          Formularios de Búsqueda de Vehículos
                        </h4>
                      </div>
                      <FormField
                        control={form.control}
                        name='search_emails'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Emails de Destino</FormLabel>
                            <FormControl>
                              <Input
                                placeholder='email1@ejemplo.com, email2@ejemplo.com'
                                {...field}
                                value={getFieldValue(field.value)}
                                className='bg-white'
                              />
                            </FormControl>
                            <FormDescription className='text-xs'>
                              {field.value
                                ? `Las solicitudes de búsqueda de vehículos se enviarán a: ${field.value}`
                                : 'Si no se especifican emails, se enviará al email principal de la automotora.'}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedTab === 'subscription' && (
          <SubscriptionSettings />
        )}

        {selectedTab !== 'subscription' && selectedTab !== 'website' && (
          <div className='flex justify-end'>
            <Button
              type='submit'
              className='h-9 rounded-xl text-[13px]'
              disabled={
                isLoading ||
                isUploadingLightLogo ||
                isUploadingFavicon
              }
            >
              {isLoading
                ? t('actions.saving')
                : isUploadingLightLogo ||
                  isUploadingFavicon
                ? t('configuration.general.uploadingFile')
                : t('configuration.general.saveButton')}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
};

export default GeneralConfig;
