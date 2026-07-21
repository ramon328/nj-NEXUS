-- Soporte de dominio propio (custom domain) para clientes.
-- `domain` sigue almacenando el subdominio *.goauto.cl (creado en el onboarding).
-- `custom_domain` es el dominio personalizado que el cliente conecta y delega por DNS,
-- y se agrega automáticamente al proyecto de Vercel.

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS custom_domain_verified boolean NOT NULL DEFAULT false;

-- Un dominio personalizado sólo puede pertenecer a un cliente.
CREATE UNIQUE INDEX IF NOT EXISTS clients_custom_domain_key
  ON public.clients (custom_domain)
  WHERE custom_domain IS NOT NULL;

COMMENT ON COLUMN public.clients.custom_domain IS
  'Dominio propio del cliente (ej: autosjuan.cl). Se conecta a Vercel y debe delegarse por DNS. Independiente de domain (subdominio *.goauto.cl).';
COMMENT ON COLUMN public.clients.custom_domain_verified IS
  'true cuando Vercel confirma que el dominio está verificado y apuntando correctamente.';
