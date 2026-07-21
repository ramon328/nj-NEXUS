/**
 * Helpers de visualización de clientes (persona natural vs empresa).
 *
 * Un cliente puede ser persona (first_name + last_name) o empresa
 * (company_name = razón social). Estas funciones centralizan la lógica que
 * antes estaba duplicada en selectores, tablas y documentos.
 */

// Tipo estructural permisivo: acepta tanto el `Customer` global como los tipos
// locales/parciales que usan los distintos componentes (todos los campos son
// opcionales, así que cualquier objeto-cliente calza).
interface CustomerLike {
  customer_type?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  full_name?: string | null;
  rut?: string | null;
  email?: string | null;
}

/** ¿El cliente es una empresa (persona jurídica)? */
export function isCompanyCustomer(c?: CustomerLike | null): boolean {
  return c?.customer_type === 'company';
}

/**
 * Nombre para mostrar: razón social para empresa, nombre + apellido para persona.
 * No incluye el RUT (ver getCustomerDisplayNameWithRut).
 */
export function getCustomerDisplayName(c?: CustomerLike | null): string {
  if (!c) return '';
  if (isCompanyCustomer(c)) {
    return (c.company_name || '').trim();
  }
  if (c.full_name && c.full_name.trim()) return c.full_name.trim();
  return `${c.first_name || ''} ${c.last_name || ''}`.trim();
}

/** Igual que getCustomerDisplayName pero con el RUT entre paréntesis si existe. */
export function getCustomerDisplayNameWithRut(c?: CustomerLike | null): string {
  const name = getCustomerDisplayName(c);
  const rut = (c?.rut || '').trim();
  return rut ? `${name} (${rut})`.trim() : name;
}

/** Iniciales para avatares (2 caracteres). Razón social para empresa. */
export function getCustomerInitials(c?: CustomerLike | null): string {
  if (!c) return '?';
  if (isCompanyCustomer(c)) {
    return (c.company_name?.trim()?.[0] || '?').toUpperCase();
  }
  return `${c.first_name?.[0] || '?'}${c.last_name?.[0] || ''}`.toUpperCase();
}

/** Texto en minúsculas para buscar/filtrar (nombre, razón social, email, RUT). */
export function getCustomerSearchText(c?: CustomerLike | null): string {
  if (!c) return '';
  return [c.first_name, c.last_name, c.company_name, c.email, c.rut]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
