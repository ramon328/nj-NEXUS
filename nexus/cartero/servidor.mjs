// Servidor del Cartero: API de envio, tracking, bajas y panel.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, ahora } from './db.mjs';
import { encolar, registrarEvento, firmaValida, deB64, leerTokenBaja, suprimir, estaSuprimido } from './correo.mjs';
import { arrancarCola, vaciar, resumen } from './cola.mjs';
import { arrancarVigia, revisar } from './vigia.mjs';
import { validar } from './llaves.mjs';
import { verificar, modo } from './transporte.mjs';
import { pedido as traerPedido } from './clivox.mjs';

const raiz = path.dirname(fileURLToPath(import.meta.url));
process.loadEnvFile(path.join(raiz, '.env'));
const PUERTO = Number(process.env.CARTERO_PUERTO || 7695);

// GIF transparente de 1x1 para el pixel de apertura.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

const json = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj, null, 2));
};
const html = (res, code, cuerpo) => {
  res.writeHead(code, { 'content-type': 'text/html; charset=utf-8' });
  res.end(cuerpo);
};

const leerCuerpo = (req) => new Promise((ok, mal) => {
  let d = ''; let n = 0;
  req.on('data', (c) => { n += c.length; if (n > 1e6) { mal(new Error('cuerpo muy grande')); req.destroy(); } d += c; });
  req.on('end', () => { try { ok(d ? JSON.parse(d) : {}); } catch { mal(new Error('json invalido')); } });
  req.on('error', mal);
});

function autorizar(req) {
  const h = req.headers.authorization || '';
  const llave = h.startsWith('Bearer ') ? h.slice(7).trim() : (req.headers['x-api-key'] || '').trim();
  return validar(llave);
}

