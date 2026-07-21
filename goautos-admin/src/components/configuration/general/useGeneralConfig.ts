import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
  getClientById,
  updateClient,
} from '@/components/clients/ClientService'; // Import Supabase service
import type { Client, ClientFormData } from '@/components/clients/types'; // Import Client types
import { useAuth } from '@/contexts/AuthContext';

const formSchema = z.object({
  // Basic Info
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  favicon: z
    .object({
      type: z.enum(['url', 'file']).optional(),
      value: z.string().optional(),
    })
    .optional(),

  // Theme
  primaryColor: z.string().optional(), // Light mode primary
  secondaryColor: z.string().optional(), // Light mode secondary
  darkPrimaryColor: z.string().optional(), // Dark mode primary
  darkSecondaryColor: z.string().optional(), // Dark mode secondary
  hasDarkMode: z.boolean().optional(),
  darkModeLogo: z
    .object({
      type: z.enum(['url', 'file']).optional(),
      value: z.string().optional(), // Optional value
    })
    .optional(),
  lightModeLogo: z
    .object({
      type: z.enum(['url', 'file']).optional(),
      value: z.string().optional(), // Optional value
    })
    .optional(),

  // SEO
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.string().optional(),
  googleSiteVerification: z.string().optional(),

  // Redes sociales (→ sameAs en los datos estructurados del sitio)
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),

  // Contact
  email: z.string().optional().refine(val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), { message: 'Email inválido' }),
  phone: z.string().optional(),
  address: z.string().optional(),
  finance_emails: z.string().optional(),
  consignments_emails: z.string().optional(),
  buy_emails: z.string().optional(),
  search_emails: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Helper function to safely access nested properties with null protection
const getSafe = (obj: any, path: string, defaultValue: any = undefined) => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return defaultValue;
    }
  }
  // Ensure we never return null or undefined for string fields
  if (result === null || result === undefined) {
    return defaultValue;
  }
  return result;
};

const defaultValues: FormValues = {
  name: '',
  description: '',
  favicon: { type: 'url', value: '' },
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  darkPrimaryColor: '#ffffff',
  darkSecondaryColor: '#000000',
  hasDarkMode: false,
  darkModeLogo: { type: 'url', value: '' },
  lightModeLogo: { type: 'url', value: '' },
  metaTitle: '',
  metaDescription: '',
  keywords: '',
  googleSiteVerification: '',
  instagramUrl: '',
  facebookUrl: '',
  tiktokUrl: '',
  youtubeUrl: '',
  email: '',
  phone: '',
  address: '',
  finance_emails: '',
  consignments_emails: '',
  buy_emails: '',
  search_emails: '',
};

