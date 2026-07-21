import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { createClient, updateClient } from './ClientService';
import { clientFormSchema, ClientFormValues } from './ClientSchema';
import { Client } from './types';

export function useClientDialog(
  client: Client | null,
  onSave: () => void,
  onClose: () => void
) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      domain: '',
      favicon: '',
      logo: '',
      logo_dark: '',
      theme_light_primary: '',
      theme_light_secondary: '',
      theme_dark_primary: '',
      theme_dark_secondary: '',
      seo_title: '',
      seo_description: '',
      seo_keywords: '',
      contact_email: '',
      contact_phone: '',
      contact_address: '',
      location_lat: '',
      location_lng: '',
      has_demo: false,
      currency: 'CLP',
      default_language: 'es',
    },
  });

  useEffect(() => {
    if (client) {
      form.reset({
        name: client.name || '',
        domain: client.domain || '',
        favicon: client.favicon || '',
        logo: client.logo || '',
        logo_dark: client.logo_dark || '',
        theme_light_primary: client.theme?.light?.primary || '',
        theme_light_secondary: client.theme?.light?.secondary || '',
        theme_dark_primary: client.theme?.dark?.primary || '',
        theme_dark_secondary: client.theme?.dark?.secondary || '',
        seo_title: client.seo?.title || '',
        seo_description: client.seo?.description || '',
        seo_keywords: client.seo?.keywords
          ? client.seo.keywords.join(', ')
          : '',
        contact_email: client.contact?.email || '',
        contact_phone: client.contact?.phone || '',
        contact_address: client.contact?.address || '',
        location_lat: client.location?.lat || '',
        location_lng: client.location?.lng || '',
        has_demo: client.has_demo || false,
        currency: client.currency || 'CLP',
        default_language: client.default_language || 'es',
      });
    } else {
      form.reset({
        name: '',
        domain: '',
        favicon: '',
        logo: '',
        logo_dark: '',
        theme_light_primary: '#facc14',
        theme_light_secondary: '#ffffff',
        theme_dark_primary: '#facc14',
        theme_dark_secondary: '#ffffff',
        seo_title: '',
        seo_description: '',
        seo_keywords: '',
        contact_email: '',
        contact_phone: '',
        contact_address: '',
        location_lat: '',
        location_lng: '',
        has_demo: false,
        currency: 'CLP',
        default_language: 'es',
      });
    }
  }, [client, form]);

  const handleSaveClient = async (values: ClientFormValues) => {
    const clientData = {
      name: values.name,
      domain: values.domain,
      favicon: values.favicon,
      logo: values.logo,
      logo_dark: values.logo_dark,
      theme: {
        light: {
          primary: values.theme_light_primary || '#facc14',
          secondary: values.theme_light_secondary || '#ffffff',
        },
        dark: {
          primary: values.theme_dark_primary || '#facc14',
          secondary: values.theme_dark_secondary || '#ffffff',
        },
      },
      seo: {
        title: values.seo_title,
        description: values.seo_description,
        keywords: values.seo_keywords
          ? values.seo_keywords.split(',').map((k) => k.trim())
          : [],
      },
      contact: {
        email: values.contact_email,
        phone: values.contact_phone,
        address: values.contact_address,
      },
      location: {
        lat: values.location_lat,
        lng: values.location_lng,
      },
      has_demo: values.has_demo,
      currency: values.currency,
      default_language: values.default_language,
    };

    setIsLoading(true);
    try {
      if (!client) {
        await createClient(clientData);
        toast({
          title: 'Cliente creado',
          description:
            'El cliente ha sido creado exitosamente con sus estados de vehículos predeterminados',
        });
      } else {
        await updateClient(client.id, clientData);
        toast({
          title: 'Cliente actualizado',
          description: 'El cliente ha sido actualizado exitosamente',
        });
      }
      onSave();
    } catch (error) {
      console.error('Error in handleSaveClient:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Ocurrió un error al procesar la solicitud',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    isLoading,
    handleSaveClient,
  };
}
