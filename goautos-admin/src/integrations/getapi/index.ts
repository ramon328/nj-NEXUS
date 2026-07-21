import { supabase } from '@/integrations/supabase/client';
import {
  CombinedVehicleApiResponse,
  GetApiVehicleResponse,
  MappedVehicleData,
} from '@/types/getapi';

export type InfoType = 'vehicle' | 'appraisal' | 'both';

/**
 * Obtiene información de vehículo por patente usando la Edge Function
 */
export async function getVehicleInfoByPatent(
  patent: string,
  type: InfoType = 'both'
): Promise<CombinedVehicleApiResponse> {
  console.log(`🔍 [FRONTEND] Searching for patent: ${patent}, type: ${type}`);

  try {
    const { data, error } = await supabase.functions.invoke(
      'get-info-by-patent',
      {
        body: {
          patent: patent.trim().toUpperCase(),
          type,
        },
      }
    );

    console.log(`📡 [FRONTEND] Edge Function response:`, { data, error });

    if (error) {
      console.error(`❌ [FRONTEND] Edge Function error:`, error);
      throw new Error('No se pudo consultar la información del vehículo. Verifica la patente e intenta de nuevo.');
    }

    console.log(
      `✅ [FRONTEND] Raw data received:`,
      JSON.stringify(data, null, 2)
    );
    return data as CombinedVehicleApiResponse;
  } catch (error) {
    console.error('❌ [FRONTEND] Error fetching vehicle info:', error);
    throw error;
  }
}

/**
 * Mapea los datos de la API de getapi.cl a nuestro formato de formulario
 */
