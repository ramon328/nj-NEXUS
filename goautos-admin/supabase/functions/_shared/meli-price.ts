// Empuja el precio de un item a MercadoLibre (PUT /items/{id} { price }).
// GoAuto es la fuente de verdad del precio: cuando el cliente lo cambia en su
// panel, hay que reflejarlo en la publicación. ML solo acepta editar el precio
// de items activos; en closed/paused devuelve error (lo reportamos, no rompe).

export interface PushPriceResult {
  ok: boolean;
  error?: string;
  details?: unknown;
}

export async function pushMeliItemPrice(
  accessToken: string,
  meliItemId: string,
  price: number
): Promise<PushPriceResult> {
  try {
    const resp = await fetch(`https://api.mercadolibre.com/items/${meliItemId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ price }),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.error) {
      return {
        ok: false,
        error: data?.message || data?.error || `HTTP ${resp.status}`,
        details: data,
      };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'network', details: String(e) };
  }
}
