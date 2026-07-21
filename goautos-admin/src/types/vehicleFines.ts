export interface FineRecord {
  plate: string;
  rut: string;
  name: string;
  fine: string;
  year: string;
  reason: string;
  location: string;
}

export interface VehicleFinesData {
  vehicle_id: number;
  license_plate: string;
  fines_count: number;
  has_fines: boolean;
  fines_data: FineRecord[];
  checked_at: string;
  source: string;
  error?: string;
}

export interface CheckFinesResponse {
  success: boolean;
  data?: {
    plate: string;
    fines_count: number;
    has_fines: boolean;
    tickets: FineRecord[];
    checked_at: string;
  };
  error?: string;
}
