import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { reportError } from '../_shared/error-reporter.ts';

// ==========================================================================
// Web Push implementation using Web Crypto API (Deno-native, no web-push)
// Implements VAPID (RFC 8292) + aes128gcm encryption (RFC 8291 / RFC 8188)
// ==========================================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ========================= Helpers =========================

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const len = arrays.reduce((a, b) => a + b.length, 0);
  const result = new Uint8Array(len);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function hkdfDerive(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  length: number,
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// ========================= VAPID =========================

let vapidSigningKey: CryptoKey | null = null;
let vapidPublicKeyB64url = '';
let vapidSubject = '';

async function ensureVapid() {
  if (vapidSigningKey) return;

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';
  vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@goauto.cl';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.');
  }

  vapidPublicKeyB64url = publicKey;

  // VAPID public key is 65-byte uncompressed P-256 point (04 || x || y)
  const pubBytes = b64urlDecode(publicKey);
  const x = b64urlEncode(pubBytes.slice(1, 33));
  const y = b64urlEncode(pubBytes.slice(33, 65));

  vapidSigningKey = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x, y, d: privateKey },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

async function createVapidAuth(endpoint: string) {
  const url = new URL(endpoint);
  const aud = `${url.protocol}//${url.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;

  const headerB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify({ aud, exp, sub: vapidSubject })));
  const unsigned = `${headerB64}.${payloadB64}`;

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    vapidSigningKey!,
    new TextEncoder().encode(unsigned),
  );

  const jwt = `${unsigned}.${b64urlEncode(sig)}`;
  return `vapid t=${jwt}, k=${vapidPublicKeyB64url}`;
}

// ========================= Payload Encryption (RFC 8291) =========================

async function encryptPayload(
  payload: string,
  p256dhB64url: string,
  authB64url: string,
): Promise<Uint8Array> {
  const subscriberPubBytes = b64urlDecode(p256dhB64url);
  const authSecret = b64urlDecode(authB64url);
  const plaintext = new TextEncoder().encode(payload);

  // 1. Ephemeral ECDH key pair
  const localKeys = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );

  // 2. Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    'raw',
    subscriberPubBytes,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );

  // 3. ECDH shared secret
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: subscriberKey },
      localKeys.privateKey,
      256,
    ),
  );

  // 4. Export local public key (65 bytes uncompressed)
  const localPubBytes = new Uint8Array(
    await crypto.subtle.exportKey('raw', localKeys.publicKey),
  );

  // 5. Random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 6. Derive IKM: HKDF(salt=authSecret, ikm=ecdhSecret, info="WebPush: info\0"||ua_pub||as_pub, 32)
  const keyInfo = concat(
    new TextEncoder().encode('WebPush: info\0'),
    subscriberPubBytes,
    localPubBytes,
  );
  const ikm = await hkdfDerive(ecdhSecret, authSecret, keyInfo, 32);

  // 7. Derive content encryption key & nonce
  const cek = await hkdfDerive(ikm, salt, new TextEncoder().encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfDerive(ikm, salt, new TextEncoder().encode('Content-Encoding: nonce\0'), 12);

  // 8. Pad plaintext: data || 0x02 (final record delimiter)
  const padded = concat(plaintext, new Uint8Array([2]));

  // 9. AES-128-GCM encrypt (output = ciphertext + 16-byte tag)
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded),
  );

  // 10. Build aes128gcm body: salt(16) || rs(4) || idlen(1) || keyid(65) || encrypted
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);

  return concat(salt, rs, new Uint8Array([65]), localPubBytes, encrypted);
}

// ========================= Send Push =========================

async function sendWebPush(
  endpoint: string,
  p256dh: string,
  authKey: string,
  payload: string,
): Promise<{ ok: boolean; gone: boolean }> {
  try {
    const authorization = await createVapidAuth(endpoint);
    const body = await encryptPayload(payload, p256dh, authKey);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: '86400',
        Urgency: 'high',
      },
      body,
    });

    if (res.ok) return { ok: true, gone: false };

    const status = res.status;
    const gone = status === 404 || status === 410;
    const text = await res.text().catch(() => '');
    console.error(`Push failed (${status}):`, text);
    return { ok: false, gone };
  } catch (err: any) {
    console.error('Push send error:', err.message);
    return { ok: false, gone: false };
  }
}

async function cleanupSubscription(endpoint: string) {
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  console.log('Cleaned up expired subscription:', endpoint.substring(0, 60));
}

// ========================= Main Handler =========================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    await ensureVapid();
    const body = await req.json();

    // =========================================================================
    // Mode 1: Process queue
    // =========================================================================
    if (body.processQueue) {
      const { data: items, error: fetchError } = await supabase
        .from('push_notification_queue')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10);

      if (fetchError) throw fetchError;
      if (!items || items.length === 0) {
        return jsonResponse({ processed: 0 });
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const item of items) {
        const { error: processingError } = await supabase
          .from('push_notification_queue')
          .update({ status: 'processing', attempts: item.attempts + 1 })
          .eq('id', item.id);

        if (processingError) {
          console.error(`Error marking item ${item.id} as processing:`, processingError);
        }

        // Build subscription query with targeting support
        let subsQuery = supabase
          .from('push_subscriptions')
          .select('endpoint, p256dh, auth_key')
          .eq('client_id', item.client_id)
          .eq('is_active', true);

        // If targeting a specific user, only send to their devices
        if (item.target_user_id) {
          subsQuery = subsQuery.eq('user_auth_id', item.target_user_id);
        }
        // If targeting a specific role, filter by role via users table
        else if (item.target_role) {
          const { data: roleUsers, error: roleError } = await supabase
            .from('users')
            .select('auth_id')
            .eq('client_id', item.client_id)
            .eq('rol', item.target_role);

          if (roleError) {
            console.error(`Error fetching users with role "${item.target_role}":`, roleError);
          }

          if (roleUsers && roleUsers.length > 0) {
            const authIds = roleUsers.map((u: { auth_id: string }) => u.auth_id);
            subsQuery = subsQuery.in('user_auth_id', authIds);
          } else {
            // No users with this role — skip
            await supabase
              .from('push_notification_queue')
              .update({ status: 'failed', error_message: `No users with role "${item.target_role}"`, processed_at: new Date().toISOString() })
              .eq('id', item.id);
            failedCount++;
            continue;
          }
        }

        const { data: subscriptions, error: subsError } = await subsQuery;

        if (subsError) {
          console.error(`Error fetching subscriptions for item ${item.id}:`, subsError);
        }

        if (!subscriptions || subscriptions.length === 0) {
          await supabase
            .from('push_notification_queue')
            .update({ status: 'failed', error_message: 'No active subscriptions', processed_at: new Date().toISOString() })
            .eq('id', item.id);
          failedCount++;
          continue;
        }

        const payload = JSON.stringify({
          title: item.title,
          body: item.body,
          icon: item.icon || '/pwa-icons/icon-192x192.png',
          url: item.url || '/',
          data: item.data,
        });

        let anySent = false;
        for (const sub of subscriptions) {
          const result = await sendWebPush(sub.endpoint, sub.p256dh, sub.auth_key, payload);
          if (result.ok) anySent = true;
          if (result.gone) await cleanupSubscription(sub.endpoint);
        }

        await supabase
          .from('push_notification_queue')
          .update({
            status: anySent ? 'sent' : 'failed',
            error_message: anySent ? null : 'All subscriptions failed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        if (anySent) sentCount++;
        else failedCount++;
      }

      return jsonResponse({ processed: items.length, sent: sentCount, failed: failedCount });
    }

    // =========================================================================
    // Mode 2: Send test notification to a specific user
    // =========================================================================
    if (body.type === 'test') {
      const { clientId, targetAuthId } = body;
      if (!clientId || !targetAuthId) {
        return jsonResponse({ error: 'clientId and targetAuthId required' }, 400);
      }

      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('endpoint, p256dh, auth_key')
        .eq('client_id', clientId)
        .eq('user_auth_id', targetAuthId)
        .eq('is_active', true);

      if (!subscriptions || subscriptions.length === 0) {
        return jsonResponse({ error: 'No active push subscriptions for this user' }, 404);
      }

      const payload = JSON.stringify({
        title: 'GoAuto — Prueba',
        body: 'Las notificaciones push están funcionando correctamente.',
        icon: '/pwa-icons/icon-192x192.png',
        url: '/configuracion#tab=notifications',
      });

      let sentCount = 0;
      for (const sub of subscriptions) {
        const result = await sendWebPush(sub.endpoint, sub.p256dh, sub.auth_key, payload);
        if (result.ok) sentCount++;
        if (result.gone) await cleanupSubscription(sub.endpoint);
      }

      if (sentCount === 0) {
        return jsonResponse({ error: 'Failed to deliver to any device' }, 500);
      }

      return jsonResponse({ success: true, devicesReached: sentCount });
    }

    return jsonResponse({ error: 'Invalid request. Use { processQueue: true } or { type: "test", ... }' }, 400);

  } catch (error: any) {
    console.error('Error in send-push-notification:', error);
    await reportError({ functionName: 'send-push-notification', error });
    return jsonResponse({ error: error.message }, 500);
  }
});
