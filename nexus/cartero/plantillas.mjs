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

// Busca el cierre que corresponde a una apertura, contando anidamiento.
// Sin esto, {{#si a}}...{{#si b}}...{{/si}}...{{/si}} cierra en el lugar equivocado.
function cierreBalanceado(s, tipo, desde) {
  const re = new RegExp(`\\{\\{#${tipo}\\s+[\\w.@]+\\s*\\}\\}|\\{\\{\\/${tipo}\\}\\}`, 'g');
  re.lastIndex = desde;
  let nivel = 1, t;
  while ((t = re.exec(s))) {
    if (t[0].startsWith('{{/')) { if (--nivel === 0) return { ini: t.index, fin: t.index + t[0].length }; }
    else nivel++;
  }
  return null;
}

export function render(tpl, ctx = {}) {
  let s = String(tpl);

  // Parciales: {{>nombre}} inserta plantillas/nombre.html antes de todo lo demas.
  s = s.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => leer(n));

  // Bloques (si / no / cada), con soporte de anidamiento.
  // Se va emitiendo a un buffer para no re-escanear lo ya resuelto: si un dato
  // del cliente trae llaves, jamas se vuelve a interpretar.
  const apertura = /\{\{#(si|no|cada)\s+([\w.@]+)\s*\}\}/;
  let salida = '';
  let m;
  while ((m = apertura.exec(s))) {
    const trasAbre = m.index + m[0].length;
    const cierre = cierreBalanceado(s, m[1], trasAbre);
    if (!cierre) break;                       // etiqueta sin cerrar: se deja tal cual
    const cuerpo = s.slice(trasAbre, cierre.ini);

    let resuelto;
    if (m[1] === 'cada') {
      const lista = valor(ctx, m[2]);
      resuelto = Array.isArray(lista)
        ? lista.map((item, i) => render(cuerpo, { ...ctx, __item: item, __indice: i })).join('')
        : '';
    } else {
      const ok = cierto(valor(ctx, m[2]));
      resuelto = (m[1] === 'si' ? ok : !ok) ? render(cuerpo, ctx) : '';
    }
    salida += s.slice(0, m.index) + resuelto;
    s = s.slice(cierre.fin);
  }
  s = salida + s;

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
  // El cuerpo se inyecta en un marcador HTML, no en una llave de plantilla:
  // asi el motor no lo borra ni reinterpreta datos del cliente que traigan llaves.
  const html = render(leer('base'), ctx).replace('<!--CONTENIDO-->', () => cuerpo);
  // El texto plano sale del CUERPO, no del layout: sin preencabezado ni menus.
  const texto = aTexto(cuerpo) +
    `\n\n—\n${ctx.marca || ''}\nDejar de recibir estos avisos: ${ctx.url_baja || ''}`;
  return { asunto, html, texto };
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
    .split('\n').map((l) => l.trim()).join('\n')   // primero se limpia cada linea...
    .replace(/\n{3,}/g, '\n\n')                    // ...y recien ahi se juntan los huecos
    .trim();
}

// Formato de plata chilena: 69990 -> $69.990
export const pesos = (n) => '$' + Number(n || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 });
