import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Icon } from '@iconify/react';
import posthog from '@/utils/posthog';

type IntegrationsShape = {
  google_reviews_enabled?: boolean;
  pixel_id?: string;
  gtm_id?: string;
  ga4_id?: string;
  require_cookie_consent?: boolean;
  vambe_client_id?: string;
  vambe_channel_id?: string;
};

const META_PIXEL_PATTERN = /^\d{10,20}$/;
const GTM_PATTERN = /^GTM-[A-Z0-9]{4,}$/;
const GA4_PATTERN = /^G-[A-Z0-9]{6,}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const IntegrationsPanel = () => {
  const { client } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [pixelId, setPixelId] = useState('');
  const [gtmId, setGtmId] = useState('');
  const [ga4Id, setGa4Id] = useState('');
  const [vambeClientId, setVambeClientId] = useState('');
  const [vambeChannelId, setVambeChannelId] = useState('');
  const [requireConsent, setRequireConsent] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!client?.id || !isOpen) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('client_website_config')
          .select('integrations')
          .eq('client_id', client.id)
          .maybeSingle();
        if (error) throw error;
        const i = (data?.integrations || {}) as IntegrationsShape;
        setPixelId(i.pixel_id || '');
        setGtmId(i.gtm_id || '');
        setGa4Id(i.ga4_id || '');
        setVambeClientId(i.vambe_client_id || '');
        setVambeChannelId(i.vambe_channel_id || '');
        setRequireConsent(i.require_cookie_consent ?? true);
      } catch (err) {
        console.error('Error loading integrations:', err);
        toast.error('Error al cargar integraciones');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [client?.id, isOpen]);

  const validate = (): string | null => {
    if (pixelId && !META_PIXEL_PATTERN.test(pixelId.trim())) {
      return 'Meta Pixel ID debe ser numérico (10–20 dígitos)';
    }
    if (gtmId && !GTM_PATTERN.test(gtmId.trim())) {
      return 'GTM ID debe tener formato GTM-XXXXXXX';
    }
    if (ga4Id && !GA4_PATTERN.test(ga4Id.trim())) {
      return 'GA4 ID debe tener formato G-XXXXXXX';
    }
    // Vambe: ambos IDs o ninguno (el widget no carga con uno solo)
    if (Boolean(vambeClientId.trim()) !== Boolean(vambeChannelId.trim())) {
      return 'Vambe necesita Client ID y Channel ID (ambos o ninguno)';
    }
    if (vambeClientId && !UUID_PATTERN.test(vambeClientId.trim())) {
      return 'Vambe Client ID debe ser un UUID válido';
    }
    if (vambeChannelId && !UUID_PATTERN.test(vambeChannelId.trim())) {
      return 'Vambe Channel ID debe ser un UUID válido';
    }
    return null;
  };

  const handleSave = async () => {
    if (!client?.id) return;
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      // Read current integrations so we preserve keys we don't control here
      const { data: current, error: readError } = await supabase
        .from('client_website_config')
        .select('integrations')
        .eq('client_id', client.id)
        .maybeSingle();
      if (readError) throw readError;

      const merged: IntegrationsShape = {
        ...((current?.integrations || {}) as IntegrationsShape),
        pixel_id: pixelId.trim(),
        gtm_id: gtmId.trim(),
        ga4_id: ga4Id.trim(),
        vambe_client_id: vambeClientId.trim().toLowerCase(),
        vambe_channel_id: vambeChannelId.trim().toLowerCase(),
        require_cookie_consent: requireConsent,
      };

      const { error } = await supabase
        .from('client_website_config')
        .upsert(
          {
            client_id: client.id,
            integrations: merged,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'client_id' }
        );
      if (error) throw error;

      posthog.capture({
        distinctId: client.id.toString(),
        event: 'builder_integrations_saved',
        properties: {
          has_pixel: !!merged.pixel_id,
          has_gtm: !!merged.gtm_id,
          has_ga4: !!merged.ga4_id,
          has_vambe: !!(merged.vambe_client_id && merged.vambe_channel_id),
          require_consent: merged.require_cookie_consent,
        },
      });
      toast.success('Integraciones guardadas');
    } catch (err) {
      console.error('Error saving integrations:', err);
      toast.error('Error al guardar integraciones');
    } finally {
      setSaving(false);
    }
  };

  const activeCount =
    (pixelId ? 1 : 0) +
    (gtmId ? 1 : 0) +
    (ga4Id ? 1 : 0) +
    (vambeClientId && vambeChannelId ? 1 : 0);

  return (
    <div className='border border-gray-200 rounded-xl overflow-hidden'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors'
      >
        <div className='flex items-center gap-2'>
          <Icon icon='mdi:chart-line' className='text-lg text-gray-600' />
          <span className='text-sm font-medium text-gray-900'>
            Integraciones y tracking
          </span>
        </div>
        <div className='flex items-center gap-2'>
          {activeCount > 0 && (
            <span className='text-[10px] font-semibold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-full'>
              {activeCount}
            </span>
          )}
          <Icon
            icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'}
            className='text-lg text-gray-400'
          />
        </div>
      </button>

      {isOpen && (
        <div className='p-3 space-y-3 border-t border-gray-200'>
          {loading ? (
            <div className='flex items-center justify-center py-4 text-gray-400'>
              <Icon icon='mdi:loading' className='animate-spin text-lg' />
            </div>
          ) : (
            <>
              <p className='text-[11px] text-gray-500 leading-relaxed'>
                Conecta tu sitio con plataformas de tracking. Los scripts se
                cargan en el sitio público, no en el editor.
              </p>

              <div className='space-y-1'>
                <label className='text-[11px] font-medium text-gray-700 flex items-center gap-1'>
                  <Icon icon='mdi:facebook' className='text-[#1877F2] text-sm' />
                  Meta Pixel ID
                </label>
                <input
                  type='text'
                  inputMode='numeric'
                  placeholder='Ej: 1234567890123456'
                  value={pixelId}
                  onChange={(e) => setPixelId(e.target.value)}
                  className='w-full px-2.5 py-1.5 rounded-md border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:border-sky-400'
                />
              </div>

              <div className='space-y-1'>
                <label className='text-[11px] font-medium text-gray-700 flex items-center gap-1'>
                  <Icon icon='mdi:google' className='text-[#4285F4] text-sm' />
                  Google Tag Manager ID
                </label>
                <input
                  type='text'
                  placeholder='GTM-XXXXXXX'
                  value={gtmId}
                  onChange={(e) => setGtmId(e.target.value.toUpperCase())}
                  className='w-full px-2.5 py-1.5 rounded-md border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:border-sky-400'
                />
              </div>

              <div className='space-y-1'>
                <label className='text-[11px] font-medium text-gray-700 flex items-center gap-1'>
                  <Icon icon='mdi:google-analytics' className='text-[#E37400] text-sm' />
                  Google Analytics 4 ID
                </label>
                <input
                  type='text'
                  placeholder='G-XXXXXXX'
                  value={ga4Id}
                  onChange={(e) => setGa4Id(e.target.value.toUpperCase())}
                  className='w-full px-2.5 py-1.5 rounded-md border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:border-sky-400'
                />
              </div>

              <div className='pt-1 border-t border-gray-100'>
                <p className='text-[11px] font-semibold text-gray-700 mb-1 flex items-center gap-1'>
                  <Icon icon='mdi:chat-processing' className='text-sky-500 text-sm' />
                  Chat web (Vambe)
                </p>
                <div className='space-y-1'>
                  <label className='text-[11px] font-medium text-gray-700'>
                    Vambe Client ID
                  </label>
                  <input
                    type='text'
                    placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                    value={vambeClientId}
                    onChange={(e) =>
                      setVambeClientId(e.target.value.trim().toLowerCase())
                    }
                    className='w-full px-2.5 py-1.5 rounded-md border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:border-sky-400'
                  />
                </div>
                <div className='space-y-1 mt-2'>
                  <label className='text-[11px] font-medium text-gray-700'>
                    Vambe Channel ID
                  </label>
                  <input
                    type='text'
                    placeholder='xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
                    value={vambeChannelId}
                    onChange={(e) =>
                      setVambeChannelId(e.target.value.trim().toLowerCase())
                    }
                    className='w-full px-2.5 py-1.5 rounded-md border border-gray-200 text-[11px] font-mono text-gray-700 focus:outline-none focus:border-sky-400'
                  />
                </div>
                <p className='text-[10px] text-gray-400 leading-tight mt-1'>
                  El chat es funcional, no tracking: se carga siempre, sin
                  depender del consentimiento de cookies.
                </p>
              </div>

              <label className='flex items-start gap-2 p-2 bg-gray-50 rounded-lg cursor-pointer'>
                <input
                  type='checkbox'
                  checked={requireConsent}
                  onChange={(e) => setRequireConsent(e.target.checked)}
                  className='mt-0.5 accent-sky-500'
                />
                <div className='flex-1'>
                  <p className='text-[11px] font-medium text-gray-700'>
                    Requerir consentimiento de cookies
                  </p>
                  <p className='text-[10px] text-gray-400 leading-tight'>
                    Los scripts solo se cargan tras la aceptación del visitante.
                    Recomendado por GDPR/LGPD.
                  </p>
                </div>
              </label>

              <button
                onClick={handleSave}
                disabled={saving}
                className='w-full py-2 px-3 rounded-lg text-xs font-medium text-white bg-sky-500 hover:bg-sky-600 transition-colors disabled:opacity-50'
              >
                {saving ? (
                  <span className='flex items-center justify-center gap-1.5'>
                    <Icon icon='mdi:loading' className='animate-spin text-sm' />
                    Guardando...
                  </span>
                ) : (
                  'Guardar integraciones'
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
