/**
 * Types for Inventory Analytics System
 * Includes sales velocity, volume, profitability metrics by brand/model
 */

// Metrics for a brand or model
export interface BrandModelMetrics {
  brandId: string;
  brandName: string;
  modelId?: number;
  modelName?: string;

  // Volume metrics
  totalSold: number;
  percentageOfTotal: number;

  // Velocity metrics (in days)
  avgDaysFromCreation: number;
  avgDaysFromPublication: number | null; // null if no publication data
  minDaysToSale: number;
  maxDaysToSale: number;

  // Profitability metrics
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number; // percentage
  avgProfitPerUnit: number;
}

// Vehicle with publication days tracking
export interface VehicleWithPublicationDays {
  id: number;
  created_at: string;
  main_image: string | null;
  year: number | null;
  is_consigned: boolean;
  price: number;
  brands: { name: string } | null;
  models: { name: string } | null;
  daysInSystem: number;
  daysPublished: number | null; // null if never published
  firstPublishedAt: string | null;
}

// Stock recommendation
export interface StockRecommendation {
  brandId: string;
  brandName: string;
  modelId?: number;
  modelName?: string;
  overallScore: number; // 0-100
  velocityScore: number;
  profitabilityScore: number;
  volumeScore: number;
  avgDaysToSale: number;
  avgMargin: number;
  volumeSold: number;
  reasons: string[];
}

// Complete sales analytics
export interface SalesAnalytics {
  byBrand: BrandModelMetrics[];
  byModel: BrandModelMetrics[];
  overall: {
    totalSold: number;
    avgDaysFromCreation: number;
    avgDaysFromPublication: number | null;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgMargin: number;
  };
  recommendations: {
    fastestSelling: StockRecommendation[];
    mostProfitable: StockRecommendation[];
    bestOverall: StockRecommendation[];
  };
}

// Publication days data
export interface PublicationDaysData {
  vehicles: VehicleWithPublicationDays[];
  oldestByCreation: VehicleWithPublicationDays[];
  oldestByPublication: VehicleWithPublicationDays[];
  criticalByPublication: VehicleWithPublicationDays[]; // >90 days published
  stats: {
    avgDaysInSystem: number;
    avgDaysPublished: number;
    maxDaysPublished: number;
    vehiclesNeverPublished: number;
    totalActiveVehicles: number;
  };
}

// Sold vehicle with all data needed for analytics
export interface SoldVehicleData {
  saleId: number;
  vehicleId: number;
  saleDate: string;
  salePrice: number;
  commissionAmount: number;
  createdAt: string;
  firstPublishedAt: string | null;
  brandId: string;
  brandName: string;
  modelId: number | null;
  modelName: string | null;
  isConsigned: boolean;
  acquisitionPrice: number;
  daysFromCreation: number;
  daysFromPublication: number | null;
  profit: number;
  margin: number;
}
