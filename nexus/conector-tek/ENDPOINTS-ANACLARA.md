# Endpoints Office Banking cazados — ANA CLARA (02-ago-2026, vía IP Claro)
Host de servicios: `eob.officebanking.cl` · API pública: `apideveloper.santander.cl` · fuente: `data/xhr-endpoints.json`

## Login / Auth
- `GET api.officebanking.cl/party-authentication-enterprise-wslogin/validate` — valida el login tras la clave
- `GET api.officebanking.cl/cust_reference_data_mgt/.../create_credentials/lgu` — genera credenciales de sesión
- `POST wslogin.officebanking.cl/<hash>/...` — handshake de login (Incapsula/reCAPTCHA)
- `GET apideveloper.../v1/users/0218945783/company` — empresas del usuario (RUT 21.894.578-3 = ramon)
- `GET apideveloper.../v1/users/<rut>/companys/<id>/services` — servicios/permisos por empresa
- `GET apideveloper.../customer_ref_data_mgt/v1/customers/<rut>/basic-contact-information` — datos de contacto
- `GET apideveloper.../v1/hz_conntext` — contexto de la sesión

## Antifraude / BioCatch (NO tocar — es lo que nos vigila)
- `POST wup-<id>.santander.cl/client/v3/web/wup` (y v3.1) — colector BioCatch (biometría de comportamiento)
- `POST apideveloper.../behavioral_biometrics/v1/customers/biocatch_init` — arranque BioCatch
- `GET TEFUN.UI.Web/bundles/BioCatchHeartBeat` — latido BioCatch
- `POST log-<id>.santander.cl/api/v1/sendLogs` — telemetría
- `GET eob/_bm/get_params` · `GET www/_bm/get_params` — params Imperva/anti-bot

## Saldos y cuentas (lectura)
- `GET CTA.UI.Services/api/saldocuentacorriente/cuentas` — lista de cuentas
- `POST CTA.UI.Services/api/saldocuentacorriente/saldos` — saldos
- `POST .../saldosCashPooling` — saldos cash pooling
- `POST .../saldosCtaAsociada` — saldos de cuentas asociadas
- `POST .../datoscliente` — datos del cliente
- `POST CTA.UI.Services/Token` — token del módulo saldos
- `GET apideveloper.../cash_mgt/v1/.../account_summary` — resumen de cuentas

## Movimientos / cartola (lectura)
- `POST CTA.UI.Services/api/SaldoCuentaCorriente/ObtenerMovimientos` — movimientos/cartola por rango de fechas

## Transferencia UNITARIA — crear solicitud (mismo banco Y otro banco = mismo flujo)
- `POST TEFUN.UI.Services/api/CreacionTransferenciaUnitaria/crearTransferencia` — **CREA la solicitud** (queda Por Autorizar)
- `POST .../ObtenerBanco` — bancos destino
- `POST .../ObtenerCuentas` — cuentas de origen
- `POST .../ObtenerDatosClienteXCta` — datos del destinatario por cuenta
- `POST .../ObtenerSaldo` — saldo disponible
- `POST TEFUN.UI.Web/TransferenciaUnitaria/FinCreacion` — confirma/finaliza la creación
- `POST TEFUN.UI.Services/Token` — token del módulo transferencia
- `GET TEFUN.UI.Web/bundles/CreacionTransferenciaUnitaria` — UI del formulario

## Otros (portal)
- `GET apideveloper.../customer_offer/campaigns_ob/.../multiple` — campañas/banners (marketing)
- `POST apideveloper.../cash_mgt_services_ms/news/data_preparation` · `GET .../news/<id>` — avisos del portal

## PENDIENTE de capturar
- **MASIVA** (subir lote de transferencias) — módulo distinto, NO capturado. Requiere correr el flujo masiva (TEK_MASIVA) en sesión viva.
- **Autorización** (autorizar una transferencia Por Autorizar) — pide Superclave; NO capturado.
