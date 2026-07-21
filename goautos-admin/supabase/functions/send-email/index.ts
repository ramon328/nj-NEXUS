import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend@2.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// La API key de Resend viene SIEMPRE de variable de entorno (nunca hardcodeada).
// Setear el secret RESEND_API_KEY en Supabase antes de desplegar/rotar.
const resend = new Resend(Deno.env.get('RESEND_API_KEY') || '');

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const INTERNAL_SECRET = Deno.env.get('INTERNAL_SEND_EMAIL_SECRET') || '';
const EMAIL_ROLES = ['admin', 'superadmin', 'jefe_ventas', 'marketing'];

// Dominio verificado desde el que se puede enviar. Bloquea spoofing de otros
// dominios aunque un caller pase un `from` arbitrario.
function safeFrom(from: string): string {
  const match = /<([^>]+)>/.exec(from);
  const addr = (match ? match[1] : from).trim().toLowerCase();
  return addr.endsWith('@goauto.cl') ? from : 'reportes@goauto.cl';
}

// Autoriza al llamante: (a) secreto interno server-to-server, (b) service-role, o
// (c) usuario autenticado con rol permitido. Sin esto, cualquiera con el anon key
// (público) podía enviar correos HTML desde @goauto.cl a toda la base (phishing).
// Los sitios públicos (website-gocar) llaman anónimos: para ellos aplica
// isAllowedAnonymousRecipients (solo destinatarios registrados en la plataforma).
async function isAuthorized(req: Request): Promise<boolean> {
  const internal = req.headers.get('x-internal-secret') || '';
  if (INTERNAL_SECRET && internal === INTERNAL_SECRET) return true;

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return false;

  // Caller server-to-server con el service-role key (ej. onboard-client).
  if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY) return true;

  // Usuario autenticado real con rol permitido (marketing/updates desde el admin).
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;
  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: userData, error } = await supabase.auth.getUser(token);
    if (error || !userData?.user) return false;
    const { data: profile } = await supabase
      .from('users')
      .select('rol')
      .eq('auth_id', userData.user.id)
      .single();
    return !!profile && EMAIL_ROLES.includes(profile.rol);
  } catch (_) {
    return false;
  }
}

// Regex conservadora: además de validar forma de email, excluye caracteres que
// romperían el filtro `or(...)` de PostgREST (comas, comillas, paréntesis).
const SAFE_EMAIL_RE = /^[^\s@,()"']+@[^\s@,()"']+\.[^\s@,()"']+$/;

// Caso sitio público (visitante anónimo con el anon key): se permite el envío
// SOLO si todos los destinatarios son correos ya registrados en la plataforma
// (contactos de automotoras en clients.contact o usuarios/vendedores en users).
// Así los formularios del sitio siguen notificando a los dealers, pero un
// atacante con el anon key no puede usar la función como relay hacia terceros.
// Limitación conocida: la confirmación de cita al correo del cliente final
// (arbitrario) NO pasa este filtro; eso se resuelve con la función server-side
// que arma el email por client_id (fix definitivo).
async function isAllowedAnonymousRecipients(to: unknown): Promise<boolean> {
  if (!Array.isArray(to) || to.length === 0 || to.length > 10) return false;
  const recipients = to.map((e) => String(e).trim().toLowerCase());
  if (!recipients.every((e) => SAFE_EMAIL_RE.test(e))) return false;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return false;

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const registered = new Set<string>();

    // Contactos configurados por automotora (destinos de los formularios web).
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('contact')
      .not('contact', 'is', null);
    if (clientsError) return false;
    const CONTACT_LIST_KEYS = [
      'search_emails',
      'buy_emails',
      'finance_emails',
      'consignments_emails',
    ];
    for (const row of clients ?? []) {
      const contact = row.contact || {};
      if (typeof contact.email === 'string') {
        registered.add(contact.email.trim().toLowerCase());
      }
      for (const key of CONTACT_LIST_KEYS) {
        const list = contact[key];
        if (Array.isArray(list)) {
          for (const e of list) {
            if (typeof e === 'string') registered.add(e.trim().toLowerCase());
          }
        }
      }
    }

    // Usuarios de la plataforma (ej. vendedor asignado al vehículo de una cita).
    const pending = recipients.filter((e) => !registered.has(e));
    if (pending.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('email')
        .or(pending.map((e) => `email.ilike.${e}`).join(','));
      if (usersError) return false;
      for (const row of users ?? []) {
        if (typeof row.email === 'string') {
          registered.add(row.email.trim().toLowerCase());
        }
      }
    }

    return recipients.every((e) => registered.has(e));
  } catch (_) {
    return false;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string[];
  subject: string;
  content: string;
  from?: string;
  template_id?: string; // Optional template ID to use predefined templates
  template_data?: Record<string, any>; // Optional data to populate the template
  variables?: Record<string, any>; // Variables for personalization (like SendGrid)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let body: EmailRequest;
  try {
    body = await req.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!(await isAuthorized(req))) {
    // Formularios del sitio público: anónimo pero solo hacia correos registrados.
    if (!(await isAllowedAnonymousRecipients(body.to))) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('Anonymous send allowed (registered recipients):', body.to);
  }

  try {
    const {
      to,
      subject,
      content,
      from: fromRaw = 'reportes@goauto.cl',
      template_id,
      template_data,
      variables,
    }: EmailRequest = body;
    const from = safeFrom(fromRaw);

    if (!to || (!content && !template_id) || !subject) {
      throw new Error(
        'Missing required fields: to, subject, or content/template_id'
      );
    }

    let emailHtml = content;

    // If a template ID is provided, fetch and populate the template
    if (template_id) {
      emailHtml = await getTemplateContent(template_id, template_data || {});
    }

    // If variables are provided, replace placeholders in the content (like SendGrid)
    if (variables && emailHtml) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        emailHtml = emailHtml.replace(regex, String(value));
      });
    }

    console.log('Sending email with params:', {
      to,
      subject,
      from,
      template_id,
      variables: variables ? Object.keys(variables) : 'none',
    });

    const data = await resend.emails.send({
      from,
      to,
      subject,
      html: emailHtml,
    });

    // El SDK de Resend NO lanza en fallos de API: devuelve { data: null, error }.
    // Sin este chequeo, una key rotada o un destinatario inválido respondían 200
    // y los callers (alertas de provisioning, welcome email) creían que el correo
    // salió — fallo silencioso exactamente donde más duele.
    if ((data as { error?: { message?: string } | null })?.error) {
      const errMsg = (data as { error?: { message?: string } }).error?.message || 'Resend rechazó el envío';
      console.error('Resend API error:', errMsg);
      return new Response(JSON.stringify({ error: errMsg }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502,
      });
    }

    console.log('Email sent successfully:', data);

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending email:', error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

// Function to get template content and populate it with data
async function getTemplateContent(
  templateId: string,
  templateData: Record<string, any>
): Promise<string> {
  // For now we're just doing a simple template replacement,
  // but this could be expanded into a more robust templating system
  try {
    // In a real implementation, you would fetch the template from the database
    // For now we're just simulating this
    let templateContent = `<p>This is template ${templateId}</p>`;

    // Replace placeholders with actual data
    Object.entries(templateData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      templateContent = templateContent.replace(regex, String(value));
    });

    return templateContent;
  } catch (error) {
    console.error('Error getting template content:', error);
    throw new Error(`Unable to process template: ${error.message}`);
  }
}
