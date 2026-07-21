-- Migration: Add 'consignor' as a third value for vehicles_extras.assumed_by
--
-- Contexto (caso Ford EXPEDITION SRZR56, Mallorca): en una venta consignada hay
-- TRES partes reales — el CONSIGNADOR (dueño del auto en consignación), la
-- AUTOMOTORA (quien vende) y el CLIENTE FINAL (comprador). Hasta ahora la columna
-- binaria ('dealership','customer') comprimía consignador y automotora en el mismo
-- valor 'dealership'. Eso producía etiquetas cruzadas entre el modal de cierre de
-- negocio ("Consignador") y el drawer/timeline ("Automotora"), y un doble descuento
-- (al consignador en el payout Y a la automotora en el margen). El tercer valor
-- 'consignor' separa esas dos partes.
--
-- Esta migración SOLO amplía el CHECK. El backfill de datos históricos (mover los
-- sale_additional 'dealership' de vehículos consignados a 'consignor') es SQL manual
-- aparte, aprobado por Nico (mueve márgenes históricos al alza).

-- Recrear el CHECK con el tercer valor permitido.
ALTER TABLE vehicles_extras
DROP CONSTRAINT IF EXISTS vehicles_extras_assumed_by_check;

ALTER TABLE vehicles_extras
ADD CONSTRAINT vehicles_extras_assumed_by_check
CHECK (assumed_by IS NULL OR assumed_by IN ('dealership', 'customer', 'consignor'));

-- Actualizar el comentario explicando las 3 partes y su economía.
COMMENT ON COLUMN vehicles_extras.assumed_by IS 'Quién asume/paga el movimiento (3 partes): dealership (automotora, lo absorbe -> GASTO de su margen), customer (cliente final comprador, lo paga -> INGRESO de la automotora), consignor (consignador dueño del auto consignado, se descuenta de su liquidacion/payout -> NEUTRO en el margen de la automotora)';
