# Usar el Cartero desde la web de Clivox

## 1. Los correos de pedido: no hay que programar nada

El vigia del Cartero mira la tabla `orders` cada minuto. Cuando cambia `status`,
manda el correo que corresponde. En la web solo tienes que hacer lo de siempre:

```js
await supabase.from('orders').update({ status: 'enviado', tracking: 'ST123', carrier: 'Starken' }).eq('id', id);
// listo: el correo sale solo, sin tocar nada mas
```

Estados reconocidos: `pendiente`, `pagado`, `preparando`, `enviado`, `entregado`,
`cancelado`. Cualquier otro estado usa la plantilla generica `pedido-actualizado`.

## 2. Correos que no vienen de un pedido

```js
// app/api/contacto/route.js
import { enviarCorreo } from '@/lib/cartero';

export async function POST(req) {
  const { email, nombre } = await req.json();
  await enviarCorreo({
    para: email,
    asunto: `Gracias por escribirnos, ${nombre}`,
    html: `<p>Recibimos tu mensaje, te respondemos dentro del dia.</p>`,
    idempotencia: `contacto:${email}:${new Date().toISOString().slice(0,10)}`,
  });
  return Response.json({ ok: true });
}
```

## 3. Variables de entorno de la web

```
CARTERO_URL=https://<tu-tunel>       # o http://127.0.0.1:7700 si la web corre en el mismo mini
CARTERO_LLAVE=ck_...                 # la que genera: node llaves.mjs crear "Web Clivox"
```

## 4. La clave de idempotencia

Manda siempre `idempotencia` con algo unico y estable. Es lo que evita que un
doble clic, un reintento de Vercel o un refresh manden el correo dos veces.
