// Proxy server-side: el navegador llama a /api/* (mismo origen) y este route
// reenvía al backend FastAPI local (127.0.0.1:8000) agregando el X-API-Token
// del lado servidor. Así el token NUNCA llega al navegador (queda secreto) y no
// hay CORS. Todo corre en el Mac mini detrás del túnel.

const BACKEND = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
const TOKEN = process.env.API_TOKEN ?? "";

async function handler(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const { path } = await ctx.params;
  const sub = (path ?? []).join("/");
  const url = new URL(req.url);
  const target = `${BACKEND}/api/${sub}${url.search}`;

  const headers: Record<string, string> = {};
  const ct = req.headers.get("content-type");
  if (ct) headers["Content-Type"] = ct;
  if (TOKEN) headers["X-API-Token"] = TOKEN;

  const init: RequestInit = { method: req.method, headers };
  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer();
  }

  const res = await fetch(target, init);
  // Reenvía la respuesta tal cual (incluye archivos binarios para descargas).
  const outHeaders = new Headers();
  const cd = res.headers.get("content-disposition");
  const oct = res.headers.get("content-type");
  if (cd) outHeaders.set("content-disposition", cd);
  if (oct) outHeaders.set("content-type", oct);
  return new Response(res.body, { status: res.status, headers: outHeaders });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
