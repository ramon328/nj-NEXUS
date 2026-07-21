import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Copy,
  Plus,
  Trash2,
  KeyRound,
  Check,
  AlertTriangle,
  Loader2,
  Code2,
  BookOpen,
} from 'lucide-react';

// URL estable del proyecto (misma que usan las migraciones / edge functions).
const PROJECT_URL = 'https://miuiujntdjrjhhcysiba.supabase.co';
const API_BASE = `${PROJECT_URL}/functions/v1/inventory-api`;
const DOCS_URL = '/api-docs.html';

const LIST_PARAMS: { name: string; desc: string }[] = [
  { name: 'page', desc: 'Número de página (default 1).' },
  { name: 'limit', desc: 'Cantidad por página (1–200) o "all".' },
  { name: 'available_only', desc: 'Solo publicados (default true).' },
  { name: 'view', desc: '"compact": solo datos comerciales, sin galería, patente ni timestamps (~12% del tamaño). Ideal para agentes AI.' },
  { name: 'exclude', desc: '"galeria": vista completa pero sin el array de fotos.' },
  { name: 'marca / modelo / categoria / combustible', desc: 'Filtrar por nombre (parcial, sin distinguir mayúsculas).' },
  { name: 'brand_id / model_id', desc: 'Filtrar por marca / modelo (id).' },
  { name: 'year_min / year_max', desc: 'Rango de año (alias: anio_min / anio_max).' },
  { name: 'price_min / price_max', desc: 'Rango de precio (alias: precio_min / precio_max).' },
  { name: 'search', desc: 'Busca en descripción / versión.' },
  { name: 'sort', desc: 'created_at | price | year.' },
  { name: 'order', desc: 'asc | desc (default desc).' },
];

