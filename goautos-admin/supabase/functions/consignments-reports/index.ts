import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// @ts-ignore: Import types but ignore TS errors for Deno environment
import {
  Vehicle,
  VehicleConsignment,
  Client,
  ClientVehicleStatus,
  Customer,
} from '../_shared/types.ts';
import { supabase } from '../_shared/supabase-client.ts';
import { generatePublishedVehicleHtml } from './published-vehicle-report.ts';
import { generateUnpublishedVehicleHtml } from './unpublished-vehicle-report.ts';
import { formatNumber } from './utils.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Para pruebas: enviar correos solo a esta dirección
const TEST_EMAIL = 'nicopirozzi1@gmail.com';
const IS_TEST_MODE = false; // Cambiar a false para el despliegue final

// Rate limiting configuration
const EMAIL_RATE_LIMIT_DELAY = 600; // 600ms delay between emails (1.67 emails per second, under the 2/sec limit)

interface LogDetail {
  clientName: string;
  vehicleName: string;
  customerName: string;
  reportType: 'Publicado' | 'No Publicado';
}

/**
 * Utility function to add delay between operations
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// @ts-ignore: Deno API
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // El envío puede tardar varios minutos (cientos de correos paginados a
  // ~1.67/seg por el rate limit de Resend). Si lo corriéramos dentro del
  // request, el "request idle timeout" de 150s mataría la función a la mitad
  // y los clientes procesados al final NUNCA recibirían su correo (siempre
  // los mismos, en silencio). Lo corremos como background task con
  // EdgeRuntime.waitUntil, que dispone del wall-clock de 400s del plan pro.
  // Modo prueba: ?dry_run=true recorre todo el flujo (fetch, filtro, armado
  // del HTML) y cuenta/loguea a cuántos se enviaría, pero NO manda ningún
  // correo. El cron manda body '{}' sin query → envío real.
  const dryRun = new URL(req.url).searchParams.get('dry_run') === 'true';

  // @ts-ignore: Supabase Edge background task API
  EdgeRuntime.waitUntil(runConsignmentReports(dryRun));

  return new Response(
    JSON.stringify({
      success: true,
      message: dryRun
        ? 'Consignment reports DRY RUN started'
        : 'Consignment reports job started',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});

async function runConsignmentReports(dryRun = false) {
  try {
    // 1. Fetch all vehicle consignments with their vehicles and customers
    const { data: consignments, error: consignmentsError } =
      await supabase.from('vehicles_consignments').select(`
        id,
        vehicle_id,
        customer_id,
        agreed_price,
        created_at,
        updated_at,
        vehicle:vehicle_id (
          id, 
          client_id,
          brand_id,
          model_id, 
          year,
          price,
          is_published,
          status_id,
          views,
          main_image,
          created_at,
          updated_at,
          brand:brand_id (id, name),
          model:model_id (id, name),
          status:status_id (id, name, order)
        ),
        customer:customer_id (
          id,
          email,
          phone,
          first_name,
          last_name
        )
      `);

    if (consignmentsError) {
      throw new Error(
        `Error fetching consignments: ${consignmentsError.message}`
      );
    }

    // 1b. Determinar qué automotoras están inactivas. Coincide con la pestaña
    // "Inactivos" del superadmin (clients.is_active = false): a esas NO se les
    // manda reporte. Los trials (subscription_status = 'trial') SÍ reciben, por
    // eso solo filtramos por is_active y no por suscripción.
    const { data: clientsActivity, error: clientsActivityError } =
      await supabase.from('clients').select('id, is_active');

    if (clientsActivityError) {
      throw new Error(
        `Error fetching clients activity: ${clientsActivityError.message}`
      );
    }

    const inactiveClientIds = new Set(
      (clientsActivity || [])
        .filter((c) => c.is_active === false)
        .map((c) => c.id)
    );

    // 2. Filter out vehicles with "Vendido" status, those from client_id 1 or 24,
    // and those de automotoras inactivas (pestaña Inactivos del superadmin)
    const activeConsignments = consignments.filter(
      (consignment) =>
        consignment.vehicle?.status?.name !== 'Vendido' &&
        consignment.vehicle && // Ensure vehicle exists
        consignment.vehicle.client_id !== 1 &&
        consignment.vehicle.client_id !== 24 &&
        !inactiveClientIds.has(consignment.vehicle.client_id)
    );

    if (activeConsignments.length === 0) {
      console.log('No active consignments found to report on');
      return new Response(
        JSON.stringify({ message: 'No active consignments to report on' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch all clients for timeline data with their statuses in a single query
    const { data: clients, error: clientsError } = await supabase.from(
      'clients'
    ).select(`
        id, 
        name, 
        domain, 
        logo,
        vehicles_statuses:clients_vehicles_states(
          id,
          client_id,
          name,
          description,
          color,
          order,
          created_at,
          is_disabled
        )
      `);

    if (clientsError) {
      throw new Error(`Error fetching clients: ${clientsError.message}`);
    }

    // En modo de prueba, solo procesaremos dos vehículos: uno publicado y otro no publicado
    if (IS_TEST_MODE) {
      console.log('Running in TEST MODE - sending test reports to', TEST_EMAIL);

      // Buscar un vehículo con status "Publicado" y más de 3 vistas
      const publishedVehicle = activeConsignments.find(
        (c) =>
          c.vehicle &&
          c.vehicle.status?.name === 'Publicado' &&
          c.vehicle.views != null &&
          c.vehicle.views > 3
      );

      // Buscar un vehículo que NO tenga status "Publicado" ni "Vendido"
      const unpublishedVehicle = activeConsignments.find(
        (c) =>
          c.vehicle?.status?.name !== 'Publicado' &&
          c.vehicle?.status?.name !== 'Vendido'
      );

      console.log(
        'Vehículo con estado "Publicado" encontrado:',
        publishedVehicle ? publishedVehicle.vehicle?.status?.name : 'ninguno'
      );
      console.log(
        'Vehículo NO publicado encontrado:',
        unpublishedVehicle
          ? unpublishedVehicle.vehicle?.status?.name
          : 'ninguno'
      );

      // Enviar ejemplos
      const testConsignments: VehicleConsignment[] = [];
      if (publishedVehicle) testConsignments.push(publishedVehicle);
      if (unpublishedVehicle) testConsignments.push(unpublishedVehicle);

      if (testConsignments.length === 0) {
        return new Response(
          JSON.stringify({
            message: 'No se encontraron vehículos para pruebas',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Procesar y enviar correos de prueba
      for (const consignment of testConsignments) {
        if (!consignment.vehicle || !consignment.vehicle.client_id) continue;

        const clientId = consignment.vehicle.client_id;
        const client = clients.find((c) => c.id === clientId);

        if (!client || !client.vehicles_statuses) {
          console.log(`No se encontraron estados para el cliente ${clientId}`);
          continue;
        }

        // Ordenar estados por orden
        const clientStatuses = client.vehicles_statuses.sort(
          (a, b) => (a.order || 0) - (b.order || 0)
        );

        const isPublished = consignment.vehicle.status.name === 'Publicado';
        const statusText = isPublished ? 'PUBLICADO' : 'NO publicado';

        console.log(`Enviando reporte de vehículo ${statusText}`);

        const reportContent = generateCustomerReport(
          [consignment],
          clientStatuses,
          client
        );

        try {
          const emailSent = await sendConsignmentReport(
            TEST_EMAIL,
            'Test',
            client.name,
            reportContent,
            `Ejemplo: Vehículo ${statusText}`
          );

          if (emailSent) {
            console.log(
              `Test email sent successfully for ${statusText} vehicle`
            );
          } else {
            console.log(`Failed to send test email for ${statusText} vehicle`);
          }

          // Add delay between test emails as well
          await delay(EMAIL_RATE_LIMIT_DELAY);
        } catch (error) {
          console.error(
            `Error sending test email for ${statusText} vehicle:`,
            error
          );
          await delay(EMAIL_RATE_LIMIT_DELAY);
        }
      }
    } else {
      // 4. Group consignments by client for efficient processing
      const consignmentsByClient =
        groupConsignmentsByClient(activeConsignments);

      let totalEmailsToBeSent = 0;
      let totalPublishedVehicleReports = 0;
      let totalUnpublishedVehicleReports = 0;
      const allLoggedDetails: LogDetail[] = [];
      const allSendPromises: Promise<void>[] = [];

      // 5. Process each client's consignments for logging
      for (const [clientIdString, clientConsignments] of Object.entries(
        consignmentsByClient
      )) {
        const client = clients.find((c) => c.id === parseInt(clientIdString));
        if (!client || !client.vehicles_statuses) continue;

        const clientStatuses = client.vehicles_statuses.sort(
          (a, b) => (a.order || 0) - (b.order || 0)
        );

        // Process and gather data for reports for this client
        const result = await processClientConsignments(
          clientConsignments,
          client,
          clientStatuses,
          dryRun
        );

        totalEmailsToBeSent += result.emailsProcessed;
        allLoggedDetails.push(...result.details);
        allSendPromises.push(...result.sendPromises);
      }

      // Esperar a que terminen todos los envíos en vuelo antes de cerrar el
      // background task (si no, el worker podría retirarse con correos a medias)
      await Promise.allSettled(allSendPromises);

      for (const detail of allLoggedDetails) {
        if (detail.reportType === 'Publicado') {
          totalPublishedVehicleReports++;
        } else {
          totalUnpublishedVehicleReports++;
        }
      }

      console.log('--- Consignment Report Summary ---');
      console.log(`Total emails dispatched: ${totalEmailsToBeSent}`);
      console.log(
        `Total "Published" vehicle reports (status 'Publicado' & views > 3): ${totalPublishedVehicleReports}`
      );
      console.log(
        `Total "No Publicado" vehicle reports (other statuses or views <= 3): ${totalUnpublishedVehicleReports}`
      );
      console.log('Details of vehicles for reports:');
      allLoggedDetails.forEach((detail) => {
        console.log(
          `  - Client: ${detail.clientName}, Customer: ${detail.customerName}, Vehicle: ${detail.vehicleName}, Type: ${detail.reportType}`
        );
      });
      console.log('--- End of Summary ---');
    }

    console.log(
      IS_TEST_MODE
        ? 'Test consignment reports run finished'
        : 'Weekly consignment reports run finished'
    );
  } catch (error) {
    console.error('Error processing consignment reports:', error);
  }
}

/**
 * Group consignments by client ID for efficient processing
 */
