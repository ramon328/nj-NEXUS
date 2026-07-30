# Mapeo: Transferencia Masiva + Nómina — Santander Office Banking
_Investigación para el reintento. Fecha: 2026-07-30. Sin tocar el banco (todo fuera del banco + lo ya mapeado)._

## TL;DR — dónde estamos y qué falta
- **Masiva por archivo:** flujo mapeado casi completo por Nico (privado.officebanking.cl). Archivo real conocido (**.xlsx 13 columnas**). Único candado real: **"cuenta origen no perfilada"** → hay que perfilar/habilitar la cuenta origen para el servicio de masivas (lo hace el Supervisor Office Banking o el ejecutivo).
- **Nómina de remuneraciones:** NO mapeada (murió en el muro antifraude el 28-jul, no por un bloqueo real). Es un **producto/convenio separado** con su propia cuenta origen perfilada. Layout de archivo no público.
- **Portales:** se opera SOLO en `privado.officebanking.cl`. `empresas.officebanking.cl` es el **centro de ayuda** (no se opera). → El intento de hoy en la sesión de Ramón cayó en el help center = esa vía no es transaccional.

---

## 0) Portales (CONFIRMADO)
| Host | Qué es | ¿Se opera? |
|---|---|---|
| `privado.officebanking.cl` | Portal transaccional real (login, `/seleccion-empresa`, operar) | **SÍ** — masiva, nómina, autorizaciones |
| `empresas.officebanking.cl` | Centro de ayuda (SPA Angular, artículos) | No |
| `www.officebanking.cl` | Sitio legacy informativo/ayuda | No |

Dentro de "Servicios de pagos masivos" los productos son: **Masivas** (TEF a terceros), **Nómina de proveedores**, **Nómina de remuneraciones** (+ dividendos).

**Implicancia para el reintento:** mapear en `privado`, con el login donde JURI/ANA CLARA sean transaccionales (Nico → JURI en privado ya funcionó; ANA CLARA en privado ya funcionó). La JURI del login de Ramón redirige al help center → no sirve para operar.

---

## 1) FLUJO Masiva (importación TEF a terceros)

### Ruta de menú
`Transferencias y Pagos` → `Pagos Masivos` / `Masivas` → `Importar`. (En nuestros dumps: menú lateral "Pagos Masivos", URL `privado.officebanking.cl/portal-fob?type=EOB&dest=TRFCTA_MSV_C`, frame en `eob.officebanking.cl//TEFM.UI.Web/...`).

### Paso a paso (mapeado + confirmado)
1. Seleccionar **cuenta origen** — debe estar **perfilada** para masivas. *(← candado actual)*
2. Elegir **concepto** del lote (lista fija, ver abajo).
3. **Adjuntar archivo** → **Importar**.
4. El banco **valida**: muestra aceptados vs **rechazados** (pantalla `TEFM.UI.Web/Importacion/Rechazados`, botón "Generar PDF").
5. **Confirmar** el lote → queda **"Por Autorizar" / "por liberar"**.
6. **Apoderado** (segundo firmante) lo **autoriza** con token/superclave. **Nunca se autoriza solo.**

### Reglas del banco (CONFIRMADO — contrato SS.AA. Santander)
- **Máx. 200 registros por carga.**
- Se puede importar el mismo día y **hasta 90 días antes** de la fecha de pago.
- **Tope $7.000.000 por LÍNEA** (nuestro dato): montos mayores se parten en varias líneas del mismo beneficiario que suman el total.
- Cuenta origen con fondos suficientes; no exige provisionar 24 h antes.

### Formato del archivo (CONFIRMADO — es el nuestro)
- Es **Excel .xlsx** (formato que Santander llama **"SANTANDER8"** para masiva a proveedores). Coincide con nuestro `masiva.mjs`.
- **Fila 1 = encabezado, datos desde fila 2. 13 columnas por posición:**
  1. Cuenta origen (obligatorio)
  2. Moneda origen (obligatorio)
  3. Cuenta destino (obligatorio)
  4. Moneda destino (obligatorio)
  5. Código banco destino (obligatorio solo si banco destino ≠ Santander)
  6. RUT beneficiario (obligatorio solo si banco destino ≠ Santander)
  7. Nombre beneficiario (obligatorio solo si banco destino ≠ Santander)
  8. Monto transferencia (obligatorio)
  9. Glosa personalizada transferencia (opcional)
  10. Correo beneficiario (opcional)
  11. Mensaje correo beneficiario (opcional)
  12. Glosa cartola originador (opcional)
  13. Glosa cartola beneficiario (opcional, solo si cuenta destino es Santander)
- La cuenta origen va DENTRO del archivo → opción **"Utilizar cuentas ingresadas en archivo"**.
- Códigos de banco plaza ya mapeados en `masiva.mjs` (BancoEstado 012, BCI 016, Santander 037, Itaú 039, etc.).

### Conceptos válidos (lista, de `masiva.mjs`)
Pago de Asignaciones · Pago de Dividendos · Pago de Pensiones · Pago de Proveedores · Pago de Reembolsos · Pago de Remuneraciones · Pago de Subsidios · Pago de Viáticos · Pago Extraordinarios · Transferencias Masivas.

### ⚠ Candado a resolver antes del reintento: "cuenta origen no perfilada"
- La prueba de Nico (5 × $6.000.000 = $30M, JURI) se **rechazó** con motivo **"Cuenta origen no perfilada"** — NO por monto (cada línea ≤ $7M).
- **Perfilar** = habilitar explícitamente esa cuenta como origen del servicio de masivas dentro de Office Banking. Sin eso, la cuenta ni aparece seleccionable / rechaza el lote.
- Lo gestiona el **Supervisor Office Banking** de la empresa (roles + apoderados) o el ejecutivo Santander.
- **Acción Ramón/Nico:** perfilar la cuenta origen de JURI (y de ANA CLARA si se va a usar) para "Masivas". Es trámite de configuración en el banco, no de código.

