-- NO-OP intencional.
--
-- Este archivo originalmente contenía solo el carácter "}" (basura, SQL inválido),
-- por lo que el trigger de sincronización de precio que prometía su nombre NUNCA
-- llegó a crearse. En un replay limpio de migraciones (CI / ambiente nuevo) ese
-- contenido rompía con un error de sintaxis.
--
-- El trigger comprensivo de sincronización (precio + estado + datos) se crea en
-- 20260309000000_chileautos_full_sync_trigger.sql, que además hace
-- DROP TRIGGER IF EXISTS trigger_chileautos_price_sync. Por eso aquí dejamos un
-- no-op explícito en vez del contenido corrupto: mantiene el historial de
-- migraciones intacto y permite reaplicar desde cero sin fallar.

SELECT 1;
