import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Globe,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Copy,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  addCustomDomain,
  getCustomDomainStatus,
  removeCustomDomain,
  isDomainActive,
  type VercelDomainStatus,
} from '@/integrations/vercel/client';

// Normaliza lo que el usuario pega: saca protocolo, www opcional no, paths, mayúsculas.
const normalizeDomain = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/\s+/g, '');

// Dominio válido básico (labels separados por punto, al menos un punto).
const isValidDomain = (d: string): boolean =>
  /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(d);

// ¿Es raíz/apex (ej: tuauto.cl) o subdominio (ej: www.tuauto.cl)?
const isApex = (d: string): boolean => d.split('.').length <= 2;

interface DnsRecord {
  type: string;
  name: string;
  value: string;
}

// Registros recomendados para apuntar el dominio a Vercel.
const recommendedRecords = (domain: string): DnsRecord[] => {
  if (isApex(domain)) {
    return [{ type: 'A', name: '@', value: '76.76.21.21' }];
  }
  const sub = domain.split('.')[0];
  return [{ type: 'CNAME', name: sub, value: 'cname.vercel-dns.com' }];
};

const CopyableValue: React.FC<{ value: string }> = ({ value }) => (
  <button
    type='button'
    onClick={() => {
      navigator.clipboard?.writeText(value);
      toast.success('Copiado');
    }}
    className='inline-flex items-center gap-1 font-mono text-[12px] text-slate-700 hover:text-slate-900'
    title='Copiar'
  >
    {value}
    <Copy className='h-3 w-3 opacity-50' />
  </button>
);

