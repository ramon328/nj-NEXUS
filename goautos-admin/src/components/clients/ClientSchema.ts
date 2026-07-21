import * as z from 'zod';

export const clientFormSchema = z.object({
  name: z.string().min(1, { message: 'El nombre es requerido' }),
  domain: z.string().min(1, { message: 'El dominio es requerido' }),
  favicon: z.string().optional(),
  logo: z.string().optional(),
  logo_dark: z.string().optional(),
  theme_light_primary: z.string().optional(),
  theme_light_secondary: z.string().optional(),
  theme_dark_primary: z.string().optional(),
  theme_dark_secondary: z.string().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
  contact_email: z
    .string()
    .email({ message: 'Email inválido' })
    .min(1, { message: 'El email es requerido' }),
  contact_phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === '') return true;
        const digits = val.replace(/\D/g, '');
        return digits.length >= 7 && digits.length <= 15;
      },
      {
        message:
          'Teléfono inválido. Usa formato chileno: +56 9 1234 5678',
      }
    ),
  contact_address: z.string().optional(),
  location_lat: z.string().optional(),
  location_lng: z.string().optional(),
  has_demo: z.boolean().optional(),
  has_dark_mode: z.boolean().optional(),
  currency: z.string().default('CLP'),
  default_language: z.string().default('es'),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;
