// endpoints.mjs — CATÁLOGO CANÓNICO de los endpoints de Santander Office Banking
// (ANA CLARA / MallorcAutos). Fuente única de verdad: si el banco cambia una ruta,
// se arregla ACÁ y no en 8 archivos.
//
// IMPORTANTE — cómo se usan estos endpoints:
//   NO se llaman como API HTTP directa. Un curl/fetch pelado a wslogin da 403
//   (Incapsula sin JS) y crearTransferencia va firmado con tokens de sesión +
//   BioCatch. El sistema maneja un Chrome real stealth (Patchright) que navega
//   el portal como persona y ESCUCHA (intercepta) las respuestas de estos
//   endpoints para robarles los datos. Por eso acá exportamos sobre todo REGEX
//   de match para los interceptores `ctx.on('response')`, más los hosts y las
//   URLs canónicas de navegación.
//
// Capturado el 02-ago-2026 por IP Claro móvil, sesión de ramon (74 requests en
// data/xhr-endpoints.json). Ver memorias [[tek-endpoints-anaclara-mapeados]] y
// [[tek-claro-movil-pasa]].

// ── Hosts ────────────────────────────────────────────────────────────────────
export const HOSTS = {
  PRIVADO: 'privado.officebanking.cl',        // portal privado (SPA, tras login)
  EMPRESAS: 'empresas.officebanking.cl',      // portal público / selección empresa
  EOB: 'eob.officebanking.cl',                // servicios internos (saldos, transferencia)
  API_GEE: 'api.officebanking.cl',            // gateway (validate sesión, credenciales)
  API_DEV: 'apideveloper.santander.cl',       // API Connect oficial (cash_mgt, biocatch)
  WSLOGIN: 'wslogin.officebanking.cl',        // POST del login (URL ofuscada por Incapsula)
  WUP: 'wup-7b4df495.santander.cl',           // antifraude BioCatch/ThreatMetrix
}

// ── URLs canónicas de navegación (el bot navega acá, no las llama por fetch) ──
export const URLS = {
  DASHBOARD: 'https://privado.officebanking.cl/dashboard',
  CARTOLA: 'https://privado.officebanking.cl/portal-fob?type=EOB&dest=TRNCNA_SDOCTACTE',
  PARAMS: 'https://privado.officebanking.cl/assets/params.json', // config del portal
}

// ── REGEX de match para los interceptores (ctx.on('response')) ───────────────
// Son los que el navegador dispara solo mientras navega; nosotros los escuchamos.
export const MATCH = {
  // Lectura (read-only, ya en uso y funcionando):
  MOVIMIENTOS: /ObtenerMovimientos/i,          // cartola → .Result.Detalle[]
  ACCOUNT_SUMMARY: /account_summary/i,         // saldos → .listCustAccount
  SALDOS: /saldocuentacorriente\/saldos/i,     // saldo cta cte (POST)
  SALDOS_POOLING: /saldosCashPooling/i,        // saldos consolidados
  SALDOS_ASOCIADA: /saldosCtaAsociada/i,       // cuentas asociadas

  // Escritura (transferencia; el flujo va por FORMULARIO en el navegador, NO por
  // llamada directa — se listan para depurar/escuchar el resultado):
  CREAR_TRANSFER: /CreacionTransferenciaUnitaria\/crearTransferencia/i,
  FIN_CREACION: /TransferenciaUnitaria\/FinCreacion/i,

  // Auth / rebote de sesión (para detectar que nos botaron a login):
  LOGIN_BOUNCE: /\/login|error-seguridad|wslogin\.officebanking|empresas\.officebanking|seleccion-empresa/i,
  TOKEN: /\.UI\.Services\/Token/i,             // token de sesión por módulo
}