// Limite simple por llave: evita que un bucle en la web dispare miles de correos.
const golpes = new Map();
function pasaLimite(id, max = 120, ventana = 60000) {
  const t = ahora();
  const lista = (golpes.get(id) || []).filter((x) => t - x < ventana);
  lista.push(t); golpes.set(id, lista);
  return lista.length <= max;
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const ruta = url.pathname;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  try {
    // ---------- salud ----------
    if (ruta === '/salud') return json(res, 200, { ok: true, modo, cola: resumen() });

    // ---------- pixel de apertura ----------
    if (ruta.startsWith('/t/a/')) {
      const [id, firma] = ruta.slice(5).replace(/\.png$/, '').split('.');
      if (firmaValida(id, firma)) {
        const ya = db.prepare("SELECT 1 FROM eventos WHERE mensaje_id=? AND tipo='abierto' LIMIT 1").get(id);
        registrarEvento(id, ya ? 'abierto_repetido' : 'abierto', null, ip, req.headers['user-agent']);
      }
      res.writeHead(200, { 'content-type': 'image/gif', 'cache-control': 'no-store, no-cache, must-revalidate', pragma: 'no-cache' });
      return res.end(PIXEL);
    }

    // ---------- clic en enlace ----------
    if (ruta.startsWith('/t/c/')) {
      const [id, firma] = ruta.slice(5).split('.');
      let destino = process.env.CLIVOX_SITIO || 'https://clivox.cl';
      const cruda = url.searchParams.get('u');
      if (cruda) {
        try {
          const d = deB64(cruda);
          // Solo http/https: sin esto un enlace manipulado podria apuntar a javascript:
          if (/^https?:\/\//i.test(d)) destino = d;
        } catch { /* se queda el destino por defecto */ }
      }
      if (firmaValida(id, firma)) registrarEvento(id, 'clic', destino, ip, req.headers['user-agent']);
      res.writeHead(302, { location: destino, 'cache-control': 'no-store' });
      return res.end();
    }

    // ---------- baja ----------
    if (ruta.startsWith('/baja/')) {
      const email = leerTokenBaja(ruta.slice(6));
      if (!email) return html(res, 400, '<p style="font-family:system-ui;padding:40px">Enlace de baja no válido.</p>');
      // One-click de Gmail/Outlook: llega por POST y hay que darlo de baja al toque.
      if (req.method === 'POST') { suprimir(email, 'baja_usuario'); return json(res, 200, { ok: true }); }
      suprimir(email, 'baja_usuario');
      return html(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
        <div style="font-family:-apple-system,system-ui,sans-serif;max-width:460px;margin:14vh auto;padding:0 24px;color:#18181b;text-align:center">
          <h1 style="font-size:22px;letter-spacing:-.4px">Listo, te diste de baja</h1>
          <p style="color:#71717a;line-height:1.6">No recibirás más correos promocionales en <strong>${email}</strong>.</p>
          <p style="color:#a1a1aa;font-size:13px;line-height:1.6">Los avisos sobre pedidos que ya hiciste (pagos, despachos) los seguirás recibiendo, porque son parte de tu compra.</p>
        </div>`);
    }

    // ---------- vista previa de plantillas ----------
    // /vista?plantilla=pedido-enviado[&pedido=<id>]  -> renderiza sin enviar nada.
    // Solo escucha en loopback, asi que no queda expuesta.
    if (ruta === '/vista') {
      const { armar } = await import('./plantillas.mjs');
      const nombre = url.searchParams.get('plantilla') || 'pedido-enviado';
      const idPedido = url.searchParams.get('pedido');
      let datos;
      if (idPedido) {
        datos = await traerPedido(idPedido);
        if (!datos) return html(res, 404, 'pedido no encontrado');
      } else {
        // Datos de muestra para revisar el diseno sin depender de la base.
        datos = {
          cliente: 'Ramón', pedido_corto: 'AB12CD34', pago: 'Mercado Pago',
          items: [{ nombre: 'Producto de ejemplo', cantidad: 2, total: '$19.980', imagen: '' }],
          subtotal_f: '$19.980', envio_f: 'Gratis', total_f: '$19.980',
          direccion: 'Av. Siempre Viva 742, Providencia, Santiago',
          tracking: '1234567890', carrier: 'Starken', estado: 'enviado',
        };
      }
      const ctx = {
        ...datos, marca: process.env.CARTERO_DE_NOMBRE || 'Clivox',
        url_sitio: process.env.CLIVOX_SITIO || 'https://clivox.cl',
        url_baja: '#', url_boton: '#', texto_boton: 'Ver mi pedido',
        preview: '', titulo: 'vista previa',
      };
      try { return html(res, 200, armar(nombre, ctx).html); }
      catch (e) { return html(res, 404, 'no existe esa plantilla: ' + e.message); }
    }

    // ---------- panel ----------
    if (ruta === '/' || ruta === '/panel') {
      return html(res, 200, fs.readFileSync(path.join(raiz, 'panel', 'index.html'), 'utf8'));
    }

    // ================= API (requiere llave) =================
    if (ruta.startsWith('/api/')) {
      const llave = autorizar(req);
      if (!llave) return json(res, 401, { error: 'falta o no sirve la llave de API' });
      if (!pasaLimite(llave.id)) return json(res, 429, { error: 'demasiadas peticiones, espera un momento' });

      if (ruta === '/api/enviar' && req.method === 'POST') {
        const c = await leerCuerpo(req);
        const r = encolar({ ...c, origen: c.origen || `api:${llave.nombre}` });
        if (r.ok) vaciar().catch(() => {});
        return json(res, r.ok ? 202 : 400, r);
      }

      // Fuerza el aviso de un pedido puntual (util para reenviar a mano).
      if (ruta.startsWith('/api/pedido/') && req.method === 'POST') {
        const id = ruta.split('/')[3];
        const p = await traerPedido(id);
        if (!p) return json(res, 404, { error: 'pedido no encontrado' });
        if (!p.email) return json(res, 400, { error: 'el pedido no tiene email' });
        const { plantillaDe } = await import('./vigia.mjs');
        const c = await leerCuerpo(req).catch(() => ({}));
        const r = encolar({
          para: p.email, para_nombre: p.cliente_completo || undefined,
          plantilla: c.plantilla || plantillaDe(p.estado),
          datos: { ...p, preview: `Pedido #${p.pedido_corto} · ${p.total_f}` },
          idempotencia: c.reenviar ? undefined : `pedido:${p.id}:${p.estado}:${p.tracking || '-'}`,
          forzar: true, origen: 'api:pedido',
        });
        if (r.ok) vaciar().catch(() => {});
        return json(res, r.ok ? 202 : 400, r);
      }

      if (ruta === '/api/revisar' && req.method === 'POST') {
        const c = await leerCuerpo(req).catch(() => ({}));
        return json(res, 200, await revisar(c));
      }

      if (ruta === '/api/estado') {
        const ult = db.prepare(`SELECT id,para,asunto,estado,plantilla,intentos,creado,enviado,error
                                FROM mensajes ORDER BY creado DESC LIMIT 50`).all();
        const ev = db.prepare(`SELECT tipo, COUNT(*) n FROM eventos GROUP BY tipo`).all();
        return json(res, 200, {
          modo, cola: resumen(),
          eventos: Object.fromEntries(ev.map((e) => [e.tipo, e.n])),
          suprimidos: db.prepare('SELECT COUNT(*) n FROM supresiones').get().n,
          ultimos: ult,
        });
      }

      if (ruta === '/api/transporte') return json(res, 200, await verificar());

      if (ruta === '/api/suprimidos') {
        if (req.method === 'POST') {
          const c = await leerCuerpo(req);
          suprimir(c.email, c.motivo || 'manual', c.nota);
          return json(res, 200, { ok: true });
        }
        return json(res, 200, db.prepare('SELECT * FROM supresiones ORDER BY creado DESC LIMIT 200').all());
      }

      return json(res, 404, { error: 'ruta de API desconocida' });
    }

    return json(res, 404, { error: 'no existe' });
  } catch (e) {
    console.error('[servidor]', e);
    return json(res, 500, { error: e.message });
  }
});

// Escucha solo en loopback: el panel y la API no se exponen a la red local.
// Lo unico que necesita ser publico es el tracking, y eso sale por el tunel
// que apunta a CARTERO_URL_PUBLICA.
servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[cartero] el puerto ${PUERTO} ya esta ocupado por otro servicio. Cambia CARTERO_PUERTO en .env.`);
    process.exit(1);
  }
  console.error('[cartero] error del servidor:', e.message);
  process.exit(1);
});

servidor.listen(PUERTO, '127.0.0.1', async () => {
  console.log(`[cartero] escuchando en http://127.0.0.1:${PUERTO}  (transporte: ${modo})`);
  const v = await verificar();
  console.log('[cartero] transporte:', JSON.stringify(v));
  arrancarCola(15000);
  arrancarVigia(Number(process.env.CARTERO_VIGIA_MS || 60000));
  console.log('[cartero] cola cada 15s · vigia cada', (Number(process.env.CARTERO_VIGIA_MS || 60000) / 1000), 's');
});
