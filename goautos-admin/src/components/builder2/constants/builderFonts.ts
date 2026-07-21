// Lista curada de fuentes para el selector inline del builder.
//
// IMPORTANTE: esta lista debe mantenerse EN SINCRONÍA con su gemela en el repo
// del sitio público: website-gocar/src/lib/builder-fonts.ts. Si agregas/quitas
// una fuente acá, hazlo también allá — si no, la fuente se elige en el editor
// pero no se carga en el sitio público (o viceversa) y se ve el fallback.
//
// Pesos: pedimos solo 400;700 en el request combinado de Google Fonts porque
// son los únicos que TODAS estas familias soportan; pedir 500/600 a una que no
// los tiene hace fallar el request combinado entero (400 Bad Request).

export interface BuilderFont {
  /** Nombre exacto de la familia en Google Fonts. */
  name: string;
  /** Stack CSS completo con fallback (lo que se inyecta en el <span>). */
  stack: string;
}

export const BUILDER_FONTS: BuilderFont[] = [
  { name: 'Inter', stack: "'Inter', sans-serif" },
  { name: 'Roboto', stack: "'Roboto', sans-serif" },
  { name: 'Montserrat', stack: "'Montserrat', sans-serif" },
  { name: 'Poppins', stack: "'Poppins', sans-serif" },
  { name: 'Lato', stack: "'Lato', sans-serif" },
  { name: 'Oswald', stack: "'Oswald', sans-serif" },
  { name: 'Raleway', stack: "'Raleway', sans-serif" },
  { name: 'Playfair Display', stack: "'Playfair Display', serif" },
  { name: 'Merriweather', stack: "'Merriweather', serif" },
  { name: 'Lora', stack: "'Lora', serif" },
];

/** URL combinada de Google Fonts que carga TODA la lista en un solo request. */
export const BUILDER_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  BUILDER_FONTS.map((f) => `family=${f.name.replace(/ /g, '+')}:wght@400;700`).join('&') +
  '&display=swap';