// ── Catálogo documentado (referencia; `en_uso` marca lo cableado en el sistema) ─
export const CATALOGO = [
  // --- LECTURA ---
  { grupo: 'saldos_movs', metodo: 'POST', url: 'eob.officebanking.cl/CTA.UI.Services/api/SaldoCuentaCorriente/ObtenerMovimientos', para: 'Cartola / movimientos (.Result.Detalle[])', en_uso: true },
  { grupo: 'saldos_movs', metodo: 'GET', url: 'apideveloper.santander.cl/sancl/privado/cash_mgt/v1/cash_mgt_services_ms/account_summary', para: 'Resumen de cuenta / saldos (.listCustAccount)', en_uso: true },
  { grupo: 'saldos_movs', metodo: 'POST', url: 'eob.officebanking.cl/CTA.UI.Services/api/saldocuentacorriente/saldos', para: 'Saldo de la cuenta', en_uso: false },
  { grupo: 'saldos_movs', metodo: 'POST', url: 'eob.officebanking.cl/CTA.UI.Services/api/saldocuentacorriente/saldosCashPooling', para: 'Saldos consolidados', en_uso: false },
  { grupo: 'saldos_movs', metodo: 'POST', url: 'eob.officebanking.cl/CTA.UI.Services/api/saldocuentacorriente/saldosCtaAsociada', para: 'Cuentas asociadas', en_uso: false },
  { grupo: 'saldos_movs', metodo: 'GET', url: 'eob.officebanking.cl/CTA.UI.Services/api/saldocuentacorriente/cuentas', para: 'Listado de cuentas', en_uso: false },

  // --- TRANSFERENCIA (flujo TEFUN unificado: mismo banco Y otros bancos) ---
  { grupo: 'transferencia', metodo: 'POST', url: 'eob.officebanking.cl/TEFUN.UI.Services/api/CreacionTransferenciaUnitaria/crearTransferencia', para: 'Crea la solicitud (queda Por Autorizar; NO mueve plata sin Superclave)', en_uso: 'via_form' },
  { grupo: 'transferencia', metodo: 'POST', url: 'eob.officebanking.cl/TEFUN.UI.Services/api/CreacionTransferenciaUnitaria/ObtenerBanco', para: 'Banco destino (Santander/Falabella = solo un valor acá)', en_uso: 'via_form' },
  { grupo: 'transferencia', metodo: 'POST', url: 'eob.officebanking.cl/TEFUN.UI.Services/api/CreacionTransferenciaUnitaria/ObtenerCuentas', para: 'Cuentas origen', en_uso: 'via_form' },
  { grupo: 'transferencia', metodo: 'POST', url: 'eob.officebanking.cl/TEFUN.UI.Services/api/CreacionTransferenciaUnitaria/ObtenerSaldo', para: 'Saldo disponible para transferir', en_uso: 'via_form' },
  { grupo: 'transferencia', metodo: 'POST', url: 'eob.officebanking.cl/TEFUN.UI.Services/api/CreacionTransferenciaUnitaria/ObtenerDatosClienteXCta', para: 'Datos del beneficiario por cuenta', en_uso: 'via_form' },
  { grupo: 'transferencia', metodo: 'POST', url: 'eob.officebanking.cl/TEFUN.UI.Web/TransferenciaUnitaria/FinCreacion', para: 'Cierra la creación de la transferencia', en_uso: 'via_form' },

  // --- AUTH / ANTIFRAUDE (no se llaman; se deja que corran en el navegador) ---
  { grupo: 'auth', metodo: 'GET', url: 'api.officebanking.cl/party-authentication-enterprise-wslogin/validate', para: 'Valida la sesión (puerta de entrada)', en_uso: 'navegador' },
  { grupo: 'auth', metodo: 'POST', url: 'wslogin.officebanking.cl/...', para: 'POST del login (URL ofuscada por Incapsula)', en_uso: 'navegador' },
  { grupo: 'auth', metodo: 'POST', url: 'apideveloper.santander.cl/sancl/privado/party_authentication/behavioral_biometrics/v1/customers/biocatch_init', para: 'Arranca BioCatch (rebota el 1er intento)', en_uso: 'navegador' },
  { grupo: 'auth', metodo: 'POST', url: 'wup-7b4df495.santander.cl/client/v3/web/wup', para: 'BioCatch/ThreatMetrix: telemetría que aprueba o rechaza la sesión', en_uso: 'navegador' },

  // --- CONFIG ---
  { grupo: 'config', metodo: 'GET', url: 'privado.officebanking.cl/assets/params.json', para: 'Config del portal (URLs de API, client_id, ambiente)', en_uso: false },
]

export default { HOSTS, URLS, MATCH, CATALOGO }
