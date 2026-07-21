import { supabase } from '@/integrations/supabase/client';
import { BuilderElement } from '@/types/siteBuilder';

/**
 * Obtiene la configuración del sitio web del cliente
 * @param clientId ID del cliente
 * @returns La configuración del sitio web o null si no existe
 */
export const getWebsiteConfig = async (clientId: number) => {
  const { data, error } = await supabase
    .from('client_website_config')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error al obtener la configuración del sitio web:', error);
    return null;
  }

  return data;
};

/**
 * Actualiza o crea la configuración del sitio web del cliente
 * @param clientId ID del cliente
 * @param config Configuración a guardar
 * @returns La configuración actualizada o null si ocurrió un error
 */
export const saveWebsiteConfig = async (clientId: number, config: any) => {
  // Verificar si ya existe una configuración para este cliente
  const existingConfig = await getWebsiteConfig(clientId);

  if (existingConfig) {
    // Actualizar la configuración existente
    const { data, error } = await supabase
      .from('client_website_config')
      .update({
        ...config,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingConfig.id)
      .select()
      .single();

    if (error) {
      console.error(
        'Error al actualizar la configuración del sitio web:',
        error
      );
      return null;
    }

    return data;
  } else {
    // Crear una nueva configuración
    const { data, error } = await supabase
      .from('client_website_config')
      .insert({
        client_id: clientId,
        ...config,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error al crear la configuración del sitio web:', error);
      return null;
    }

    return data;
  }
};

/**
 * Guarda el HTML de la página de inicio y la estructura de elementos
 * @param clientId ID del cliente
 * @param html HTML completo de la página de inicio
 * @param elements Estructura de elementos que generan el HTML
 * @param isEnabled Estado de habilitación del sitio web
 * @returns La configuración actualizada o null si ocurrió un error
 */
export const saveHomeHtml = async (
  clientId: number,
  html: string,
  elements: BuilderElement[],
  isEnabled: boolean
) => {
  const existingConfig = await getWebsiteConfig(clientId);

  // Serializar la estructura de elementos a JSON
  const elementsStructure = JSON.stringify(elements);

  if (existingConfig) {
    // Actualizar la configuración existente
    const { data, error } = await supabase
      .from('client_website_config')
      .update({
        home_html: html,
        elements_structure: elementsStructure,
        is_enabled: isEnabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingConfig.id)
      .select()
      .single();

    if (error) {
      console.error('Error al guardar el HTML de inicio:', error);
      return null;
    }

    return data;
  } else {
    // Crear una nueva configuración
    const { data, error } = await supabase
      .from('client_website_config')
      .insert({
        client_id: clientId,
        home_html: html,
        elements_structure: elementsStructure,
        is_enabled: isEnabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(
        'Error al crear la configuración con HTML de inicio:',
        error
      );
      return null;
    }

    return data;
  }
};

/**
 * Obtiene la estructura de elementos guardada para el cliente
 * @param clientId ID del cliente
 * @returns La estructura de elementos guardada o null si no existe
 */
export const getSavedElements = async (
  clientId: number
): Promise<BuilderElement[] | null> => {
  const config = await getWebsiteConfig(clientId);

  if (config && config.elements_structure) {
    try {
      return JSON.parse(config.elements_structure) as BuilderElement[];
    } catch (error) {
      console.error('Error al parsear la estructura de elementos:', error);
      return null;
    }
  }

  return null;
};
