# Website Builder — Documentación Técnica

## Ruta

| Ruta | Página | Descripción |
|------|--------|-------------|
| `/builder` | `Builder2.tsx` | Editor visual drag-and-drop |

## Tecnología

Basado en **Craft.js** — cada sección es un componente React con props editables y reglas de arrastre.

## Arquitectura

```
builder2/
├── sections/           # Todas las secciones disponibles
│   ├── hero/           # 13 variantes de hero
│   ├── vehicles/       # Grids, carruseles, filtros de vehículos
│   ├── features/       # WhyChooseUs, FAQ
│   ├── contact/        # CTA, HowToArrive
│   ├── marketing/      # StatsCounter, PromoBanner, AwardsBadges, TrustBadges
│   ├── media/          # PhotoGallery, VideoEmbed
│   ├── moderno/        # Tema moderno (5 secciones)
│   ├── premium/        # Tema premium (5 secciones)
│   └── common/         # Footer, Navbar, Testimonials
├── templates/          # Templates pre-armados
├── settings/           # Panel de configuración por componente
├── Toolbox.tsx         # Barra lateral con componentes arrastrables
├── TemplateSelectorModal.tsx  # Selector de template inicial
├── ThemePanel.tsx      # Configuración de tema/colores
├── IntegrationsPanel.tsx  # Meta Pixel / GTM / GA4 + consentimiento de cookies
└── DevicePreviewFrame.tsx     # Preview responsive
```

## Templates Disponibles

1. **Clásico** — Hero + grid de vehículos + testimonios + contacto
2. **Moderno** — Estilo contemporáneo con stats y animaciones
3. **Premium** — Ultra premium dark con glassmorphism y galería cinematográfica
4. **Minimalista** — Hero split + catálogo + testimonios + CTA

## Secciones por Categoría

### Hero (13 variantes)
HeroBasic, HeroWithBackground, HeroCarSearch, HeroWithCard, HeroWithImage, HeroFeatureCards, HeroMinimalistic, HeroWithLogo, HeroWelcome, HeroImageDivided, HeroSearchBanner, HeroTestimonial, HeroPremium, HeroModerno

### Vehículos (8+)
VehicleGrid, VehicleGrid2, VehicleCarousel, VehicleList, VehicleCard, TraditionalVehicleGrid, VehicleFilters, NewVehicleFilters, VehicleTypeFilter

### Contenido
WhyChooseUs, TraditionalWhyUs, FAQ, FeatureShowcase, TeamMembers, Testimonials, TestimonialsModerno, TestimonialsPremium

### Contacto
ContactCTA, TraditionalContactCTA, HowToArrive, TraditionalHowToArrive, FloatingWhatsApp, CTAModerno, CTAPremium

> **HowToArrive / TraditionalHowToArrive** muestran la ubicación de cada sucursal en Google Maps con una tarjeta lateral. La tarjeta lee la sucursal de la tabla `dealerships` y renderiza Dirección, Teléfono, Email y **Horario de atención** (`dealerships.opening_hours`, configurado en Configuración → Sucursales). El horario lo dibuja el componente compartido `OpeningHours.tsx`, que agrupa días consecutivos con el mismo horario (ej. "Lun – Vie: 09:00 – 18:00", "Dom: Cerrado"). Días sin datos en `opening_hours` no se muestran; si la sucursal no tiene horario configurado, la fila no aparece.

### Media
PhotoGallery, GalleryPremium, VideoEmbed

### Marketing
StatsCounter, StatsModerno, PromoBanner, AwardsBadges, TrustBadges

### Layout
Footer, FooterModerno, BuilderNavbar, Divider, Spacer

## Funcionalidad de GalleryPremium

La galería premium auto-carga hasta 5 fotos reales de vehículos de la automotora al montarse por primera vez. Si hay menos de 5 vehículos con foto, rellena con imágenes placeholder de Unsplash. El usuario puede cambiar las fotos manualmente desde el panel de settings.

## Persistencia

El estado del builder se serializa como JSON y se guarda en la tabla de configuración del sitio web mediante `websiteConfigService.ts`.

## Integraciones de tracking

El `IntegrationsPanel` en el sidebar derecho del builder permite configurar scripts de tracking que se inyectan en el sitio público (`website-gocar`), no en el editor:

- **Meta Pixel** — ID numérico (10–20 dígitos)
- **Google Tag Manager** — `GTM-XXXXXXX`
- **Google Analytics 4** — `G-XXXXXXX`
- **Requerir consentimiento de cookies** — toggle (default `true`)

Persisten en `client_website_config.integrations` (jsonb):

```json
{
  "pixel_id": "1234567890123456",
  "gtm_id": "GTM-ABC1234",
  "ga4_id": "G-ABCDEFG",
  "require_cookie_consent": true
}
```

Migración: `supabase/migrations/20260411100000_add_integrations_to_website_config.sql` garantiza la columna y su shape por defecto.

### Render en el sitio público

`website-gocar/src/app/layout.tsx` lee `integrations` server-side mediante `getWebsiteConfig()` y pasa los IDs al componente cliente `components/analytics/TrackingAndConsent.tsx`, que:

1. Muestra un banner de consentimiento en la esquina inferior si `require_cookie_consent` está activo y el visitante no ha decidido todavía.
2. Guarda la elección en `localStorage` (`goauto_cookie_consent_v1`).
3. Inyecta los scripts de Meta Pixel / GTM / GA4 vía `next/script` solo si el consentimiento fue aceptado (o si no es requerido).

## Subida de imágenes en el builder

Las imágenes que el usuario selecciona en los componentes (fondos de hero, logos, etc.) se procesan con `src/utils/builderImageUpload.ts` → `optimizeAndUploadBuilderImage(file)`, que **redimensiona** (máx. 2400 px), convierte a **WebP** (fallback JPEG) y **sube a Storage** (`production/website-builder/`), devolviendo solo la **URL pública**. El prop del componente guarda esa URL.

> **Importante:** nunca guardar imágenes como base64 (`FileReader.readAsDataURL`) dentro de los props. Eso se incrusta en `client_website_config.elements_structure` e infla la config a decenas de MB (un cliente llegó a 45 MB), ralentizando la carga del sitio público — y como los fondos van por CSS `background-image`, no pasan por la optimización de `next/image`. Cualquier selector de imagen nuevo debe usar `optimizeAndUploadBuilderImage`. Puntos de entrada actuales: `settings/ImageSelector.tsx` (usado por `SettingsManager` y los componentes de logos) y `sections/initialfold/HeroWithLogo.tsx` (uploader inline de sus 4 fondos).
