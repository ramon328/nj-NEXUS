import { useState } from 'react';
import { read, utils } from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useBulkCustomerImport } from '@/hooks/useBulkCustomerImport';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/utils/posthog';

interface PreviewData {
  codigo: string;
  rut_comprador: string;
  nombre_comprador: string;
  email_comprador: string;
  rut_vendedor: string;
  nombre_vendedor: string;
  email_vendedor: string;
  marca: string;
  modelo: string;
  precio: string;
  ano: string;
  categoria?: string;
}

interface CategorizedVehicle {
  brand: string;
  model: string;
  year?: number;
  category: string;
}

export const useExcelUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [categorizedData, setCategorizedData] = useState<any[]>([]);
  const [categorizedCount, setCategorizedCount] = useState(0);
  const { toast } = useToast();
  const { clientId, userId } = useAuth();
  const {
    importCustomers,
    loading: importLoading,
    currentStep: importStep,
  } = useBulkCustomerImport();

  const categorizeVehicles = async (vehicles: any[]) => {
    if (!clientId) {
      throw new Error('Cliente no identificado');
    }

    const uniqueVehicles = vehicles.reduce((acc: any[], row: any) => {
      const vehicleKey = `${row.marca}-${row.modelo}-${row.ano}`;
      const existingVehicle = acc.find(
        (v) => `${v.brand}-${v.model}-${v.year}` === vehicleKey
      );

      if (!existingVehicle) {
        acc.push({
          brand: row.marca || '',
          model: row.modelo || '',
          year: row.ano ? parseInt(row.ano) : undefined,
        });
      }
      return acc;
    }, []);

    const totalUnique = uniqueVehicles.length;
    setCurrentStep(
      `🤖 Iniciando categorización de ${totalUnique} vehículos únicos...`
    );

    console.log(`Categorizando ${totalUnique} vehículos únicos...`);

    const { data: categorizationResult, error } =
      await supabase.functions.invoke('categorize-vehicles', {
        body: {
          vehicles: uniqueVehicles,
          client_id: clientId,
        },
      });

    if (error) {
      console.error('Error in vehicle categorization:', error);
      throw new Error('Error categorizando vehículos con IA');
    }

    const categorizedVehicles: CategorizedVehicle[] =
      categorizationResult.categorized_vehicles || [];

    setCurrentStep(
      `✅ ${categorizedVehicles.length} de ${totalUnique} vehículos categorizados exitosamente`
    );

    const categoryMap = new Map<string, { category: string }>();
    categorizedVehicles.forEach((cv) => {
      const key = `${cv.brand}-${cv.model}-${cv.year || ''}`;
      categoryMap.set(key, {
        category: cv.category,
      });
    });

    return categoryMap;
  };

  const validateExcelData = (
    data: any[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const requiredFields = [
      { field: 'Código', key: 'codigo' },
      { field: 'Marca', key: 'marca' },
      { field: 'Modelo', key: 'modelo' },
      { field: 'Precio', key: 'precio' },
      { field: 'Año', key: 'ano' },
    ];

    // Validar que existan las columnas requeridas en el archivo
    const firstRow = data[0] || {};
    const missingColumns = requiredFields.filter(
      ({ field }) => !(field in firstRow)
    );

    if (missingColumns.length > 0) {
      errors.push(
        `Columnas faltantes: ${missingColumns.map((c) => c.field).join(', ')}`
      );
    }

    // Validar que los campos obligatorios no estén vacíos
    const mappedData = data.map((row) => ({
      codigo: row['Código']?.toString() || '',
      rut_comprador: row['Rut comprador']?.toString() || '',
      nombre_comprador: row['Nombre completo comprador']?.toString() || '',
      email_comprador: row['Correo del comprador firmante']?.toString() || '',
      marca: row['Marca']?.toString() || '',
      modelo: row['Modelo']?.toString() || '',
      precio: row['Precio']?.toString() || '',
      ano: row['Año']?.toString() || '',
      rut_vendedor: row['Rut vendedor']?.toString() || '',
      nombre_vendedor: row['Nombre completo vendedor']?.toString() || '',
      email_vendedor: row['Correo del vendedor firmante']?.toString() || '',
    }));

    mappedData.forEach((row, index) => {
      const rowNumber = index + 2; // +2 porque Excel empieza en 1 y tiene header

      requiredFields.forEach(({ field, key }) => {
        if (
          !row[key as keyof typeof row] ||
          row[key as keyof typeof row].toString().trim() === ''
        ) {
          errors.push(`Fila ${rowNumber}: ${field} es obligatorio`);
        }
      });

      // Validaciones específicas
      if (row.precio) {
        const precio = parseFloat(row.precio.replace(/[^\d.-]/g, ''));
        if (isNaN(precio) || precio < 0) {
          errors.push(
            `Fila ${rowNumber}: Precio debe ser un número válido (puede ser 0)`
          );
        }
      }

      if (row.ano) {
        const year = parseInt(row.ano);
        if (isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1) {
          errors.push(
            `Fila ${rowNumber}: Año debe ser válido (1900-${
              new Date().getFullYear() + 1
            })`
          );
        }
      }

      // Validar formato de email si se proporciona (opcional)
      if (row.email_comprador && row.email_comprador.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email_comprador)) {
          errors.push(
            `Fila ${rowNumber}: Email del comprador no tiene formato válido`
          );
        }
      }

      if (row.email_vendedor && row.email_vendedor.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email_vendedor)) {
          errors.push(
            `Fila ${rowNumber}: Email del vendedor no tiene formato válido`
          );
        }
      }
    });

    // Limitar a los primeros 10 errores para no saturar
    if (errors.length > 10) {
      errors.splice(10);
      errors.push(`... y ${errors.length - 10} errores más`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    try {
      setLoading(true);
      setCurrentStep('📄 Leyendo archivo Excel...');
      setFile(selectedFile);

      const data = await selectedFile.arrayBuffer();
      const workbook = read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = utils.sheet_to_json<any>(worksheet);

      if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error('El archivo no contiene datos válidos');
      }

      setCurrentStep('🔍 Validando campos del Excel...');

      // Validar campos antes de continuar
      const validation = validateExcelData(jsonData);

      if (!validation.isValid) {
        const errorMessage = validation.errors.join('\n');
        toast({
          title: 'Errores en el archivo Excel',
          description:
            'Por favor corrige los errores y vuelve a cargar el archivo.',
          variant: 'destructive',
        });

        // Mostrar errores detallados en consola para debugging
        console.error('Errores de validación Excel:', validation.errors);

        throw new Error(`Errores de validación:\n${errorMessage}`);
      }

      setTotalRecords(jsonData.length);

      const initialData = jsonData.map((row) => ({
        codigo: row['Código']?.toString() || '',
        rut_comprador: row['Rut comprador']?.toString() || '',
        nombre_comprador: row['Nombre completo comprador']?.toString() || '',
        email_comprador: row['Correo del comprador firmante']?.toString() || '',
        marca: row['Marca']?.toString() || '',
        modelo: row['Modelo']?.toString() || '',
        precio: row['Precio']?.toString() || '',
        ano: row['Año']?.toString() || '',
        rut_vendedor: row['Rut vendedor']?.toString() || '',
        nombre_vendedor: row['Nombre completo vendedor']?.toString() || '',
        email_vendedor: row['Correo del vendedor firmante']?.toString() || '',
      }));

      let categoryMap: Map<string, { category: string }>;
      try {
        categoryMap = await categorizeVehicles(initialData);
        setCurrentStep('🔄 Aplicando categorías a todos los registros...');

        // Pequeña pausa para mostrar el progreso
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (categorizationError) {
        console.error('Categorization failed:', categorizationError);
        toast({
          title: 'Advertencia',
          description:
            'No se pudieron categorizar los vehículos automáticamente. Continuando sin categorías.',
          variant: 'destructive',
        });
        categoryMap = new Map();
      }

      const dataWithCategories = initialData.map((row) => {
        const vehicleKey = `${row.marca}-${row.modelo}-${row.ano}`;
        const categoryInfo = categoryMap.get(vehicleKey);

        return {
          ...row,
          categoria: categoryInfo?.category || 'Sin categorizar',
        };
      });

      // Calcular el conteo real de vehículos categorizados
      const realCategorizedCount = dataWithCategories.filter(
        (item) => item.categoria && item.categoria !== 'Sin categorizar'
      ).length;

      setCategorizedData(dataWithCategories);
      setCategorizedCount(realCategorizedCount); // Guardar el conteo real
      setPreviewData(dataWithCategories.slice(0, 10));

      toast({
        title: '¡Archivo procesado exitosamente!',
        description: `${jsonData.length} registros validados y listos para importar. ${realCategorizedCount} vehículos categorizados automáticamente por IA.`,
      });
    } catch (error) {
      console.error('Error reading Excel file:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'No se pudo leer el archivo Excel. Por favor, verifica el formato.',
        variant: 'destructive',
      });
      setFile(null);
      setPreviewData([]);
      setTotalRecords(0);
      setCategorizedData([]);
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleUpload = async () => {
    if (!file || categorizedData.length === 0) return;

    try {
      setLoading(true);

      await importCustomers(categorizedData);

      posthog.capture({
        distinctId: userId || 'anonymous',
        event: 'customer_bulk_uploaded',
        properties: { count: categorizedData.length },
      });

      setFile(null);
      setPreviewData([]);
      setTotalRecords(0);
      setCategorizedData([]);
    } catch (error: any) {
      console.error('Error processing file:', error);

      // Determinar mensaje de error específico
      let errorMessage = 'No se pudo procesar el archivo.';

      if (error?.message) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = 'Algunos registros ya existen en la base de datos.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Error de conexión. Verifica tu internet e inténtalo de nuevo.';
        } else if (error.message.includes('JWT') || error.message.includes('token')) {
          errorMessage = 'Tu sesión ha expirado. Por favor, recarga la página.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'No tienes permisos para importar clientes.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }

      toast({
        title: 'Error al importar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setPreviewData([]);
    setTotalRecords(0);
    setCategorizedData([]);
    setCategorizedCount(0);
    setCurrentStep('');
  };

  return {
    file,
    previewData,
    totalRecords,
    categorizedCount,
    loading: loading || importLoading,
    currentStep: currentStep || importStep,
    handleFileChange,
    handleUpload,
    resetFile,
  };
};
