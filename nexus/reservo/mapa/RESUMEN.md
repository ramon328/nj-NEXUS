# Reservo — mapa de acceso y API (proyecto scraping/automatización)

Cuenta: **ramon.molina** (centro "Aconcagua"). Software de **clínica dental** (Reservo).

## Cómo se accede (lo que funciona)
- Login real: `POST https://reservo.cl/accounts/login/` (form Django: username, password, csrfmiddlewaretoken).
- **Se loguea con Chrome real (Playwright/Patchright headless)** — obscura sirve para LEER páginas pero el login interactivo (submit + `sessionid`) es su punto flojo (sin motor de layout).
- Tras login redirige a `https://reservo.cl/appointment/viewAppt/` (la agenda). Cookie clave: **`sessionid`**.
- Sesión guardada en `../session.json` (reusable para consultas sin re-loguear). Reservo NO tiene antibot fuerte (sin Incapsula/BioCatch), a diferencia del banco.
- Scripts: `login-chrome.mjs` (login + captura), `extraer-js.mjs`/`extraer-js2.mjs` (endpoints de bundles), `crawl.mjs` (crawl de secciones). Endpoints en `endpoints*.json`.

## API interna (63 endpoints, 23 módulos — solo desde la agenda; faltan otras secciones)
- **appointment** (agenda/citas): `makeAppointment/` ← **CREAR CITA**, `viewAppt/`, `viewAllAppts/`, `AppointmentDay/`, `estadoAppt/`, `sala_de_espera/`, `viewTicket/`, `viewSchedule/`, `get_url_videconferencia_cita/`.
- **disponibilidad**: `obtenerDisponibilidad/`, `obtenerColores/`, `obtenerschedule/` (horas/ocupación).
- **schedule**: `obtenerschedule/`, `listSchedule/`, `changeschedulename/`, `getFeriadosCliente/`.
- **bloqueosHorario**: `obtenerBloqueoAgenda/`, `obtenerBloqueoProfesional/`.
- **pacienteDentista** (pacientes): `buscarPerson/`, `editPerson/`, `subir_foto/`, `eliminar_foto/`, `obtener_fotos_perfil/`, `verDatoCampoPerfilExtendido/`.
- **cliente**: `crear_profesional/`, `editempresa/`, `list_profesional/`, `seepersonales/`, `validarmail/`.
- **tratamiento**: `crear_tratamiento/`, `gettratamientoajax/`, `choosetratamiento/`, `makeedittratamientofast/`.
- **fichas** (registro clínico): `ordenes_medicas/`, `delete_orden_medica/`.
- **caja/reservopago** (finanzas): `finanzasinicial/`, `facturasycomprobantes/`.
- **fidelizacion**: `listcampaigns/`, `tareasprogramadas/`. **insumos**: `create_insumo/`. **dashboard**, **atencion**, **configuracion**, **comunicacioninterna**, **upload**, **usuarios**.

## API REST "pública" (la que había en el mapa básico) — DISTINTA a la interna
`GET,PUT /citas/`, `/cliente/{uuid}/`, `/agenda_online/{uuid}/horarios_disponibles/`, `/webhooks/`, etc. Es otra superficie (posible API oficial/webhooks). No es la que usa la app día a día.

## Pendiente / próximo
1. **Confirmar crear cita:** sacar los PARÁMETROS de `/appointment/makeAppointment/` abriendo el form "nueva cita" en la UI (SIN guardar) → después prueba real CON OK de Ramón (es clínica de verdad).
2. **Mapear el resto:** visitar Pacientes, CRM, Finanzas, Estadísticas, Configuración (cada una trae sus módulos).
3. Evaluar `/webhooks/` (updates en vivo) y `/agenda_online/.../horarios_disponibles/` (ocupación).
