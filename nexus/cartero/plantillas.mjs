// Motor de plantillas minimo, sin dependencias.
// Soporta:
//   {{var}}            -> escapado a HTML
//   {{{var}}}          -> crudo (sin escapar)
//   {{#si var}}...{{/si}}          condicional
//   {{#no var}}...{{/no}}          condicional negado
//   {{#cada items}}...{{/cada}}    bucle; dentro se usa {{.campo}} y {{@indice}}
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(raiz, 'plantillas');

const escapar = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Busca "a.b.c" dentro del contexto; "." y ".campo" apuntan al item del bucle.
function valor(ctx, ruta) {
  if (ruta === '.') return ctx.__item;
  if (ruta === '@indice') return ctx.__indice;
  let base = ctx;
  if (ruta.startsWith('.')) { base = ctx.__item; ruta = ruta.slice(1); }
  return ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), base);
}

const cierto = (v) => !(v == null || v === false || v === '' || v === 0 ||
  (Array.isArray(v) && v.length === 0));

export function render(tpl, ctx = {}) {
  let s = String(tpl);

  // Parciales: {{>nombre}} inserta plantillas/nombre.html antes de todo lo demas.
  s = s.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => leer(n));

  // Bucles primero (permiten anidar condicionales adentro).
  s = s.replace(/\{\{#cada\s+([\w.@]+)\s*\}\}([\s\S]*?)\{\{\/cada\}\}/g, (_, ruta, cuerpo) => {
    const lista = valor(ctx, ruta);
    if (!Array.isArray(lista)) return '';
    return lista.map((item, i) => render(cuerpo, { ...ctx, __item: item, __indice: i })).join('');
  });

  s = s.replace(/\{\{#si\s+([\w.@]+)\s*\}\}([\s\S]*?)\{\{\/si\}\}/g,
    (_, ruta, cuerpo) => (cierto(valor(ctx, ruta)) ? render(cuerpo, ctx) : ''));

  s = s.replace(/\{\{#no\s+([\w.@]+)\s*\}\}([\s\S]*?)\{\{\/no\}\}/g,
    (_, ruta, cuerpo) => (cierto(valor(ctx, ruta)) ? '' : render(cuerpo, ctx)));

  s = s.replace(/\{\{\{\s*([\w.@]+)\s*\}\}\}/g, (_, r) => String(valor(ctx, r) ?? ''));
  s = s.replace(/\{\{\s*([\w.@]+)\s*\}\}/g,   (_, r) => escapar(valor(ctx, r)));
  return s;
}

const cache = new Map();
function leer(nombre) {
  if (process.env.CARTERO_DEV !== '1' && cache.has(nombre)) return cache.get(nombre);
  const t = fs.readFileSync(path.join(DIR, nombre + '.html'), 'utf8');
  cache.set(nombre, t);
  return t;
}

export function existe(nombre) {
  return fs.existsSync(path.join(DIR, String(nombre).replace(/[^\w-]/g, '') + '.html'));
}

// Renderiza una plantilla dentro del layout "base".
// La plantilla puede declarar su asunto con: <!--asunto: Texto {{var}} -->
export function armar(nombre, ctx = {}) {
  const limpio = String(nombre).replace(/[^\w-]/g, '');
  const crudo = leer(limpio);
  const m = crudo.match(/<!--\s*asunto:\s*([\s\S]*?)-->/);
  const asunto = m ? render(m[1].trim(), ctx) : '';
  const cuerpo = render(crudo.replace(/<!--\s*asunto:[\s\S]*?-->/, '').trim(), ctx);
  // El layout se renderiza SIN el cuerpo; el cuerpo se inyecta al final para que
  // un dato del usuario que traiga llaves no se vuelva a interpretar.
  const html = render(leer('base'), ctx).replace('{{{contenido}}}', () => cuerpo);
  return { asunto, html };
}

// Version texto plano a partir del HTML (para clientes sin HTML y mejor reputacion).
export function aTexto(html) {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, u, t) =>
      `${t.replace(/<[^>]+>/g, '').trim()} ( ${u} )`)
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((l) => l.trim()).join('\n').trim();
}

// Formato de plata chilena: 69990 -> $69.990
export const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 });
