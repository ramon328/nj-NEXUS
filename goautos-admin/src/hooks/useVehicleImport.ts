import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { isSoldStatusName } from '@/services/vehicleService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface VehicleImportRow {
  Marca: string;
  Modelo: string;
  Año: number;
  Precio: number;
  Kilometraje?: number;
  Patente?: string;
  Color?: string;
  Combustible?: string;
  Transmisión?: string;
  Tracción?: string;
  Condición?: string;
  Categoría?: string;
  Descripción?: string;
  'N° Motor'?: string;
  'N° Chasis'?: string;
  Dueños?: number;
  Llaves?: number;
}

export interface ImportResult {
  total: number;
  success: number;
  errors: Array<{ row: number; error: string; vehicle: string }>;
  duplicates: Array<{ row: number; vehicle: string; reason: string }>;
}

// Normaliza patente/chasis para comparar sin importar mayúsculas, espacios o guiones
const normalizeKey = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '');

export const useVehicleImport = () => {
  const { clientId } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<VehicleImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ row: number; field: string; message: string }>
  >([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const parseExcelFile = useCallback((file: File) => {
    return new Promise<VehicleImportRow[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<VehicleImportRow>(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(new Error('Error al leer el archivo Excel'));
        }
      };
      reader.onerror = () => reject(new Error('Error al cargar el archivo'));
      reader.readAsArrayBuffer(file);
    });
  }, []);

  const validateData = useCallback((data: VehicleImportRow[]) => {
    const errors: Array<{ row: number; field: string; message: string }> = [];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because row 1 is header

      if (!row.Marca || String(row.Marca).trim() === '') {
        errors.push({ row: rowNum, field: 'Marca', message: 'Marca es requerida' });
      }
      if (!row.Modelo || String(row.Modelo).trim() === '') {
        errors.push({ row: rowNum, field: 'Modelo', message: 'Modelo es requerido' });
      }
      if (!row.Año || isNaN(Number(row.Año)) || Number(row.Año) < 1900 || Number(row.Año) > new Date().getFullYear() + 1) {
        errors.push({ row: rowNum, field: 'Año', message: 'Año inválido' });
      }
      if (!row.Precio || isNaN(Number(row.Precio)) || Number(row.Precio) <= 0) {
        errors.push({ row: rowNum, field: 'Precio', message: 'Precio debe ser un número mayor a 0' });
      }
      if (row.Kilometraje !== undefined && row.Kilometraje !== null && String(row.Kilometraje).trim() !== '' && (isNaN(Number(row.Kilometraje)) || Number(row.Kilometraje) < 0)) {
        errors.push({ row: rowNum, field: 'Kilometraje', message: 'Kilometraje debe ser un número válido' });
      }
    });

    return errors;
  }, []);

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const data = await parseExcelFile(file);

        if (data.length === 0) {
          toast({
            title: 'Archivo vacío',
            description: 'El archivo no contiene datos para importar',
            variant: 'destructive',
          });
          return;
        }

        const errors = validateData(data);
        setParsedData(data);
        setValidationErrors(errors);
        setImportResult(null);
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Error al procesar el archivo',
          variant: 'destructive',
        });
      }
    },
    [parseExcelFile, validateData]
  );

  const findOrCreateBrand = async (brandName: string): Promise<string | null> => {
    const normalizedName = brandName.trim();

    // Search for existing brand (case-insensitive)
    const { data: existing } = await supabase
      .from('brands')
      .select('id, name')
      .ilike('name', normalizedName)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // Create new brand
    const { data: created, error } = await supabase
      .from('brands')
      .insert({ name: normalizedName, client_id: clientId })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating brand:', error);
      return null;
    }
    return created?.id || null;
  };

  const findOrCreateModel = async (
    modelName: string,
    brandId: string
  ): Promise<number | null> => {
    const normalizedName = modelName.trim();

    // Search for existing model under this brand
    const { data: existing } = await supabase
      .from('models')
      .select('id, name')
      .eq('brand_id', brandId)
      .ilike('name', normalizedName)
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // Create new model
    const { data: created, error } = await supabase
      .from('models')
      .insert({ name: normalizedName, brand_id: brandId })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating model:', error);
      return null;
    }
    return created?.id || null;
  };

  const findReferenceId = async (
    table: string,
    name: string
  ): Promise<number | null> => {
    if (!name || name.trim() === '') return null;

    const { data } = await supabase
      .from(table)
      .select('id')
      .ilike('name', name.trim())
      .limit(1);

    return data && data.length > 0 ? data[0].id : null;
  };

  const getDefaultStatusId = async (): Promise<number | null> => {
    if (!clientId) return null;

    const { data } = await supabase
      .from('clients_vehicles_states')
      .select('id')
      .eq('client_id', clientId)
      .order('order', { ascending: true })
      .limit(1);

    return data && data.length > 0 ? Number(data[0].id) : null;
  };

  const importVehicles = useCallback(async () => {
    if (!clientId || parsedData.length === 0) return;

    // Filter out rows that have critical validation errors
    const criticalErrors = validationErrors.filter(
      (e) => ['Marca', 'Modelo', 'Año', 'Precio'].includes(e.field)
    );

    if (criticalErrors.length > 0) {
      toast({
        title: 'Errores de validación',
        description: 'Corrige los errores antes de importar',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);

    const result: ImportResult = { total: parsedData.length, success: 0, errors: [], duplicates: [] };
    const defaultStatusId = await getDefaultStatusId();

    // Carga las patentes y chasis ya existentes de este cliente para detectar
    // duplicados. Los vehículos Vendidos no cuentan: un auto que se vendió y
    // volvió a entrar (recompra) debe poder importarse como unidad nueva,
    // misma regla que checkDuplicateVehicle en la creación manual.
    const existingPlates = new Set<string>();
    const existingChassis = new Set<string>();
    const { data: existingVehicles } = await supabase
      .from('vehicles')
      .select('license_plate, chassis_number, clients_vehicles_states ( name )')
      .eq('client_id', clientId);

    existingVehicles?.forEach((v) => {
      const statusName = (v as any).clients_vehicles_states?.name;
      if (isSoldStatusName(statusName)) return;
      if (v.license_plate) existingPlates.add(normalizeKey(v.license_plate));
      if (v.chassis_number) existingChassis.add(normalizeKey(v.chassis_number));
    });

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      const vehicleLabel = `${row.Marca} ${row.Modelo} ${row.Año}`;

      try {
        // Detección de duplicados por patente o N° de chasis (contra la base y dentro del mismo archivo)
        const plateKey = normalizeKey(row.Patente);
        const chassisKey = normalizeKey(row['N° Chasis']);

        if (plateKey && existingPlates.has(plateKey)) {
          result.duplicates.push({
            row: i + 2,
            vehicle: vehicleLabel,
            reason: `Patente ${String(row.Patente).trim()} ya existe`,
          });
          setProgress(Math.round(((i + 1) / parsedData.length) * 100));
          continue;
        }
        if (chassisKey && existingChassis.has(chassisKey)) {
          result.duplicates.push({
            row: i + 2,
            vehicle: vehicleLabel,
            reason: `N° de chasis ${String(row['N° Chasis']).trim()} ya existe`,
          });
          setProgress(Math.round(((i + 1) / parsedData.length) * 100));
          continue;
        }
        // Find or create brand
        const brandId = await findOrCreateBrand(String(row.Marca));
        if (!brandId) {
          result.errors.push({
            row: i + 2,
            error: 'No se pudo encontrar o crear la marca',
            vehicle: vehicleLabel,
          });
          continue;
        }

        // Find or create model
        const modelId = await findOrCreateModel(String(row.Modelo), brandId);
        if (!modelId) {
          result.errors.push({
            row: i + 2,
            error: 'No se pudo encontrar o crear el modelo',
            vehicle: vehicleLabel,
          });
          continue;
        }

        // Lookup optional reference IDs
        const colorId = row.Color ? await findReferenceId('colors', String(row.Color)) : null;
        const fuelTypeId = row.Combustible ? await findReferenceId('fuel_types', String(row.Combustible)) : null;
        const conditionId = row.Condición ? await findReferenceId('conditions', String(row.Condición)) : null;
        const categoryId = row.Categoría ? await findReferenceId('categories', String(row.Categoría)) : null;

        // Build vehicle payload
        const vehiclePayload: Record<string, unknown> = {
          client_id: clientId,
          brand_id: brandId,
          model_id: modelId,
          year: Number(row.Año),
          price: Number(row.Precio),
          status_id: defaultStatusId,
          show_in_stock: true,
        };

        if (row.Kilometraje !== undefined && row.Kilometraje !== null && String(row.Kilometraje).trim() !== '') {
          vehiclePayload.mileage = Number(row.Kilometraje);
        }
        if (row.Patente) vehiclePayload.license_plate = String(row.Patente).trim();
        if (colorId) vehiclePayload.color_id = colorId;
        if (fuelTypeId) vehiclePayload.fuel_type_id = fuelTypeId;
        if (conditionId) vehiclePayload.condition_id = conditionId;
        if (categoryId) vehiclePayload.category_id = categoryId;
        if (row.Descripción) vehiclePayload.description = String(row.Descripción).trim();
        if (row['N° Motor']) vehiclePayload.engine_number = String(row['N° Motor']).trim();
        if (row['N° Chasis']) vehiclePayload.chassis_number = String(row['N° Chasis']).trim();
        if (row.Transmisión) vehiclePayload.transmission = String(row.Transmisión).trim();
        if (row.Tracción) vehiclePayload.traction = String(row.Tracción).trim();
        if (row.Dueños !== undefined && row.Dueños !== null && String(row.Dueños).trim() !== '') {
          vehiclePayload.owners = Number(row.Dueños);
        }
        if (row.Llaves !== undefined && row.Llaves !== null && String(row.Llaves).trim() !== '') {
          vehiclePayload.keys = Number(row.Llaves);
        }

        const { error: insertError } = await supabase
          .from('vehicles')
          .insert(vehiclePayload);

        if (insertError) {
          result.errors.push({
            row: i + 2,
            error: insertError.message,
            vehicle: vehicleLabel,
          });
        } else {
          result.success++;
          // Registra la clave para que un duplicado dentro del mismo archivo también se salte
          if (plateKey) existingPlates.add(plateKey);
          if (chassisKey) existingChassis.add(chassisKey);
        }
      } catch (error) {
        result.errors.push({
          row: i + 2,
          error: error instanceof Error ? error.message : 'Error desconocido',
          vehicle: vehicleLabel,
        });
      }

      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setImportResult(result);
    setIsImporting(false);

    if (result.success > 0) {
      const dupNote =
        result.duplicates.length > 0
          ? ` (${result.duplicates.length} duplicados omitidos)`
          : '';
      toast({
        title: 'Importación completada',
        description: `${result.success} de ${result.total} vehículos importados correctamente${dupNote}`,
      });
    } else if (result.duplicates.length > 0 && result.errors.length === 0) {
      toast({
        title: 'Sin vehículos nuevos',
        description: `Los ${result.duplicates.length} vehículos del archivo ya existen en tu inventario`,
      });
    }

    if (result.errors.length > 0) {
      toast({
        title: 'Errores en importación',
        description: `${result.errors.length} vehículos no se pudieron importar`,
        variant: 'destructive',
      });
    }
  }, [clientId, parsedData, validationErrors]);

  const reset = useCallback(() => {
    setParsedData([]);
    setValidationErrors([]);
    setImportResult(null);
    setProgress(0);
    setIsImporting(false);
  }, []);

  return {
    parsedData,
    validationErrors,
    importResult,
    isImporting,
    progress,
    handleFileUpload,
    importVehicles,
    reset,
  };
};
