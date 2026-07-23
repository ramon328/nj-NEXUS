// banco-proxy.mjs — Reverse proxy: expone el widget de conectar banco (7694, bind Tailscale)
// bajo /banco en el Funnel público, para que el link sea HTTPS y CLICKEABLE desde el teléfono
// (sin Tailscale). Reescribe rutas absolutas (/auth, /empresas, /guardar) y la cookie Path
// para que funcione en subruta. Mismo patrón que claude-web/code-proxy.mjs.
import http from 'node:http'

const BACK_HOST = process.env.BANCO_BACK_HOST || '100.91.97.70'
const BACK_PORT = Number(process.env.BANCO_BACK_PORT || 7694)
const PREFIX = '/banco'
const LISTEN = Number(process.env.BANCO_PROXY_PORT || 7695)

function strip(url) {
  if (url === PREFIX) return '/'
  if (url.startsWith(PREFIX + '/')) return url.slice(PREFIX.length) || '/'
  if (url.startsWith(PREFIX + '?')) return '/' + url.slice(PREFIX.length)
  return url
}

const server = http.createServer((req, res) => {
  const path = strip(req.url)
  const headers = { ...req.headers, host: `${BACK_HOST}:${BACK_PORT}` }
  const preq = http.request({ host: BACK_HOST, port: BACK_PORT, method: req.method, path, headers }, (pres) => {
    const h = { ...pres.headers }
    if (h['set-cookie']) h['set-cookie'] = h['set-cookie'].map((c) => c.replace(/Path=\//gi, 'Path=' + PREFIX))
    const ct = h['content-type'] || ''
    if (ct.includes('text/html')) {
      delete h['content-length']
      const chunks = []
      pres.on('data', (d) => chunks.push(d))
      pres.on('end', () => {
        let body = Buffer.concat(chunks).toString('utf8')
        // Reescribe TODAS las llamadas fetch del widget para que vayan bajo /banco. Matcheamos
        // el PREFIJO de la ruta (sin exigir la comilla de cierre) → cubre también las que llevan
        // query, ej. fetch('/conexiones?userId=...').
        for (const p of ['/auth', '/empresas', '/guardar', '/conexiones']) {
          body = body.split(`fetch('${p}`).join(`fetch('${PREFIX}${p}`)
        }
        res.writeHead(pres.statusCode, h)
        res.end(body)
      })
    } else {
      res.writeHead(pres.statusCode, h)
      pres.pipe(res)
    }
  })
  preq.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('proxy err') })
  req.pipe(preq)
})

server.listen(LISTEN, '127.0.0.1', () => console.log(`banco-proxy: ${PREFIX} -> ${BACK_HOST}:${BACK_PORT} en 127.0.0.1:${LISTEN}`))