type ApiKeyRow = {
  id: string;
  label: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

const generatePlainKey = (): string => {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `gak_live_${hex}`;
};

const sha256hex = async (s: string): Promise<string> => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('es-CL', { dateStyle: 'medium' }) : '—';

const DevelopersConfig: React.FC = () => {
  const { clientId } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [generating, setGenerating] = useState(false);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    const { data } = await supabase
      .from('tenant_api_keys')
      .select('id, label, key_prefix, last_used_at, created_at, revoked_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    setKeys((data as ApiKeyRow[]) || []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const copy = async (text: string, what = 'Copiado') => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: what });
    } catch {
      toast({ title: 'No se pudo copiar', variant: 'destructive' });
    }
  };

  const handleGenerate = async () => {
    if (!clientId) return;
    setGenerating(true);
    try {
      const key = generatePlainKey();
      const key_hash = await sha256hex(key);
      const key_prefix = key.slice(0, 16);
      const { error } = await supabase.from('tenant_api_keys').insert({
        client_id: clientId,
        label: newLabel.trim() || 'API key',
        key_prefix,
        key_hash,
      });
      if (error) throw error;
      setJustCreated(key);
      setNewLabel('');
      setShowCreate(false);
      await loadKeys();
    } catch (e) {
      console.error('Error generando API key:', e);
      toast({ title: 'No se pudo generar la key', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('¿Revocar esta API key? Las integraciones que la usen dejarán de funcionar.')) {
      return;
    }
    const { error } = await supabase
      .from('tenant_api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast({ title: 'No se pudo revocar', variant: 'destructive' });
      return;
    }
    toast({ title: 'API key revocada' });
    await loadKeys();
  };

  const curlExample = `curl "${API_BASE}/vehicles?available_only=true&limit=50" \\\n  -H "x-api-key: TU_API_KEY"`;
  const jsExample = `const res = await fetch(\n  "${API_BASE}/vehicles?available_only=true&limit=50",\n  { headers: { "x-api-key": "TU_API_KEY" } }\n);\nconst { data } = await res.json();`;

  const activeKeys = keys.filter((k) => !k.revoked_at);

  return (
    <div className='mx-auto max-w-3xl space-y-5'>
      {/* Intro */}
      <div className='rounded-xl border border-slate-200 bg-white p-4'>
        <div className='flex items-start gap-3'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white'>
            <Code2 className='h-5 w-5' />
          </div>
          <div>
            <h2 className='text-base font-semibold text-slate-900'>API de inventario</h2>
            <p className='mt-0.5 text-sm text-slate-500'>
              Accede al stock de tu automotora desde tu sitio, un partner o tu ERP.
              Autentica con tu API key en el header <code className='rounded bg-slate-100 px-1 py-0.5 text-[12px]'>x-api-key</code>.
              Solo expone datos comerciales (nada financiero).
            </p>
            <a
              href={DOCS_URL}
              target='_blank'
              rel='noopener noreferrer'
              className='mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-sky-600 hover:text-sky-700'
            >
              <BookOpen className='h-3.5 w-3.5' /> Ver documentación completa
            </a>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className='rounded-xl border border-slate-200 bg-white p-4'>
        <h3 className='text-sm font-semibold text-slate-900'>Endpoints</h3>
        <div className='mt-3 space-y-2'>
          {[
            { label: 'Listar vehículos', method: 'GET', url: `${API_BASE}/vehicles` },
            { label: 'Detalle de un vehículo', method: 'GET', url: `${API_BASE}/vehicles/{id}` },
          ].map((ep) => (
            <div
              key={ep.url}
              className='flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 sm:flex-row sm:items-center sm:justify-between'
            >
              <div className='min-w-0'>
                <div className='text-[11px] font-medium text-slate-500'>{ep.label}</div>
                <div className='flex items-center gap-2'>
                  <span className='rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700'>
                    {ep.method}
                  </span>
                  <code className='truncate text-[12px] text-slate-700'>{ep.url}</code>
                </div>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='h-8 shrink-0 text-xs'
                onClick={() => copy(ep.url, 'Endpoint copiado')}
              >
                <Copy className='mr-1 h-3.5 w-3.5' /> Copiar
              </Button>
            </div>
          ))}
        </div>
        <div className='mt-3'>
          <p className='mb-1.5 text-[11px] font-medium text-slate-500'>Parámetros de la lista</p>
          <div className='overflow-hidden rounded-lg border border-slate-200'>
            {LIST_PARAMS.map((p, i) => (
              <div
                key={p.name}
                className={`flex flex-col gap-0.5 px-2.5 py-1.5 text-[12px] sm:flex-row sm:gap-3 ${
                  i % 2 ? 'bg-slate-50/60' : ''
                }`}
              >
                <code className='shrink-0 text-slate-700 sm:w-44'>{p.name}</code>
                <span className='text-slate-500'>{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key recién creada (se muestra una sola vez) */}
      {justCreated && (
        <div className='rounded-xl border border-amber-300 bg-amber-50 p-4'>
          <div className='flex items-start gap-2'>
            <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-amber-600' />
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-semibold text-amber-800'>Guarda tu API key ahora</p>
              <p className='mt-0.5 text-[12px] text-amber-700'>
                Por seguridad no se vuelve a mostrar. Si la pierdes, genera una nueva.
              </p>
              <div className='mt-2 flex items-center gap-2'>
                <code className='min-w-0 flex-1 truncate rounded-lg border border-amber-300 bg-white px-3 py-2 text-[12px] text-slate-800'>
                  {justCreated}
                </code>
                <Button size='sm' className='h-9 shrink-0' onClick={() => copy(justCreated, 'API key copiada')}>
                  <Copy className='mr-1 h-3.5 w-3.5' /> Copiar
                </Button>
              </div>
              <button
                type='button'
                onClick={() => setJustCreated(null)}
                className='mt-2 text-[12px] font-medium text-amber-700 underline underline-offset-2'
              >
                Ya la guardé
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API keys */}
      <div className='rounded-xl border border-slate-200 bg-white p-4'>
        <div className='flex items-center justify-between gap-2'>
          <h3 className='text-sm font-semibold text-slate-900'>API keys</h3>
          {!showCreate && (
            <Button size='sm' className='h-8 text-xs' onClick={() => setShowCreate(true)}>
              <Plus className='mr-1 h-3.5 w-3.5' /> Generar API key
            </Button>
          )}
        </div>

        {showCreate && (
          <div className='mt-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 sm:flex-row sm:items-end'>
            <div className='flex-1 space-y-1'>
              <label className='text-[11px] font-medium text-slate-600'>Nombre (para identificarla)</label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder='Ej: Sitio web, Partner X'
                className='h-9 text-sm'
              />
            </div>
            <div className='flex gap-2'>
              <Button size='sm' className='h-9' onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' /> : <KeyRound className='mr-1 h-3.5 w-3.5' />}
                Generar
              </Button>
              <Button
                size='sm'
                variant='outline'
                className='h-9'
                onClick={() => {
                  setShowCreate(false);
                  setNewLabel('');
                }}
                disabled={generating}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className='mt-3'>
          {loading ? (
            <div className='flex items-center justify-center py-6 text-slate-400'>
              <Loader2 className='h-5 w-5 animate-spin' />
            </div>
          ) : activeKeys.length === 0 ? (
            <p className='py-6 text-center text-sm text-slate-400'>
              Todavía no tienes API keys. Genera una para empezar.
            </p>
          ) : (
            <div className='space-y-1.5'>
              {activeKeys.map((k) => (
                <div
                  key={k.id}
                  className='flex items-center justify-between gap-2 rounded-lg border border-slate-200 p-2.5'
                >
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <KeyRound className='h-4 w-4 shrink-0 text-slate-400' />
                    <div className='min-w-0'>
                      <div className='truncate text-[13px] font-medium text-slate-800'>{k.label}</div>
                      <div className='flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400'>
                        <code className='text-slate-500'>{k.key_prefix}••••••••</code>
                        <span>· creada {fmtDate(k.created_at)}</span>
                        <span>· último uso {fmtDate(k.last_used_at)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8 shrink-0 text-slate-400 hover:text-red-600'
                    onClick={() => handleRevoke(k.id)}
                    title='Revocar'
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ejemplos de uso */}
      <div className='rounded-xl border border-slate-200 bg-white p-4'>
        <h3 className='text-sm font-semibold text-slate-900'>Ejemplos</h3>
        <div className='mt-2 space-y-3'>
          {[
            { label: 'curl', code: curlExample },
            { label: 'JavaScript', code: jsExample },
          ].map((ex) => (
            <div key={ex.label}>
              <div className='mb-1 flex items-center justify-between'>
                <span className='text-[11px] font-medium text-slate-500'>{ex.label}</span>
                <button
                  type='button'
                  onClick={() => copy(ex.code, 'Copiado')}
                  className='inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700'
                >
                  <Copy className='h-3 w-3' /> Copiar
                </button>
              </div>
              <pre className='overflow-x-auto rounded-lg bg-slate-900 p-3 text-[12px] leading-relaxed text-slate-100'>
                <code>{ex.code}</code>
              </pre>
            </div>
          ))}
        </div>
        <p className='mt-2 flex items-center gap-1 text-[11px] text-slate-400'>
          <Check className='h-3 w-3 text-emerald-500' />
          Reemplaza <code className='mx-1'>TU_API_KEY</code> por la key que generaste arriba.
        </p>
      </div>
    </div>
  );
};

export default DevelopersConfig;
