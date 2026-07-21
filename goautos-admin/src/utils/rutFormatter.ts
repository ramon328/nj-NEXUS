/**
 * Formatea un RUT chileno agregando puntos y guión
 * @param rut - RUT sin formato (ej: "123456789")
 * @returns RUT formateado (ej: "12.345.678-9")
 */
export const formatRut = (rut: string | number | null | undefined): string => {
  if (!rut) return '';

  // Convertir a string y limpiar
  const cleanRut = rut.toString().replace(/[^0-9kK]/g, '');

  if (cleanRut.length === 0) return '';

  // Separar dígito verificador
  const dv = cleanRut.slice(-1).toUpperCase();
  const numbers = cleanRut.slice(0, -1);

  if (numbers.length === 0) return dv;

  // Agregar puntos cada 3 dígitos desde la derecha
  const formattedNumbers = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedNumbers}-${dv}`;
};