export function mapApiDataToFormData(
  apiData: GetApiVehicleResponse,
  brands: any[],
  models: any[],
  fuelTypes: any[],
  colors: any[],
  conditions: any[]
): MappedVehicleData {
  console.log(`🔄 [FRONTEND] Starting mapping process with:`, {
    apiData: JSON.stringify(apiData, null, 2),
    brandsCount: brands.length,
    modelsCount: models.length,
    fuelTypesCount: fuelTypes.length,
    colorsCount: colors.length,
    conditionsCount: conditions.length,
  });

  const mappedData: MappedVehicleData = {
    license_plate: apiData.data.licensePlate,
  };

  // Mapear año
  if (apiData.data.year) {
    mappedData.year = apiData.data.year;
  }

  // Mapear kilometraje
  if (apiData.data.mileage) {
    mappedData.mileage = apiData.data.mileage;
  }

  // Mapear transmisión
  if (apiData.data.transmission) {
    const transmission = apiData.data.transmission.toLowerCase();
    if (transmission.includes('manual') || transmission.includes('mecanica')) {
      mappedData.transmission = 'Manual';
    } else if (
      transmission.includes('automatic') ||
      transmission.includes('automatica')
    ) {
      mappedData.transmission = 'Automática';
    }
  }

  // Mapear marca (buscar mejor coincidencia)
  if (apiData.data.model.brand.name && brands.length > 0) {
    const brandName = apiData.data.model.brand.name.toLowerCase();
    console.log(
      `🏷️ [FRONTEND] Looking for brand: "${brandName}" in`,
      brands.map((b) => `${b.name} (ID: ${b.id})`)
    );

    // Preferir coincidencia EXACTA; sólo si no hay, caer a substring. Antes usaba
    // includes() + .find() (primer match) → una marca como "Aveling-barford" matcheaba
    // "ford" (lo contiene) y ganaba por orden alfabético. Bug reportado.
    const matchingBrand =
      brands.find((brand) => brand.name.toLowerCase() === brandName) ||
      brands.find(
        (brand) =>
          brand.name.toLowerCase().includes(brandName) ||
          brandName.includes(brand.name.toLowerCase())
      );

    if (matchingBrand) {
      console.log(`✅ [FRONTEND] Found matching brand:`, matchingBrand);
      mappedData.brand_id = matchingBrand.id; // Asegurar que es el ID, no el nombre
    } else {
      console.log(`❌ [FRONTEND] No matching brand found for: "${brandName}"`);
    }
  }

  // Mapear modelo (buscar mejor coincidencia - mejorado)
  if (apiData.data.model.name && models.length > 0) {
    const modelName = apiData.data.model.name.toLowerCase();
    console.log(
      `🚗 [FRONTEND] Looking for model: "${modelName}" in`,
      models.map((m) => `${m.name} (ID: ${m.id})`)
    );

    // Extraer palabras clave del nombre del modelo (mejorado)
    const modelKeywords = modelName
      .replace(/\d+(\.\d+)?\s*(l|cc|hp|cv)\b/gi, '') // Remover especificaciones técnicas como "2.3L", "2000CC"
      .replace(
        /\b(aut|automatica|manual|at|mt|awd|2wd|limited|ecoboost)\b/gi,
        ''
      ) // Remover términos técnicos pero preservar 4x4
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .filter((word) => word.length > 2); // Solo palabras de más de 2 caracteres

    console.log(
      `🔍 [FRONTEND] Model keywords extracted (preserving 4x4):`,
      modelKeywords
    );

    let matchingModel = null;
    let bestScore = 0;

    // Buscar modelo con mejor coincidencia (algoritmo mejorado)
    for (const model of models) {
      const dbModelName = model.name.toLowerCase();
      const dbModelWords = dbModelName
        .split(' ')
        .filter((word) => word.length > 1);
      let score = 0;

      // Coincidencia exacta del nombre completo
      if (dbModelName === modelName) {
        score = 100;
        console.log(
          `🎯 [FRONTEND] Perfect match found: "${model.name}" (score: ${score})`
        );
      }
      // El nombre del modelo DB es el prefijo-frase del nombre de la API (ej. API
      // "f 150 platinum 4x4" empieza con el modelo DB "f 150") — señal fuerte, evita
      // que un modelo tipo "explorer 3.5 4x4 aut" gane por tokens genéricos (4x4/3.5).
      else if (dbModelName.length >= 2 && modelName.startsWith(`${dbModelName} `)) {
        score = 95;
        console.log(
          `🎯 [FRONTEND] Prefix match: "${model.name}" (score: ${score})`
        );
      }
      // Coincidencia casi exacta (sin números de versión)
      else if (
        modelKeywords.every((keyword) => dbModelName.includes(keyword))
      ) {
        // Todas las palabras clave están presentes
        const matchedWordsCount = modelKeywords.filter((keyword) =>
          dbModelName.includes(keyword)
        ).length;
        const dbWordsInApi = dbModelWords.filter((dbWord) =>
          modelName.includes(dbWord)
        ).length;

        // Bonificación por número de palabras coincidentes
        score = 85 + matchedWordsCount * 3 + dbWordsInApi * 2;
        console.log(
          `🎯 [FRONTEND] High match: "${model.name}" (${matchedWordsCount} keywords, ${dbWordsInApi} db words) (score: ${score})`
        );
      }
      // Coincidencia de múltiples palabras clave
      else if (
        modelKeywords.filter((keyword) => dbModelName.includes(keyword))
          .length > 1
      ) {
        const matchedCount = modelKeywords.filter((keyword) =>
          dbModelName.includes(keyword)
        ).length;
        score = 70 + matchedCount * 5;
        console.log(
          `🎯 [FRONTEND] Multi-word match: "${model.name}" (${matchedCount} keywords) (score: ${score})`
        );
      }
      // Coincidencia completa de una palabra clave principal
      else if (
        modelKeywords.some(
          (keyword) => dbModelName.includes(keyword) && keyword.length > 3
        )
      ) {
        score = 60;
        console.log(
          `🎯 [FRONTEND] Single keyword match: "${model.name}" (score: ${score})`
        );
      }
      // Coincidencia parcial - el modelo DB contiene alguna palabra del API
      else if (modelKeywords.some((keyword) => dbModelName.includes(keyword))) {
        score = 50;
        console.log(
          `🎯 [FRONTEND] Partial keyword match: "${model.name}" (score: ${score})`
        );
      }
      // Coincidencia inversa - alguna palabra del modelo DB está en el nombre de la API
      else if (
        dbModelWords.some(
          (dbWord) => dbWord.length > 2 && modelName.includes(dbWord)
        )
      ) {
        const matchedDbWords = dbModelWords.filter((dbWord) =>
          modelName.includes(dbWord)
        ).length;
        score = 35 + matchedDbWords * 3;
        console.log(
          `🎯 [FRONTEND] Reverse match: "${model.name}" (${matchedDbWords} db words) (score: ${score})`
        );
      }
      // Buscar también en versión si está disponible
      else if (apiData.data.version) {
        const versionLower = apiData.data.version.toLowerCase();
        if (
          dbModelName.includes(versionLower) ||
          versionLower.includes(dbModelName)
        ) {
          score = 30;
          console.log(
            `🎯 [FRONTEND] Version match: "${model.name}" (score: ${score})`
          );
        }
      }

      if (score > bestScore) {
        bestScore = score;
        matchingModel = model;
        console.log(
          `🏆 [FRONTEND] New best match: "${model.name}" with score ${score}`
        );
      }
    }

    if (matchingModel && bestScore >= 30) {
      // Umbral mínimo de coincidencia
      console.log(
        `✅ [FRONTEND] Found matching model with score ${bestScore}:`,
        matchingModel
      );
      mappedData.model_id = matchingModel.id.toString();
    } else {
      console.log(
        `❌ [FRONTEND] No good model match found for: "${modelName}"`
      );
      console.log(
        `🔍 [FRONTEND] Best score was: ${bestScore} with model:`,
        matchingModel
      );
      console.log(`🔍 [FRONTEND] Keywords tried:`, modelKeywords);
      console.log(
        `🔍 [FRONTEND] Also tried version: "${apiData.data.version}"`
      );
    }
  }

  // Mapear tipo de combustible
  if (apiData.data.fuel && fuelTypes.length > 0) {
    const fuel = apiData.data.fuel.toLowerCase();
    console.log(
      `⛽ [FRONTEND] Looking for fuel: "${fuel}" in`,
      fuelTypes.map((f) => `${f.name} (ID: ${f.id})`)
    );

    let fuelTypeId: string | undefined;

    if (fuel.includes('bencina') || fuel.includes('gasolina')) {
      const gasoline = fuelTypes.find((ft) =>
        ft.name.toLowerCase().includes('gasolina')
      );
      fuelTypeId = gasoline?.id?.toString();
      console.log(`✅ [FRONTEND] Found gasoline fuel type:`, gasoline);
    } else if (fuel.includes('diesel') || fuel.includes('petróleo')) {
      const diesel = fuelTypes.find((ft) =>
        ft.name.toLowerCase().includes('diesel')
      );
      fuelTypeId = diesel?.id?.toString();
      console.log(`✅ [FRONTEND] Found diesel fuel type:`, diesel);
    } else if (fuel.includes('eléctrico') || fuel.includes('electric')) {
      const electric = fuelTypes.find((ft) =>
        ft.name.toLowerCase().includes('eléctrico')
      );
      fuelTypeId = electric?.id?.toString();
      console.log(`✅ [FRONTEND] Found electric fuel type:`, electric);
    } else if (fuel.includes('híbrido') || fuel.includes('hybrid')) {
      const hybrid = fuelTypes.find((ft) =>
        ft.name.toLowerCase().includes('híbrido')
      );
      fuelTypeId = hybrid?.id?.toString();
      console.log(`✅ [FRONTEND] Found hybrid fuel type:`, hybrid);
    }

    if (fuelTypeId) {
      mappedData.fuel_type_id = fuelTypeId;
    } else {
      console.log(`❌ [FRONTEND] No matching fuel type found for: "${fuel}"`);
    }
  }

  // Mapear color (buscar mejor coincidencia)
  if (apiData.data.color && colors.length > 0) {
    const colorName = apiData.data.color.toLowerCase();
    console.log(
      `🎨 [FRONTEND] Looking for color: "${colorName}" in`,
      colors.map((c) => `${c.name} (ID: ${c.id})`)
    );

    // Preferir coincidencia EXACTA; sólo si no hay, caer a substring/mapeos.
    const matchingColor =
      colors.find((color) => color.name.toLowerCase() === colorName) ||
      colors.find(
        (color) =>
          color.name.toLowerCase().includes(colorName) ||
          colorName.includes(color.name.toLowerCase()) ||
          // Mapeos específicos de colores comunes
          (colorName.includes('plateado') &&
            color.name.toLowerCase().includes('plata')) ||
          (colorName.includes('negro') &&
            color.name.toLowerCase().includes('negro')) ||
          (colorName.includes('blanco') &&
            color.name.toLowerCase().includes('blanco')) ||
          (colorName.includes('rojo') &&
            color.name.toLowerCase().includes('rojo')) ||
          (colorName.includes('azul') &&
            color.name.toLowerCase().includes('azul'))
      );

    if (matchingColor) {
      console.log(`✅ [FRONTEND] Found matching color:`, matchingColor);
      mappedData.color_id = matchingColor.id.toString();
    } else {
      console.log(`❌ [FRONTEND] No matching color found for: "${colorName}"`);
    }
  }

  // Mapear condición (por defecto "Usado")
  if (conditions.length > 0) {
    console.log(
      `🏷️ [FRONTEND] Looking for condition "usado" in:`,
      conditions.map((c) => `${c.name} (ID: ${c.id})`)
    );

    const usedCondition = conditions.find(
      (condition) =>
        condition.name.toLowerCase().includes('usado') ||
        condition.name.toLowerCase().includes('segunda mano')
    );

    if (usedCondition) {
      console.log(`✅ [FRONTEND] Found used condition:`, usedCondition);
      mappedData.condition_id = usedCondition.id.toString();
    } else {
      console.log(`❌ [FRONTEND] No "usado" condition found`);
    }
  }

  // Mapear números de motor y chasis
  if (apiData.data.engineNumber) {
    mappedData.engine_number = apiData.data.engineNumber;
  }

  if (apiData.data.vinNumber) {
    mappedData.chassis_number = apiData.data.vinNumber;
  }

  // Por defecto 1 dueño (se puede ajustar manualmente)
  mappedData.owners = 1;

  console.log(
    `🎯 [FRONTEND] Final mapped data:`,
    JSON.stringify(mappedData, null, 2)
  );
  return mappedData;
}

