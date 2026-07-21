// Reverse proxy: expone el chat de programar (7683, bind Tailscale) bajo /code
// Reescribe rutas absolutas (/auth, /ws) y cookie Path para que funcione en subruta.
import http from 'http';
import net from 'net';

const BACK_HOST = '100.91.97.70';
const BACK_PORT = 7683;
const PREFIX = '/code';
const LISTEN = 7684;

function strip(url) {
  if (url === PREFIX) return '/';
  if (url.startsWith(PREFIX + '/')) return url.slice(PREFIX.length) || '/';
  if (url.startsWith(PREFIX + '?')) return '/' + url.slice(PREFIX.length);
  return url;
}

const server = http.createServer((req, res) => {
  const path = strip(req.url);
  const headers = { ...req.headers, host: `${BACK_HOST}:${BACK_PORT}` };
  const preq = http.request({ host: BACK_HOST, port: BACK_PORT, method: req.method, path, headers }, (pres) => {
    const h = { ...pres.headers };
    if (h['set-cookie']) h['set-cookie'] = h['set-cookie'].map(c => c.replace(/Path=\//gi, 'Path=' + PREFIX));
    const ct = h['content-type'] || '';
    if (ct.includes('text/html')) {
      delete h['content-length'];
      const chunks = [];
      pres.on('data', d => chunks.push(d));
      pres.on('end', () => {
        let body = Buffer.concat(chunks).toString('utf8');
        body = body.split("fetch('/auth'").join(`fetch('${PREFIX}/auth'`);
        body = body.split("location.host+'/ws'").join(`location.host+'${PREFIX}/ws'`);
        res.writeHead(pres.statusCode, h);
        res.end(body);
      });
    } else {
      res.writeHead(pres.statusCode, h);
      pres.pipe(res);
    }
  });
  preq.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('proxy err'); });
  req.pipe(preq);
});

server.on('upgrade', (req, socket, head) => {
  const path = strip(req.url);
  const back = net.connect(BACK_PORT, BACK_HOST, () => {
    const h = { ...req.headers, host: `${BACK_HOST}:${BACK_PORT}` };
    const lines = [`${req.method} ${path} HTTP/1.1`];
    for (const k in h) lines.push(`${k}: ${Array.isArray(h[k]) ? h[k].join(', ') : h[k]}`);
    back.write(lines.join('\r\n') + '\r\n\r\n');
    if (head && head.length) back.write(head);
    socket.pipe(back);
    back.pipe(socket);
  });
  back.on('error', () => socket.destroy());
  socket.on('error', () => back.destroy());
});

server.listen(LISTEN, '127.0.0.1', () => console.log(`code-proxy: ${PREFIX} -> ${BACK_HOST}:${BACK_PORT} en 127.0.0.1:${LISTEN}`));
