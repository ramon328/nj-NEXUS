// Autenticación al SII con clave tributaria (RUT + clave).
// Reutilizable por los descargadores (RCV, DTE, F29). No imprime la clave.
// login(rutConDv, clave) -> { cookieHeader, jar, rutSinDv, dv }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

export function nuevaJar() {
  const jar = new Map();
  return {
    guardar(res) {
      const set = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
      for (const c of set) {
        const [pair] = c.split(';');
        const i = pair.indexOf('=');
        if (i > 0) jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
      }
    },
    header() { return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; '); },
    keys() { return [...jar.keys()]; },
    map: jar,
  };
}

export async function login(rutConDv, clave) {
  const [rutSinDv, dv] = rutConDv.split('-');
  const rutcntr = rutSinDv + dv;
  const jar = nuevaJar();
  const referencia = 'https://misiir.sii.cl/cgi_misii/siihome.cgi';
  const body = new URLSearchParams({ rut: rutSinDv, dv, referencia, '411': '', rutcntr, clave });

  const res = await fetch('https://zeusr.sii.cl/cgi_AUT2000/CAutInicio.cgi', {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      'Origin': 'https://zeusr.sii.cl',
      'Referer': 'https://zeusr.sii.cl/AUT2000/InicioAutenticacion/IngresoRutClave.html',
    },
    body,
  });
  jar.guardar(res);
  const html = await res.text();
  const cookieSesion = jar.keys().some(k => /token|netscape|csession/i.test(k));
  if (!cookieSesion) {
    const m = html.match(/<[^>]*>([^<]{8,140}?(no son|incorrecta|coinciden|bloquead)[^<]*)</i);
    throw new Error('Login SII falló' + (m ? ': ' + m[1].trim() : ' (sin cookie de sesión)'));
  }
  return { cookieHeader: jar.header(), jar, rutSinDv, dv, ua: UA };
}

// logout(sesion): cierra la sesión en el SII (best-effort, sin reintentos, no lanza).
// Evita dejar sesiones colgando. OJO: endpoints aún no validados contra el SII en vivo
// (no hemos vuelto a iniciar sesión); se confirman en la primera corrida real.
export async function logout(sesion) {
  if (!sesion?.jar) return;
  const headers = { 'User-Agent': sesion.ua || UA, 'Cookie': sesion.jar.header() };
  const urls = [
    'https://misiir.sii.cl/cgi_misii/siisalida.cgi',     // salida Mi SII
    'https://zeusr.sii.cl/cgi_AUT2000/CAutFin.cgi',       // fin de autenticación
  ];
  for (const u of urls) {
    try { await fetch(u, { headers, redirect: 'manual' }); } catch { /* ignorar */ }
  }
}

export { UA };
