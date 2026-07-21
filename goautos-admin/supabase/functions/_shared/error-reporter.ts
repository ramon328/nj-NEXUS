import { supabase } from './supabase-client.ts';
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') || '');
const ALERT_EMAIL = 'nicolaspatriciomorenoavila@gmail.com';

interface ErrorReport {
  functionName: string;
  error: Error | string;
  clientId?: number;
  severity?: 'warning' | 'error' | 'critical';
  requestPayload?: any;
  details?: Record<string, any>;
}

/**
 * Reports an error: saves to DB + sends email for critical/error severity.
 * Non-blocking: won't throw if reporting itself fails.
 */
export async function reportError(report: ErrorReport): Promise<void> {
  const {
    functionName,
    error,
    clientId,
    severity = 'error',
    requestPayload,
    details,
  } = report;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const stackTrace = error instanceof Error ? error.stack : undefined;

  try {
    // 1. Save to database
    const { error: dbError } = await supabase
      .from('edge_function_errors')
      .insert({
        function_name: functionName,
        error_message: errorMessage,
        error_details: details || {},
        client_id: clientId || null,
        severity,
        request_payload: requestPayload ? sanitizePayload(requestPayload) : null,
        stack_trace: stackTrace || null,
      });

    if (dbError) {
      console.error('[ErrorReporter] Failed to save error to DB:', dbError);
    }

    // 2. Send email for error and critical severity
    if (severity === 'error' || severity === 'critical') {
      await sendErrorEmail(functionName, errorMessage, severity, clientId, details);
    }
  } catch (reportingError) {
    // Never let error reporting break the main flow
    console.error('[ErrorReporter] Failed to report error:', reportingError);
  }
}

function sanitizePayload(payload: any): any {
  try {
    const str = JSON.stringify(payload);
    // Limit payload size to 10KB
    if (str.length > 10000) {
      return { _truncated: true, _size: str.length, _preview: str.substring(0, 500) };
    }
    return payload;
  } catch {
    return { _error: 'Could not serialize payload' };
  }
}

async function sendErrorEmail(
  functionName: string,
  errorMessage: string,
  severity: string,
  clientId?: number,
  details?: Record<string, any>,
): Promise<void> {
  const severityEmoji = severity === 'critical' ? '🔴' : '🟠';
  const timestamp = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });

  const detailsHtml = details
    ? Object.entries(details)
        .map(([k, v]) => `<tr><td style="padding:4px 8px;font-weight:bold;color:#64748b">${k}</td><td style="padding:4px 8px">${typeof v === 'object' ? JSON.stringify(v) : v}</td></tr>`)
        .join('')
    : '';

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:${severity === 'critical' ? '#dc2626' : '#f97316'};color:white;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">${severityEmoji} Error en Edge Function</h2>
      </div>
      <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:4px 8px;font-weight:bold;color:#64748b">Funcion</td><td style="padding:4px 8px;font-family:monospace;font-weight:bold">${functionName}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;color:#64748b">Severidad</td><td style="padding:4px 8px">${severity.toUpperCase()}</td></tr>
          <tr><td style="padding:4px 8px;font-weight:bold;color:#64748b">Fecha</td><td style="padding:4px 8px">${timestamp}</td></tr>
          ${clientId ? `<tr><td style="padding:4px 8px;font-weight:bold;color:#64748b">Client ID</td><td style="padding:4px 8px">${clientId}</td></tr>` : ''}
          ${detailsHtml}
        </table>
        <div style="margin-top:12px;padding:12px;background:#1e293b;color:#f87171;border-radius:6px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-all">${errorMessage}</div>
      </div>
      <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:12px">GoAuto Error Monitor</p>
    </div>
  `;

  try {
    await resend.emails.send({
      from: 'GoAuto Alertas <reportes@goauto.cl>',
      to: [ALERT_EMAIL],
      subject: `${severityEmoji} [${severity.toUpperCase()}] ${functionName}: ${errorMessage.substring(0, 80)}`,
      html,
    });
  } catch (emailError) {
    console.error('[ErrorReporter] Failed to send alert email:', emailError);
  }
}
