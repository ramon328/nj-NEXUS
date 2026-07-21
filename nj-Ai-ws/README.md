# nj-Ai-ws — Worker de WhatsApp (Render + proxy chilena)

Conecta el número de WhatsApp de la empresa (vía no oficial, QR como "WhatsApp Web")
y corre 24/7 en Render. La IA redacta y responde sola; este worker sólo **envía y
recibe** por WhatsApp. Detrás de una **proxy chilena** para que la línea no la baneen.

```
[ Web (Vercel) ] —escribe el mensaje→ /api/outreach (IA Haiku)
        ▲                                   │
        │ realtime                          ▼
   [ Supabase ] ◀──cola / mensajes──▶ [ este worker en Render ] ──proxy CL──▶ WhatsApp
```

## Desplegar en Render (una vez)

1. **New + → Blueprint**, conectá este repo. Render lee `render.yaml` y crea un
   web service Docker (plan **Starter**, siempre prendido) con un **disco
   persistente** en `/data` (ahí vive la sesión → no se re-escanea el QR).
2. En **Environment**, cargá los secretos (los demás ya vienen del blueprint):
   - `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` — las del proyecto Autos Intel.
   - `PROXY_URL` — tu proxy chilena: `http://usuario:clave@host:puerto`
     (o `http://host:puerto` si autoriza por IP).
   - `QR_TOKEN` *(opcional)* — si lo seteás, la página del QR pide `?token=...`.
3. **Deploy**. Cuando esté arriba, abrí la **URL pública** del servicio:
   - Muestra el **QR** → en el teléfono de la empresa: WhatsApp → *Dispositivos
     vinculados* → *Vincular un dispositivo* → escaneá.
   - Al vincularse, la página pasa a **✅ conectado** y empieza a enviar/responder.
   - La sesión queda en el disco → en próximos deploys **no** pide QR de nuevo.

> ¿Por qué un disco persistente? El disco normal de Render se borra en cada
> deploy. Con el disco montado en `/data`, la sesión sobrevive y no hay que
> re-vincular nunca más.

## Correr local (para probar)

```bash
cp .env.example .env   # completá SUPABASE_*, PROXY_URL, CHROME_PATH
npm install
npm start              # abrí http://localhost:3000 para escanear el QR
```

## Variables de entorno

| Variable | Qué es |
|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | Base de datos (requeridas) |
| `OUTREACH_API_URL` | Endpoint IA en Vercel que redacta/responde |
| `WA_AUTO_REPLY` | `1` = la IA responde sola (solo a quienes contactó primero) |
| `PROXY_URL` | Proxy chilena de salida |
| `WWEBJS_DATA_PATH` | Carpeta de la sesión (`/data/.wwebjs_auth` en Render) |
| `CHROME_PATH` | Chrome del sistema (`/usr/bin/chromium` en Docker) |
| `QR_TOKEN` | Opcional: protege la página `/qr` |

## Importante

- **Un solo worker a la vez** procesando la cola. Si lo prendés en Render,
  **apagá** el de tu laptop para no duplicar envíos.
- La IA **solo responde** a números que **ella contactó primero**.
- La línea es no oficial: el envío va **escalonado y con pausas** (anti-bloqueo).