export const useGeneralConfig = (clientId: number | undefined) => {
  const { refreshClient } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  // Cargar datos iniciales
  const loadInitialData = useCallback(async () => {
    if (!clientId) {
      form.reset(defaultValues);
      return;
    }
    try {
      setIsLoading(true);
      const clientData = await getClientById(clientId);

      if (clientData) {
        // Cast to any to handle potential Json type mismatches temporarily
        const clientAny = clientData as any;

        // Map clientData to formValues using safe access with null protection
        const formValues: FormValues = {
          name: clientAny.name || '',
          description: getSafe(clientAny, 'seo.description', '') || '',
          favicon: {
            type: 'url',
            value: clientAny.favicon || '',
          },
          primaryColor:
            getSafe(clientAny, 'theme.light.primary', '#000000') || '#000000',
          secondaryColor:
            getSafe(clientAny, 'theme.light.secondary', '#ffffff') || '#ffffff',
          darkPrimaryColor:
            getSafe(clientAny, 'theme.dark.primary', '#ffffff') || '#ffffff',
          darkSecondaryColor:
            getSafe(clientAny, 'theme.dark.secondary', '#000000') || '#000000',
          hasDarkMode: getSafe(clientAny, 'has_dark_mode', false) || false,
          darkModeLogo: {
            type: 'url',
            value: clientAny.logo_dark || '',
          },
          lightModeLogo: {
            type: 'url',
            value: clientAny.logo || '',
          },
          metaTitle: getSafe(clientAny, 'seo.title', '') || '',
          keywords: Array.isArray(getSafe(clientAny, 'seo.keywords'))
            ? getSafe(clientAny, 'seo.keywords', []).join(', ')
            : getSafe(clientAny, 'seo.keywords', '') || '',
          googleSiteVerification:
            getSafe(clientAny, 'seo.google_site_verification', '') || '',
          instagramUrl: getSafe(clientAny, 'seo.social_links.instagram', '') || '',
          facebookUrl: getSafe(clientAny, 'seo.social_links.facebook', '') || '',
          tiktokUrl: getSafe(clientAny, 'seo.social_links.tiktok', '') || '',
          youtubeUrl: getSafe(clientAny, 'seo.social_links.youtube', '') || '',
          email: getSafe(clientAny, 'contact.email', '') || '',
          phone: getSafe(clientAny, 'contact.phone', '') || '',
          address: getSafe(clientAny, 'contact.address', '') || '',
          finance_emails: Array.isArray(
            getSafe(clientAny, 'contact.finance_emails')
          )
            ? getSafe(clientAny, 'contact.finance_emails', []).join(', ')
            : getSafe(clientAny, 'contact.finance_emails', '') || '',
          consignments_emails: Array.isArray(
            getSafe(clientAny, 'contact.consignments_emails')
          )
            ? getSafe(clientAny, 'contact.consignments_emails', []).join(', ')
            : getSafe(clientAny, 'contact.consignments_emails', '') || '',
          buy_emails: Array.isArray(getSafe(clientAny, 'contact.buy_emails'))
            ? getSafe(clientAny, 'contact.buy_emails', []).join(', ')
            : getSafe(clientAny, 'contact.buy_emails', '') || '',
          search_emails: Array.isArray(
            getSafe(clientAny, 'contact.search_emails')
          )
            ? getSafe(clientAny, 'contact.search_emails', []).join(', ')
            : getSafe(clientAny, 'contact.search_emails', '') || '',
        };
        form.reset(formValues);
      } else {
        // Cliente nuevo - usar valores por defecto
        console.log('Cliente nuevo detectado, usando valores por defecto');
        form.reset(defaultValues);
      }
    } catch (error) {
      console.error('Error loading client configuration:', error);
      toast.error('No se pudo cargar la configuración. Recarga la página e intenta de nuevo.');
      form.reset(defaultValues); // Reset to default on error
    } finally {
      setIsLoading(false);
    }
  }, [clientId, form]);

  // Guardar cambios
  const saveConfig = useCallback(
    async (data: any) => {
      console.log('saving general config', data);
      console.log('search_emails value:', data.search_emails);
      if (!clientId) {
        toast.error('No se pudo identificar tu cuenta. Recarga la página.');
        return;
      }
      try {
        setIsLoading(true);

        // Map FormValues back to ClientFormData structure
        const clientUpdateData: Partial<ClientFormData> = {
          name: data.name,
          theme: {
            light: {
              primary: data.primaryColor,
              secondary: data.secondaryColor,
            },
            dark: {
              primary: data.darkPrimaryColor,
              secondary: data.darkSecondaryColor,
            },
          },
          has_dark_mode: data.hasDarkMode,
          logo: data.lightModeLogo.value,
          logo_dark: data.darkModeLogo.value,
          favicon: data.favicon.value,
          seo: {
            title: data.metaTitle,
            description: data.description,
            keywords: data.keywords
              ? data.keywords.split(',').map((k) => k.trim())
              : [],
            google_site_verification: data.googleSiteVerification?.trim() || null,
            social_links: (() => {
              const links = Object.fromEntries(
                Object.entries({
                  instagram: data.instagramUrl,
                  facebook: data.facebookUrl,
                  tiktok: data.tiktokUrl,
                  youtube: data.youtubeUrl,
                })
                  .map(([k, v]) => [k, (v as string | undefined)?.trim()])
                  .filter(([, v]) => v)
              );
              return Object.keys(links).length ? links : null;
            })(),
          },
          contact: {
            email: data.email,
            phone: data.phone,
            address: data.address,
            finance_emails: data.finance_emails
              ? data.finance_emails
                  .split(',')
                  .map((email) => email.trim())
                  .filter((email) => email)
              : [],
            consignments_emails: data.consignments_emails
              ? data.consignments_emails
                  .split(',')
                  .map((email) => email.trim())
                  .filter((email) => email)
              : [],
            buy_emails: data.buy_emails
              ? data.buy_emails
                  .split(',')
                  .map((email) => email.trim())
                  .filter((email) => email)
              : [],
            search_emails: data.search_emails
              ? data.search_emails
                  .split(',')
                  .map((email) => email.trim())
                  .filter((email) => email)
              : [],
          },
        };

        console.log(
          'clientUpdateData to save:',
          JSON.stringify(clientUpdateData, null, 2)
        );

        // Perform the update using updateClient
        await updateClient(clientId, clientUpdateData as ClientFormData);

        // Refresh client data in AuthContext so UI reflects changes immediately
        await refreshClient();

        toast.success('Configuración guardada exitosamente');
      } catch (error) {
        console.error('Error saving client configuration:', error);
        toast.error('No se pudo guardar la configuración. Intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    },
    [clientId, form, refreshClient]
  );

  return {
    form,
    isLoading,
    loadInitialData,
    saveConfig,
  };
};