const RecordsTable: React.FC<{ records: DnsRecord[] }> = ({ records }) => (
  <div className='overflow-x-auto rounded-lg border border-slate-200/70'>
    <table className='w-full text-left'>
      <thead>
        <tr className='bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400'>
          <th className='px-3 py-2 font-medium'>Tipo</th>
          <th className='px-3 py-2 font-medium'>Nombre / Host</th>
          <th className='px-3 py-2 font-medium'>Valor</th>
        </tr>
      </thead>
      <tbody>
        {records.map((r, i) => (
          <tr key={i} className='border-t border-slate-100 text-[12px]'>
            <td className='px-3 py-2 font-mono text-slate-700'>{r.type}</td>
            <td className='px-3 py-2'>
              <CopyableValue value={r.name} />
            </td>
            <td className='px-3 py-2'>
              <CopyableValue value={r.value} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CustomDomainSettings: React.FC = () => {
  const { clientId, refreshClient } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subdomain, setSubdomain] = useState<string>(''); // *.goauto.cl
  const [savedDomain, setSavedDomain] = useState<string>(''); // custom_domain guardado
  const [verified, setVerified] = useState(false);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<VercelDomainStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('domain, custom_domain, custom_domain_verified')
      .eq('id', clientId)
      .maybeSingle();
    if (!error && data) {
      setSubdomain((data as any).domain || '');
      setSavedDomain((data as any).custom_domain || '');
      setInput((data as any).custom_domain || '');
      setVerified(!!(data as any).custom_domain_verified);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (
    custom_domain: string | null,
    custom_domain_verified: boolean
  ) => {
    const { error } = await supabase
      .from('clients')
      .update({ custom_domain, custom_domain_verified })
      .eq('id', clientId!);
    if (error) throw error;
    await refreshClient();
  };

  const handleConnect = async () => {
    const domain = normalizeDomain(input);
    if (!isValidDomain(domain)) {
      toast.error('Ingresa un dominio válido (ej: tuautomotora.cl)');
      return;
    }
    setConnecting(true);
    try {
      const result = await addCustomDomain(domain);
      const active = isDomainActive(result);
      await persist(domain, active);
      setSavedDomain(domain);
      setInput(domain);
      setStatus(result);
      setVerified(active);
      toast.success(
        active
          ? 'Dominio conectado y activo'
          : 'Dominio conectado. Configura el DNS para activarlo.'
      );
    } catch (e: any) {
      console.error('connect custom domain', e);
      toast.error(e?.message || 'No se pudo conectar el dominio');
    } finally {
      setConnecting(false);
    }
  };

  const handleVerify = async () => {
    if (!savedDomain) return;
    setVerifying(true);
    try {
      const result = await getCustomDomainStatus(savedDomain);
      const active = isDomainActive(result);
      setStatus(result);
      setVerified(active);
      await persist(savedDomain, active);
      toast[active ? 'success' : 'message'](
        active
          ? '¡Dominio activo! Ya está sirviendo tu sitio.'
          : 'Todavía no apunta a Vercel. Revisa el registro DNS (puede tardar hasta 48h en propagar).'
      );
    } catch (e: any) {
      console.error('verify custom domain', e);
      toast.error(e?.message || 'No se pudo verificar el dominio');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisconnect = async () => {
    if (!savedDomain) return;
    setDisconnecting(true);
    try {
      await removeCustomDomain(savedDomain);
      await persist(null, false);
      setSavedDomain('');
      setInput('');
      setStatus(null);
      setVerified(false);
      toast.success('Dominio desconectado');
    } catch (e: any) {
      console.error('disconnect custom domain', e);
      toast.error(e?.message || 'No se pudo desconectar el dominio');
    } finally {
      setDisconnecting(false);
    }
  };

  // Registros a mostrar: recomendados + los de verificación de propiedad que pida Vercel.
  const dnsRecords: DnsRecord[] = savedDomain
    ? [
        ...recommendedRecords(savedDomain),
        ...(status?.verification?.map((v) => ({
          type: v.type,
          name: v.domain,
          value: v.value,
        })) ?? []),
      ]
    : [];

  return (
    <Card className='rounded-2xl shadow-[0_2px_10px_-3px_rgba(0,0,0,0.08)] border-slate-200/60'>
      <CardHeader>
        <CardTitle className='text-[15px] font-semibold text-slate-900 tracking-tight flex items-center gap-2'>
          <Globe className='h-4 w-4 text-slate-500' />
          Dominio propio
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5'>
        {loading ? (
          <div className='flex items-center gap-2 text-sm text-slate-400'>
            <Loader2 className='h-4 w-4 animate-spin' /> Cargando…
          </div>
        ) : (
          <>
            {/* Subdominio actual */}
            <div className='text-xs text-slate-500'>
              Tu sitio está publicado en{' '}
              <span className='font-medium text-slate-700'>
                {subdomain || '—'}
              </span>
              . Puedes conectar tu propio dominio para usarlo en su lugar.
            </div>

            {/* Input + conectar */}
            <div className='space-y-1.5'>
              <label className='text-xs font-medium text-slate-700 block'>
                Dominio
              </label>
              <div className='flex flex-col sm:flex-row gap-2'>
                <Input
                  placeholder='tuautomotora.cl'
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={connecting || !!savedDomain}
                  className='h-9 text-sm'
                />
                {!savedDomain ? (
                  <Button
                    type='button'
                    onClick={handleConnect}
                    disabled={connecting}
                    className='h-9 whitespace-nowrap'
                  >
                    {connecting && <Loader2 className='h-4 w-4 mr-2 animate-spin' />}
                    Conectar dominio
                  </Button>
                ) : (
                  <Button
                    type='button'
                    variant='outline'
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className='h-9 whitespace-nowrap text-red-600 hover:text-red-700'
                  >
                    {disconnecting ? (
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    ) : (
                      <Trash2 className='h-4 w-4 mr-2' />
                    )}
                    Desconectar
                  </Button>
                )}
              </div>
            </div>

            {/* Estado + DNS */}
            {savedDomain && (
              <div className='space-y-4 rounded-xl border border-slate-200/70 bg-slate-50/40 p-4'>
                <div className='flex items-center gap-2 text-sm'>
                  {verified ? (
                    <>
                      <CheckCircle2 className='h-4 w-4 text-emerald-500' />
                      <span className='text-emerald-700 font-medium'>
                        {savedDomain} está verificado y activo
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className='h-4 w-4 text-amber-500' />
                      <span className='text-amber-700 font-medium'>
                        Falta configurar el DNS de {savedDomain}
                      </span>
                    </>
                  )}
                </div>

                {!verified && (
                  <>
                    <div className='text-xs text-slate-600 leading-relaxed'>
                      Entra al panel de tu proveedor de dominio (donde compraste
                      el dominio: NIC Chile, GoDaddy, Cloudflare, etc.) y crea
                      este registro en la zona DNS. La{' '}
                      <strong>delegación de DNS debe quedar en tu proveedor</strong>{' '}
                      apuntando a estos valores:
                    </div>
                    <RecordsTable records={dnsRecords} />
                    <div className='text-[11px] text-slate-400'>
                      {isApex(savedDomain)
                        ? 'Tip: para un dominio raíz usa el registro A. Si tu proveedor soporta CNAME flattening / ALIAS en la raíz, también puedes apuntar a cname.vercel-dns.com.'
                        : 'Tip: para un subdominio usa el registro CNAME.'}{' '}
                      Los cambios de DNS pueden tardar hasta 48 horas en propagarse.
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleVerify}
                      disabled={verifying}
                      className='h-9'
                    >
                      {verifying && (
                        <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      )}
                      Verificar configuración
                    </Button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomDomainSettings;
