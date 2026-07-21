/**
 * True si el contenido es efectivamente vacío: solo tags, espacios o &nbsp;.
 * El editor inline (contentEditable) suele dejar '<br>', '&nbsp;' o espacios al
 * borrar todo el texto. Si solo chequeáramos truthy, ese "vacío con basura HTML"
 * dejaría el bloque (y su margen) renderizado, dejando un hueco en blanco.
 */
export const isBlankHtml = (html?: string): boolean => {
  if (!html) return true;
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, '')
    .replace(/&#160;/g, '')
    .replace(/\s/g, '');
  return text.length === 0;
};
