-- mp-cancel-subscription escribe cancellation_reason/cancellation_details al
-- cancelar, pero esas columnas nunca existieron en la tabla → el UPDATE fallaba
-- con 500 DESPUÉS de haber cancelado ya en MercadoPago (dejaba MP=cancelled y la
-- fila local en 'trial'). Columnas aditivas, nullable: cero impacto en filas
-- existentes; solo hacen que la cancelación complete su escritura.
-- Aplicada a prod vía MCP el 2026-07-04.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancellation_reason text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS cancellation_details text;
