# Módulo: Financiamiento — Documentación Técnica

## Rutas

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/financiamiento` | `Financiamiento.tsx` | Lista de financiamientos |
| `/financiamiento/:id` | `FinanciamientoDetalle.tsx` | Detalle con calendario de pagos |

## Modelo de Datos

```typescript
interface Financing {
  id: number;
  vehicle_id: number;
  customer_id: number;
  downpayment: number;          // Pie
  monthly_installment: number;  // Cuota mensual
  total_installments: number;   // Total de cuotas
  interest_rate: number;
  status: string;
  payments: FinancingPayment[];
}
```

## Componentes

- **FinanciamientoList** — Tabla desktop + cards móvil
- **FinanciamientoForm** — Formulario de creación
- **FinancingListRow** — Fila de tabla con info del cliente, vehículo, cuotas
- **FinancingProgressBar** — Barra de progreso (pagos completados / total)
- **FinancingStatusBadge** — Badge de estado
- **CustomerVehicleInfo** — Card con datos del cliente y vehículo
- **PaymentSchedule** — Calendario de pagos
- **PaymentForm** — Registrar pago

## Flujo

1. Se crea financiamiento asociado a vehículo y cliente
2. Se define pie, cuota mensual, cantidad de cuotas, tasa de interés
3. Se genera calendario de pagos automáticamente
4. Admin registra pagos a medida que se realizan
5. Progreso se visualiza con barra y contador