/**
 * Hook personalizado para manejar la obtención y mapeo de datos del vehículo
 */
export function useVehicleInfoByPatent() {
  const fetchAndMapVehicleInfo = async (
    patent: string,
    brands: any[],
    models: any[],
    fuelTypes: any[],
    colors: any[],
    conditions: any[],
    categories: any[]
  ): Promise<{
    mappedData: MappedVehicleData | null;
    originalData?: any;
    error: string | null;
  }> => {
    console.log(
      `🚀 [FRONTEND] Starting fetchAndMapVehicleInfo for patent: ${patent}`
    );

    try {
      // Una sola llamada que consulta ambos endpoints de GetAPI en paralelo
      // (registro del vehículo `/plate/` + tasación fiscal `/appraisal/`).
      // Antes hacíamos 2-3 llamadas separadas a la Edge Function.
      const response = await getVehicleInfoByPatent(patent, 'both');
      console.log(`📋 [FRONTEND] API response:`, response);

      const vehicleOk = !!(
        response.vehicleInfo?.success && response.vehicleInfo.data
      );
      const appraisalOk = !!(
        response.appraisal?.success && response.appraisal.data
      );

      // Aceptamos la patente si CUALQUIERA de los dos endpoints trajo datos.
      // Antes el gate miraba solo `/plate/` (vehicleInfo): si ese fallaba pero
      // la tasación sí tenía el auto, lo marcábamos como "no encontrado"
      // (falso negativo). Ahora basta con que uno de los dos responda.
      if (vehicleOk || appraisalOk) {
        console.log(
          `✅ [FRONTEND] Vehicle found (vehicleOk=${vehicleOk}, appraisalOk=${appraisalOk}), starting mapping...`
        );

        // ESTRATEGIA DUAL: appraisal como principal (trae precios + info básica),
        // vehicle como complemento (mileage, engineNumber, etc.)
        let primaryData = null;
        let secondaryData = null;
        let priceData = null;

        if (appraisalOk) {
          primaryData = response.appraisal.data.data.vehicle;
          priceData = response.appraisal.data.data;
          console.log(`✅ [FRONTEND] Using appraisal as primary data source`);
        }

        if (vehicleOk) {
          secondaryData = response.vehicleInfo.data.data;
          console.log(
            `✅ [FRONTEND] Using vehicle as secondary data source for additional fields`
          );
          // Si la tasación no trajo el sub-objeto del vehículo, usamos el
          // registro `/plate/` como fuente principal.
          if (!primaryData) {
            primaryData = secondaryData;
            console.log(
              `⚠️ [FRONTEND] Appraisal sin datos de vehículo, usando /plate/ como principal`
            );
          }
        }

        if (!primaryData) {
          throw new Error('No se pudieron obtener datos del vehículo');
        }

        // Mapear marca y obtener modelos dinámicamente
        let matchingBrand = null;

        if (primaryData.model.brand.name && brands.length > 0) {
          const brandName = primaryData.model.brand.name.toLowerCase();
          console.log(
            `🔍 [FRONTEND] First pass - looking for brand: "${brandName}"`
          );

          // Preferir coincidencia EXACTA; sólo si no hay, caer a substring. Antes
          // usaba includes() + .find() (primer match) → "Aveling-barford" matcheaba
          // "ford" (lo contiene) y ganaba por orden alfabético. Bug reportado.
          matchingBrand =
            brands.find((brand) => brand.name.toLowerCase() === brandName) ||
            brands.find(
              (brand) =>
                brand.name.toLowerCase().includes(brandName) ||
                brandName.includes(brand.name.toLowerCase())
            );

          if (matchingBrand) {
            console.log(
              `✅ [FRONTEND] Found brand for models fetch:`,
              matchingBrand
            );
          }
        }

        // Obtener modelos dinámicamente si encontramos la marca
        let modelsForMapping = models;
        if (matchingBrand) {
          console.log(
            `🚗 [FRONTEND] Fetching models for brand ID: ${matchingBrand.id}`
          );
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const { data: modelData, error: modelError } = await supabase
              .from('models')
              .select('id, name, brand_id')
              .eq('brand_id', matchingBrand.id)
              .order('name');

            if (modelError) {
              console.error('❌ [FRONTEND] Error fetching models:', modelError);
            } else {
              modelsForMapping = modelData || [];
              console.log(
                `✅ [FRONTEND] Fetched ${modelsForMapping.length} models for brand`
              );
            }
          } catch (error) {
            console.error('❌ [FRONTEND] Error in model fetch:', error);
          }
        }

        // Ahora mapear con los datos combinados
        const mappedData = mapCombinedApiDataToFormData(
          primaryData,
          secondaryData,
          priceData,
          brands,
          modelsForMapping,
          fuelTypes,
          colors,
          conditions,
          categories
        );

        console.log(`🎉 [FRONTEND] Mapping completed successfully!`);
        return {
          mappedData,
          originalData: primaryData, // Pasar los datos principales (appraisal o vehicle)
          error: null,
        };
      } else {
        // Ninguno de los dos endpoints (vehicle ni appraisal) trajo datos:
        // la patente realmente no existe en GetAPI.
        const errorMsg =
          response.vehicleInfo?.error ||
          response.appraisal?.error ||
          'No se pudo obtener información del vehículo';
        console.log(
          `❌ [FRONTEND] No vehicle info found in either endpoint:`,
          {
            vehicleError: response.vehicleInfo?.error,
            appraisalError: response.appraisal?.error,
          }
        );
        return {
          mappedData: null,
          originalData: undefined,
          error: errorMsg,
        };
      }
    } catch (error) {
      console.error(
        `💥 [FRONTEND] Exception in fetchAndMapVehicleInfo:`,
        error
      );
      return {
        mappedData: null,
        originalData: undefined,
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  };

  return { fetchAndMapVehicleInfo };
}

/**
 * Mapea datos combinados de appraisal y vehicle al formato del formulario
 */
function mapCombinedApiDataToFormData(
  primaryData: any,
  secondaryData: any | null,
  priceData: any | null,
  brands: any[],
  models: any[],
  fuelTypes: any[],
  colors: any[],
  conditions: any[],
  categories: any[]
): MappedVehicleData {
  console.log(`🔄 [FRONTEND] Starting combined mapping process with:`, {
    primaryData,
    secondaryData,
    priceData,
  });

  const mappedData: MappedVehicleData = {
    license_plate: primaryData.licensePlate || '',
  };

  // Usar datos principales (appraisal) y complementar con secondary (vehicle)
  const dataToUse = {
    ...primaryData,
    // Complementar con campos que solo están en vehicle
    mileage: secondaryData?.mileage || primaryData.mileage,
    engineNumber: secondaryData?.engineNumber || primaryData.engineNumber,
    vinNumber: secondaryData?.vinNumber || primaryData.vinNumber,
    owners: secondaryData?.owners || 1,
  };

  // ALWAYS populate raw text fields from API (for display and manual selection)
  if (dataToUse.model?.brand?.name) {
    mappedData.brand_name = dataToUse.model.brand.name;
  }
  if (dataToUse.model?.name) {
    mappedData.model_name = dataToUse.model.name;
  }
  if (dataToUse.version) {
    mappedData.version = dataToUse.version;
  }
  if (dataToUse.color) {
    mappedData.color_name = dataToUse.color;
  }
  if (dataToUse.fuel) {
    mappedData.fuel_name = dataToUse.fuel;
  }
  if (dataToUse.model?.typeVehicle?.name) {
    mappedData.category_name = dataToUse.model.typeVehicle.name;
  }
  if (dataToUse.doors) {
    mappedData.doors = dataToUse.doors;
  }
  if (dataToUse.engine) {
    mappedData.engine = dataToUse.engine;
  }
  if (dataToUse.vinNumber) {
    mappedData.vin_number = dataToUse.vinNumber;
  }

  // Mapear año
  if (dataToUse.year) {
    mappedData.year = dataToUse.year;
  }

  // Mapear transmisión
  if (dataToUse.transmission) {
    const transmission = dataToUse.transmission.toLowerCase();
    if (transmission.includes('manual') || transmission.includes('mecanica') || transmission.includes('mecánica')) {
      mappedData.transmission = 'manual'; // Use lowercase to match form values
    } else if (
      transmission.includes('automatic') ||
      transmission.includes('automatica') ||
      transmission.includes('automática') ||
      transmission.includes('aut') ||
      transmission.includes('secuencial') ||
      transmission.includes('cvt') ||
      transmission.includes('tiptronic')
    ) {
      mappedData.transmission = 'automatic'; // Use lowercase to match form values
    }
    console.log(`🔄 [FRONTEND] Transmission mapped: "${dataToUse.transmission}" -> "${mappedData.transmission}"`);
  }

  // Mapear marca (buscar mejor coincidencia)
  if (dataToUse.model.brand.name && brands.length > 0) {
    const brandName = dataToUse.model.brand.name.toLowerCase();
    console.log(
      `🏷️ [FRONTEND] Looking for brand: "${brandName}" in`,
      brands.map((b) => `${b.name} (ID: ${b.id})`)
    );

    // Preferir coincidencia EXACTA; sólo si no hay, caer a substring. Antes usaba
    // includes() + .find() (primer match) → una marca como "Aveling-barford" matcheaba
    // "ford" (lo contiene) y ganaba por orden alfabético. Bug reportado.
    const matchingBrand =
      brands.find((brand) => brand.name.toLowerCase() === brandName) ||
      brands.find(
        (brand) =>
          brand.name.toLowerCase().includes(brandName) ||
          brandName.includes(brand.name.toLowerCase())
      );

    if (matchingBrand) {
      console.log(`✅ [FRONTEND] Found matching brand:`, matchingBrand);
      mappedData.brand_id = matchingBrand.id;
    } else {
      console.log(`❌ [FRONTEND] No matching brand found for: "${brandName}"`);
    }
  }

  // Mapear modelo usando la lógica mejorada existente
  if (dataToUse.model.name && models.length > 0) {
    const modelName = dataToUse.model.name.toLowerCase();
    console.log(
      `🚗 [FRONTEND] Looking for model: "${modelName}" in`,
      models.map((m) => `${m.name} (ID: ${m.id})`)
    );

    // Reutilizar la lógica de mapeo de modelo existente
    const mappedModel = findBestModelMatch(
      modelName,
      dataToUse.version,
      models
    );
    if (mappedModel) {
      mappedData.model_id = mappedModel.id.toString();
    }
  }

  // Mapear tipo de combustible
  if (dataToUse.fuel && fuelTypes.length > 0) {
    const fuel = dataToUse.fuel.toLowerCase();
    console.log(
      `⛽ [FRONTEND] Looking for fuel: "${fuel}" in`,
      fuelTypes.map((f) => `${f.name} (ID: ${f.id})`)
    );

    let fuelTypeId: string | undefined;

    if (fuel.includes('bencina') || fuel.includes('gasolina')) {
      const gasoline = fuelTypes.find((ft) =>
        ft.name.toLowerCase().includes('gasolina')
      );
      fuelTypeId = gasoline?.id?.toString();
      console.log(`✅ [FRONTEND] Found gasoline fuel type:`, gasoline);
    } else if (fuel.includes('diesel') || fuel.includes('petróleo')) {
      const diesel = fuelTypes.find((ft) =>
        ft.name.toLowerCase().includes('diesel')
      );
      fuelTypeId = diesel?.id?.toString();
      console.log(`✅ [FRONTEND] Found diesel fuel type:`, diesel);
    } else if (fuel.includes('eléctrico') || fuel.includes('electric')) {
      const electric = fuelTypes.find((ft) =>
        ft.name.toLowerCase().includes('eléctrico')
      );
      fuelTypeId = electric?.id?.toString();
      console.log(`✅ [FRONTEND] Found electric fuel type:`, electric);
    } else if (fuel.includes('híbrido') || fuel.includes('hybrid')) {
      const hybrid = fuelTypes.find((ft) =>
        ft.name.toLowerCase().includes('híbrido')
      );
      fuelTypeId = hybrid?.id?.toString();
      console.log(`✅ [FRONTEND] Found hybrid fuel type:`, hybrid);
    }

    if (fuelTypeId) {
      mappedData.fuel_type_id = fuelTypeId;
    } else {
      console.log(`❌ [FRONTEND] No matching fuel type found for: "${fuel}"`);
    }
  }

  // Mapear color
  if (dataToUse.color && colors.length > 0) {
    const colorName = dataToUse.color.toLowerCase();
    console.log(
      `🎨 [FRONTEND] Looking for color: "${colorName}" in`,
      colors.map((c) => `${c.name} (ID: ${c.id})`)
    );

    // Preferir coincidencia EXACTA; sólo si no hay, caer a substring/mapeos.
    const matchingColor =
      colors.find((color) => color.name.toLowerCase() === colorName) ||
      colors.find(
        (color) =>
          color.name.toLowerCase().includes(colorName) ||
          colorName.includes(color.name.toLowerCase()) ||
          // Mapeos específicos de colores comunes
          (colorName.includes('plateado') &&
            color.name.toLowerCase().includes('plata')) ||
          (colorName.includes('negro') &&
            color.name.toLowerCase().includes('negro')) ||
          (colorName.includes('blanco') &&
            color.name.toLowerCase().includes('blanco')) ||
          (colorName.includes('rojo') &&
            color.name.toLowerCase().includes('rojo')) ||
          (colorName.includes('azul') &&
            color.name.toLowerCase().includes('azul'))
      );

    if (matchingColor) {
      console.log(`✅ [FRONTEND] Found matching color:`, matchingColor);
      mappedData.color_id = matchingColor.id.toString();
    } else {
      console.log(`❌ [FRONTEND] No matching color found for: "${colorName}"`);
    }
  }

  // Mapear condición (por defecto "Usado")
  if (conditions.length > 0) {
    console.log(
      `🏷️ [FRONTEND] Looking for condition "usado" in:`,
      conditions.map((c) => `${c.name} (ID: ${c.id})`)
    );

    const usedCondition = conditions.find(
      (condition) =>
        condition.name.toLowerCase().includes('usado') ||
        condition.name.toLowerCase().includes('used')
    );

    if (usedCondition) {
      console.log(`✅ [FRONTEND] Found used condition:`, usedCondition);
      mappedData.condition_id = usedCondition.id.toString();
    } else {
      console.log(`❌ [FRONTEND] No "usado" condition found`);
    }
  }

  // 🚗 MAPEAR CATEGORÍA (TIPO DE VEHÍCULO)
  if (dataToUse.model?.typeVehicle?.name && categories.length > 0) {
    const vehicleType = dataToUse.model.typeVehicle.name.toLowerCase();
    console.log(
      `🚙 [FRONTEND] Looking for vehicle type: "${vehicleType}" in`,
      categories.map((c) => `${c.name} (ID: ${c.id})`)
    );

    let matchingCategory = null;
    let bestCategoryScore = 0;

    // Buscar categoría con mejor coincidencia
    for (const category of categories) {
      const categoryName = category.name.toLowerCase();
      let score = 0;

      // Mapeos específicos para tipos de vehículo
      if (
        vehicleType.includes('station wagon') ||
        vehicleType.includes('wagon')
      ) {
        if (
          categoryName.includes('wagon') ||
          categoryName.includes('familiar')
        ) {
          score = 90;
        } else if (categoryName.includes('suv')) {
          score = 70; // SUV es similar a station wagon
        }
      } else if (
        vehicleType.includes('suv') ||
        vehicleType.includes('sport utility')
      ) {
        if (categoryName.includes('suv')) {
          score = 90;
        } else if (categoryName.includes('wagon')) {
          score = 70; // Wagon es similar a SUV
        }
      } else if (vehicleType.includes('sedan')) {
        if (categoryName.includes('sedan')) {
          score = 90;
        }
      } else if (vehicleType.includes('coupe')) {
        if (categoryName.includes('coupe')) {
          score = 90;
        }
      } else if (vehicleType.includes('hatchback')) {
        if (categoryName.includes('hatchback')) {
          score = 90;
        }
      } else if (
        vehicleType.includes('pickup') ||
        vehicleType.includes('camioneta')
      ) {
        if (categoryName.includes('pickup')) {
          score = 90;
        }
      } else if (
        vehicleType.includes('van') ||
        vehicleType.includes('minivan')
      ) {
        if (categoryName.includes('van')) {
          score = 90;
        }
      } else if (
        vehicleType.includes('convertible') ||
        vehicleType.includes('cabrio')
      ) {
        if (
          categoryName.includes('convertible') ||
          categoryName.includes('cabrio')
        ) {
          score = 90;
        }
      }

      // Coincidencia parcial por palabras
      else if (
        categoryName.includes(vehicleType) ||
        vehicleType.includes(categoryName)
      ) {
        score = 60;
      }

      if (score > bestCategoryScore) {
        bestCategoryScore = score;
        matchingCategory = category;
        console.log(
          `🎯 [FRONTEND] New best category match: "${category.name}" with score ${score}`
        );
      }
    }

    if (matchingCategory && bestCategoryScore >= 60) {
      console.log(
        `✅ [FRONTEND] Found matching category with score ${bestCategoryScore}:`,
        matchingCategory
      );
      mappedData.category_id = matchingCategory.id.toString();
    } else {
      console.log(
        `❌ [FRONTEND] No good category match found for: "${vehicleType}"`
      );
      console.log(
        `🔍 [FRONTEND] Available categories:`,
        categories.map((c) => c.name)
      );
    }
  }

  // Mapear números de motor y chasis
  if (dataToUse.engineNumber) {
    mappedData.engine_number = dataToUse.engineNumber;
  }

  if (dataToUse.vinNumber) {
    mappedData.chassis_number = dataToUse.vinNumber;
  }

  // Mapear kilometraje
  if (dataToUse.mileage) {
    mappedData.mileage = dataToUse.mileage;
  }

  // Mapear dueños
  if (dataToUse.owners) {
    mappedData.owners = dataToUse.owners;
  } else {
    mappedData.owners = 1; // Por defecto 1 dueño
  }

  // 💰 MAPEAR PRECIOS DEL APPRAISAL
  if (priceData && priceData.precioUsado) {
    console.log(
      `💰 [FRONTEND] Mapping prices from appraisal:`,
      priceData.precioUsado
    );

    mappedData.price = priceData.precioUsado.precio;
    mappedData.price_min = priceData.precioUsado.banda_min;
    mappedData.price_max = priceData.precioUsado.banda_max;

    if (priceData.precioRetoma) {
      mappedData.trade_in_price = priceData.precioRetoma;
    }

    console.log(`💎 [FRONTEND] Prices mapped successfully:`, {
      price: mappedData.price,
      price_min: mappedData.price_min,
      price_max: mappedData.price_max,
      trade_in_price: mappedData.trade_in_price,
    });
  }

  console.log(
    `🎯 [FRONTEND] Final combined mapped data:`,
    JSON.stringify(mappedData, null, 2)
  );
  return mappedData;
}

/**
 * Función auxiliar para encontrar la mejor coincidencia de modelo
 */
function findBestModelMatch(
  modelName: string,
  version: string | undefined,
  models: any[]
) {
  // Extraer palabras clave del nombre del modelo (mejorado)
  const modelKeywords = modelName
    .replace(/\d+(\.\d+)?\s*(l|cc|hp|cv)\b/gi, '')
    .replace(/\b(aut|automatica|manual|at|mt|awd|2wd|limited|ecoboost)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((word) => word.length > 2);

  console.log(
    `🔍 [FRONTEND] Model keywords extracted (preserving 4x4):`,
    modelKeywords
  );

  let matchingModel = null;
  let bestScore = 0;

  // Buscar modelo con mejor coincidencia (algoritmo mejorado)
  for (const model of models) {
    const dbModelName = model.name.toLowerCase();
    const dbModelWords = dbModelName
      .split(' ')
      .filter((word) => word.length > 1);
    let score = 0;

    // Coincidencia exacta del nombre completo
    if (dbModelName === modelName) {
      score = 100;
      console.log(
        `🎯 [FRONTEND] Perfect match found: "${model.name}" (score: ${score})`
      );
    }
    // El nombre del modelo DB es el prefijo-frase del nombre de la API (ej. API
    // "f 150 platinum 4x4" empieza con el modelo DB "f 150") — señal fuerte, evita
    // que un modelo tipo "explorer 3.5 4x4 aut" gane por tokens genéricos (4x4/3.5).
    else if (dbModelName.length >= 2 && modelName.startsWith(`${dbModelName} `)) {
      score = 95;
      console.log(
        `🎯 [FRONTEND] Prefix match: "${model.name}" (score: ${score})`
      );
    }
    // Coincidencia casi exacta (sin números de versión)
    else if (modelKeywords.every((keyword) => dbModelName.includes(keyword))) {
      // Todas las palabras clave están presentes
      const matchedWordsCount = modelKeywords.filter((keyword) =>
        dbModelName.includes(keyword)
      ).length;
      const dbWordsInApi = dbModelWords.filter((dbWord) =>
        modelName.includes(dbWord)
      ).length;

      // Bonificación por número de palabras coincidentes
      score = 85 + matchedWordsCount * 3 + dbWordsInApi * 2;
      console.log(
        `🎯 [FRONTEND] High match: "${model.name}" (${matchedWordsCount} keywords, ${dbWordsInApi} db words) (score: ${score})`
      );
    }
    // Coincidencia de múltiples palabras clave
    else if (
      modelKeywords.filter((keyword) => dbModelName.includes(keyword)).length >
      1
    ) {
      const matchedCount = modelKeywords.filter((keyword) =>
        dbModelName.includes(keyword)
      ).length;
      score = 70 + matchedCount * 5;
      console.log(
        `🎯 [FRONTEND] Multi-word match: "${model.name}" (${matchedCount} keywords) (score: ${score})`
      );
    }
    // Coincidencia completa de una palabra clave principal
    else if (
      modelKeywords.some(
        (keyword) => dbModelName.includes(keyword) && keyword.length > 3
      )
    ) {
      score = 60;
      console.log(
        `🎯 [FRONTEND] Single keyword match: "${model.name}" (score: ${score})`
      );
    }
    // Coincidencia parcial - el modelo DB contiene alguna palabra del API
    else if (modelKeywords.some((keyword) => dbModelName.includes(keyword))) {
      score = 50;
      console.log(
        `🎯 [FRONTEND] Partial keyword match: "${model.name}" (score: ${score})`
      );
    }
    // Coincidencia inversa - alguna palabra del modelo DB está en el nombre de la API
    else if (
      dbModelWords.some(
        (dbWord) => dbWord.length > 2 && modelName.includes(dbWord)
      )
    ) {
      const matchedDbWords = dbModelWords.filter((dbWord) =>
        modelName.includes(dbWord)
      ).length;
      score = 35 + matchedDbWords * 3;
      console.log(
        `🎯 [FRONTEND] Reverse match: "${model.name}" (${matchedDbWords} db words) (score: ${score})`
      );
    }
    // Buscar también en versión si está disponible
    else if (version) {
      const versionLower = version.toLowerCase();
      if (
        dbModelName.includes(versionLower) ||
        versionLower.includes(dbModelName)
      ) {
        score = 30;
        console.log(
          `🎯 [FRONTEND] Version match: "${model.name}" (score: ${score})`
        );
      }
    }

    if (score > bestScore) {
      bestScore = score;
      matchingModel = model;
      console.log(
        `🏆 [FRONTEND] New best match: "${model.name}" with score ${score}`
      );
    }
  }

  if (matchingModel && bestScore >= 30) {
    console.log(
      `✅ [FRONTEND] Found matching model with score ${bestScore}:`,
      matchingModel
    );
    return matchingModel;
  } else {
    console.log(`❌ [FRONTEND] No good model match found for: "${modelName}"`);
    return null;
  }
}