function groupConsignmentsByClient(
  consignments: VehicleConsignment[]
): Record<string, VehicleConsignment[]> {
  const grouped: Record<string, VehicleConsignment[]> = {};

  for (const consignment of consignments) {
    if (!consignment.vehicle || !consignment.vehicle.client_id) continue;

    const clientId = consignment.vehicle.client_id.toString();
    if (!grouped[clientId]) {
      grouped[clientId] = [];
    }

    grouped[clientId].push(consignment);
  }

  return grouped;
}

/**
 * Process consignments for a specific client
 */
async function processClientConsignments(
  consignments: VehicleConsignment[],
  client: Client,
  statuses: ClientVehicleStatus[],
  dryRun = false
): Promise<{
  emailsProcessed: number;
  details: LogDetail[];
  sendPromises: Promise<void>[];
}> {
  const consignmentsByCustomer: Record<string, VehicleConsignment[]> = {};
  const logDetails: LogDetail[] = [];
  const sendPromises: Promise<void>[] = [];
  let emailsProcessed = 0;

  for (const consignment of consignments) {
    if (!consignment.customer || !consignment.customer.id) continue;

    const customerId = consignment.customer.id.toString();
    if (!consignmentsByCustomer[customerId]) {
      consignmentsByCustomer[customerId] = [];
    }
    consignmentsByCustomer[customerId].push(consignment);
  }

  // Send emails sequentially with rate limiting
  for (const [_customerId, customerConsignments] of Object.entries(
    consignmentsByCustomer
  )) {
    const customer = customerConsignments[0].customer as Customer;
    if (!customer.email) continue;

    emailsProcessed++; // Increment for each customer email that would be sent

    // Generate report content - this is where the actual HTML would be built
    const reportContent = generateCustomerReport(
      customerConsignments,
      statuses,
      client
    );

    // Iterate through vehicles for this customer to log details
    for (const consignment of customerConsignments) {
      const vehicle = consignment.vehicle as Vehicle;
      if (!vehicle) continue;

      const vehicleName = `${vehicle.brand?.name || ''} ${
        vehicle.model?.name || ''
      } ${vehicle.year || ''}`;

      const isEffectivelyPublished =
        vehicle.status?.name === 'Publicado' &&
        vehicle.views != null &&
        vehicle.views > 3;
      const reportType = isEffectivelyPublished ? 'Publicado' : 'No Publicado';

      logDetails.push({
        clientName: client.name,
        vehicleName,
        customerName: customer.first_name,
        reportType,
      });
    }

    // Lanzar el envío SIN esperar el round-trip a Resend: solo marcamos el
    // ritmo con el delay (rate limit). Así el tiempo total ≈ ritmo de envío
    // (~600ms × N) en vez de (ritmo + latencia de Resend) × N, lo que mantiene
    // la corrida holgadamente bajo el wall-clock de 400s aunque crezcan los
    // correos. Los errores se loguean por correo pero no frenan la cola.
    const emailToLog = customer.email;

    if (dryRun) {
      console.log(`[DRY RUN] would send to ${emailToLog} (${client.name})`);
      sendPromises.push(Promise.resolve());
      await delay(EMAIL_RATE_LIMIT_DELAY);
      continue;
    }

    const sendPromise = sendConsignmentReport(
      emailToLog,
      customer.first_name,
      client.name,
      reportContent
    )
      .then((emailSent) => {
        if (emailSent) {
          console.log(`Email sent successfully to ${emailToLog}`);
        } else {
          console.log(`Failed to send email to ${emailToLog}`);
        }
      })
      .catch((error) => {
        console.error(`Error sending email to ${emailToLog}:`, error);
      });
    sendPromises.push(sendPromise);

    // Espaciar los DISPAROS para respetar el rate limit de Resend
    await delay(EMAIL_RATE_LIMIT_DELAY);
  }

  return { emailsProcessed, details: logDetails, sendPromises };
}

