import { CropType } from '@prisma/client';

export interface FertilizerEmissions {
  log_id: string;
  activity_date: string;
  fertilizer_type: string;
  quantity_kg: number;
  factor_value: number;
  emissions_kgCO2e: number;
}

export interface PesticideEmissions {
  log_id: string;
  activity_date: string;
  product_name: string;
  quantity_liters: number;
  factor_value: number;
  emissions_kgCO2e: number;
}

export interface HarvestingSequestration {
  log_id: string;
  activity_date: string;
  yield_kg: number;
  crop_type: CropType;
  factor_value: number;
  sequestration_kgCO2: number;
}

export interface CarbonCalculationDetails {
  factor_version: string;
  fertilizers: FertilizerEmissions[];
  pesticides: PesticideEmissions[];
  harvest: HarvestingSequestration[];
}