---

## 2) FLUJO Nómina de remuneraciones (NO mapeado aún)

### Ruta (inferida, alta confianza)
`Pagos Masivos` → `Nómina de Remuneraciones` → `Importar nómina`. (Análogo `Nómina de Proveedores`.)

### Paso a paso (mismo patrón que masiva)
1. Cuenta origen perfilada **para nómina de remuneraciones** (perfilamiento distinto al de masivas).
2. Importar **archivo de nómina** ("Transfer Bancario").
3. Validación → rechazados/aceptados.
4. Confirmar → "Por Autorizar".
5. Autorización por apoderado con token/superclave.

### Formato archivo nómina (INFERIDO — layout exacto NO público)
- Los ERP lo llaman **"Transfer Bancario"**: archivo con cuentas origen/destino, montos y datos para cargar.
- Campos típicos: RUT trabajador · Nombre · Banco destino · Tipo de cuenta · Nº cuenta destino · Monto líquido · (Email opcional).
- Formato: **.txt de ancho fijo por posición** o planilla, según convenio. **El diseño de registro de Santander es propio y no está publicado.**

### Diferencias vs masiva
- Es **producto/convenio separado** ("Nómina de remuneraciones"), con su propia cuenta origen perfilada; a veces con beneficio de no provisionar 24 h antes.
- Semántica de sueldos (un pago por trabajador) vs. TEF genérica.

### Cómo obtener el layout EXACTO de nómina (pendiente para el reintento)
1. **Opción "descargar formato/plantilla"** dentro del propio Office Banking (lo más fiable) → mapearla cuando estemos adentro.
2. O **capturar un archivo real** generado por un ERP chileno (Buk/Talana/Manager+/Laudus/Nubox) — todos generan el formato Santander — y leer sus columnas/posiciones.

---

## 3) Enrolamiento (resumen — lo que debe estar listo)
1. Empresa con **Office Banking contratado**.
2. **Supervisor Office Banking** define usuarios, **roles** y **apoderados** (creador ≠ autorizador).
3. **Perfilar cuenta(s) origen** por cada servicio: Masivas / Nómina proveedores / Nómina remuneraciones. ← _sin esto = "cuenta origen no perfilada"_.
4. **Convenio de nómina** contratado (producto aparte) para remuneraciones/proveedores.
5. **Token/superclave** activo para autorizar.

---

## 4) El corazón (keepalive) — análisis y recomendación
**Pregunta de Ramón:** ¿bajar el corazón a 30 min para no hacer sospechar al banco?

**Respuesta: NO — lo dejo tal cual (1–3 min al azar).** Razón dura:
- Santander **mata la sesión ociosa a los ~5–7 min** (medido, 3 días de datos → en `corazon.mjs`).
- Un latido cada **30 min** perdería la sesión entre latidos. No la mantiene: la mata.
- El **1–3 min al azar** ya está tuneado para quedar cómodo bajo el umbral y sin patrón regular (que es lo que delata un bot). La sesión igual muere a los ~91 min pase lo que pase.

**Sobre "el corazón de Rail":** Rail (rail.cl) es un agregador de datos bancarios; su "corazón" es un **cron interno que escanea links activos**, con **intervalo configurable por plan y NO público** → no hay un número exacto para copiar. La restricción real no es "lo que hace Rail" sino el **timeout de Santander (~5–7 min)**: cualquier keepalive que funcione debe latir por debajo de eso. Nuestro 1–3 min ya lo cumple y es conservador.

**Variante opcional (si se quiere menos huella, no urgente):** ampliar a **2–4,5 min** (sigue bajo el umbral, ~40% menos aperturas/hora). Se cambia por env, sin tocar código:
```
TEK_CORAZON_POKE_MIN_MS=120000   # 2 min
TEK_CORAZON_POKE_MAX_MS=270000   # 4,5 min
```
(en el plist `com.nexus.tek-keepalive`). **No aplicado** — a la espera de tu OK.

---

## 5) Plan para el reintento (cuando retomemos)
1. **Perfilar la cuenta origen** para masivas (y nómina) en el banco — trámite de config, resuelve el candado #1.
2. Operar en **`privado.officebanking.cl`** con el login correcto (Nico→JURI o ANA CLARA; NO la JURI de Ramón que cae al help center).
3. **Mapear nómina en un login aparte** (disposable), NO sobre la sesión que se mantiene viva con el corazón — mapear sobre la sesión viva la BOTA (pasó hoy con ANA CLARA).
4. Sacar el **layout de nómina** desde "descargar plantilla" dentro del banco o desde un archivo ERP real.
5. Extender `masiva.mjs`/flujo para nómina reusando el patrón de masiva (import → validar → "Por Autorizar" → autorización manual).

## Fuentes (web)
- Contrato SS.AA. Santander (200 registros, 90 días, fondos): banco.santander.cl/uploads/.../07_CONTRATO_SS_AA...pdf
- Pagos Masivos oficial: banco.santander.cl/empresas/pagos-masivos
- Help center Office Banking: empresas.officebanking.cl/article/productos-y-servicios
- Formato SANTANDER8 = Excel (Manager+): ayuda.managermas.cl/es/articles/14088520
- "Transfer Bancario" (Buk): supportcenter.buk.cl/hc/es-419/articles/43003680760859
- Rail (agregador, cron configurable): rail.cl
</content>
</invoke>
