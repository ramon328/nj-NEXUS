// Tipos para la respuesta de getapi.cl

export interface GetApiVehicleResponse {
  success: boolean;
  status: number;
  data: VehicleData;
}

export interface VehicleData {
  id: string;
  licensePlate: string;
  dvLicensePlate: string;
  modelId: string;
  version: string;
  mileage: number | null;
  color: string;
  year: number;
  codeSii: string | null;
  vinNumber: string;
  engineNumber: string;
  engine: string;
  fuel: string;
  transmission: string;
  doors: number | null;
  model: VehicleModel;
  monthRT: string;
}

export interface VehicleModel {
  id: string;
  name: string;
  urlImage: string | null;
  typeVehicle: VehicleType;
  brand: VehicleBrand;
}

export interface VehicleType {
  name: string;
}

export interface VehicleBrand {
  name: string;
}

// Tipos para la respuesta de tasación
export interface GetApiAppraisalResponse {
  success: boolean;
  status: number;
  data: AppraisalData;
}

export interface AppraisalData {
  vehicleId: string;
  informacionFiscal: {
    codigo: string;
    permiso: string;
    tasacion: number;
    ano_info_fiscal: number;
  };
  precioUsado: {
    precio: number;
    banda_max: number;
    banda_min: number;
  };
  precioRetoma: number;
  vehicle: {
    id: string;
    licensePlate: string;
    dvLicensePlate: string;
    modelId: string;
    version: string;
    color: string;
    year: number;
    engine: string;
    fuel: string;
    transmission: string;
    doors: number | null;
    model: {
      id: string;
      name: string;
      urlImage: string | null;
      typeVehicle: {
        name: string;
      };
      brand: {
        name: string;
      };
    };
  };
}

// Respuesta combinada de la Edge Function
export interface CombinedVehicleApiResponse {
  vehicleInfo?: {
    success: boolean;
    data?: GetApiVehicleResponse;
    error?: string;
  };
  appraisal?: {
    success: boolean;
    data?: GetApiAppraisalResponse;
    error?: string;
  };
}

// Tipos para mapeo a nuestro formulario
export interface MappedVehicleData {
  license_plate: string;
  brand_id?: string;
  model_id?: string;
  year?: number;
  mileage?: number;
  transmission?: string;
  fuel_type_id?: string;
  color_id?: string;
  condition_id?: string;
  category_id?: string;
  owners?: number;
  engine_number?: string;
  chassis_number?: string;
  // Precios del appraisal
  price?: number;
  price_min?: number;
  price_max?: number;
  trade_in_price?: number;

  // Raw text fields from API (for display and manual selection)
  brand_name?: string;
  model_name?: string;
  version?: string;
  color_name?: string;
  fuel_name?: string;
  category_name?: string;
  doors?: number;
  engine?: string;
  vin_number?: string;
}