/**
 * Generate HTML report for a customer's consigned vehicles
 */
function generateCustomerReport(
  consignments: VehicleConsignment[],
  statuses: ClientVehicleStatus[],
  client: Client
): string {
  // Email header
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 20px;">
        ${
          client.logo
            ? `<img src="${client.logo}" alt="${client.name}" style="max-width: 200px; height: auto;" />`
            : ''
        }
        <h1 style="color: #333;">Reporte Semanal de Consignación</h1>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
  `;

  // Process each consigned vehicle
  for (const consignment of consignments) {
    const vehicle = consignment.vehicle as Vehicle;
    if (!vehicle) continue;

    const vehicleName = `${vehicle.brand?.name || ''} ${
      vehicle.model?.name || ''
    } ${vehicle.year || ''}`;

    html += `
      <div style="margin-bottom: 30px; padding: 15px; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">${vehicleName}</h2>
        <p>Precio acordado: $${formatNumber(consignment.agreed_price)}</p>
    `;

    // Different content based on whether the vehicle is published and has sufficient views
    if (
      vehicle.status?.name === 'Publicado' &&
      vehicle.views != null &&
      vehicle.views > 3
    ) {
      // Published vehicle content - SOLO mostrar estadísticas de vistas
      html += generatePublishedVehicleHtml(vehicle, consignment, vehicleName);
    } else {
      // Unpublished vehicle (or published with <=3 views or null views) - SOLO mostrar timeline
      html += generateUnpublishedVehicleHtml(vehicle, statuses);
    }

    html += `</div>`;
  }

  // Email footer
  html += `
      </div>
      <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
        <p>Este es un correo automático. Por favor no responda a este mensaje.</p>
        <p>© ${new Date().getFullYear()} ${client.name}</p>
      </div>
    </div>
  `;

  return html;
}

/**
 * Send email report to customer
 */
async function sendConsignmentReport(
  customerEmail: string,
  customerName: string,
  clientName: string,
  htmlContent: string,
  subjectExtension = ''
): Promise<boolean> {
  try {
    // @ts-ignore: Deno API
    const response = await fetch(
      // @ts-ignore: Deno API
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // send-email exige service-role o x-internal-secret (ya no acepta el anon key).
          // @ts-ignore: Deno API
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          to: [customerEmail],
          subject: `Reporte semanal de su vehículo consignado - ${clientName} ${subjectExtension}`,
          content: htmlContent,
          // El campo "from" se omite para usar el valor por defecto
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error sending email:', errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in sendConsignmentReport:', error);
    return false;
  }
}
