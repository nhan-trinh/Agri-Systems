import { EmissionFactor, CropType, ActivityType } from '@prisma/client';
import { 
  CarbonCalculationDetails, 
  FertilizerEmissions, 
  PesticideEmissions, 
  HarvestingSequestration 
} from './carbon.types';
import { 
  GWP_N2O, 
  DEFAULT_PESTICIDE_FACTOR, 
  CO2_TO_TON_DIVISOR, 
  DEFAULT_FERTILIZER_FACTOR 
} from './carbon.constants';

export class CarbonCalculationService {
  /**
   * Performs the IPCC 2006 Tier 1 mathematical calculations on a completed season logs
   * to determine total carbon emitted vs sequestered.
   * 
   * @param season Season entity with farm_zone and farming_logs relations
   * @param factors Active emission factors loaded from the database
   */
  public calculateSeasonEmissions(season: any, factors: EmissionFactor[]) {
    const fertilizers: FertilizerEmissions[] = [];
    const pesticides: PesticideEmissions[] = [];
    const harvest: HarvestingSequestration[] = [];

    let totalEmittedKg = 0;
    let totalSequesteredKg = 0;

    const logs = season.farming_logs || [];

    for (const log of logs) {
      if (log.activity_type === ActivityType.FERTILIZING) {
        const type = log.fertilizer_type || 'Urea';
        
        // Find matching fertilizer factor in EmissionFactor config
        const factor = factors.find(
          (f) =>
            f.material_type === 'FERTILIZER' &&
            f.material_name.toLowerCase() === type.toLowerCase()
        );
        
        // Use default organic fertilizer factor if no match is found
        const factorValue = factor ? factor.factor_value : DEFAULT_FERTILIZER_FACTOR;
        const emissions = (log.quantity_kg || 0) * factorValue;

        fertilizers.push({
          log_id: log.id,
          activity_date: log.activity_date.toISOString(),
          fertilizer_type: type,
          quantity_kg: log.quantity_kg || 0,
          factor_value: factorValue,
          emissions_kgCO2e: parseFloat(emissions.toFixed(3)),
        });
        totalEmittedKg += emissions;
      } else if (log.activity_type === ActivityType.PESTICIDE) {
        const type = log.product_name || 'Thuốc BVTV (chung)';
        
        // Find matching pesticide factor in configuration
        const factor = factors.find(
          (f) =>
            f.material_type === 'PESTICIDE' &&
            f.material_name.toLowerCase() === type.toLowerCase()
        );
        
        // Fall back to default pesticide average (5.1)
        const factorValue = factor ? factor.factor_value : DEFAULT_PESTICIDE_FACTOR;
        const quantity = log.dosage || 0;
        const emissions = quantity * factorValue;

        pesticides.push({
          log_id: log.id,
          activity_date: log.activity_date.toISOString(),
          product_name: type,
          quantity_liters: quantity,
          factor_value: factorValue,
          emissions_kgCO2e: parseFloat(emissions.toFixed(3)),
        });
        totalEmittedKg += emissions;
      } else if (log.activity_type === ActivityType.HARVESTING) {
        const cropType = (season.farm_zone?.crop_type || CropType.RICE) as CropType;
        
        // Find carbon absorption factor for the crop type
        const factor = factors.find(
          (f) => f.material_type === 'HARVEST' && f.crop_type === cropType
        );
        
        // Default to rice absorption factor (0.189) if not configured
        const factorValue = factor ? factor.factor_value : 0.189;
        const yieldKg = log.yield_kg || 0;
        const sequestration = yieldKg * factorValue;

        harvest.push({
          log_id: log.id,
          activity_date: log.activity_date.toISOString(),
          yield_kg: yieldKg,
          crop_type: cropType,
          factor_value: factorValue,
          sequestration_kgCO2: parseFloat(sequestration.toFixed(3)),
        });
        totalSequesteredKg += sequestration;
      }
    }

    // Net carbon in tonnes: (emissions - sequestration) / 1000
    // Net < 0 means net sequestration (sequestration exceeds emissions)
    const netCarbonTCO2e = (totalEmittedKg - totalSequesteredKg) / CO2_TO_TON_DIVISOR;

    const calculationDetails: CarbonCalculationDetails = {
      factor_version: 'IPCC 2006 Tier 1 / MONRE 2020',
      fertilizers,
      pesticides,
      harvest,
    };

    return {
      totalEmittedKg: parseFloat(totalEmittedKg.toFixed(3)),
      totalSequesteredKg: parseFloat(totalSequesteredKg.toFixed(3)),
      netCarbonTCO2e: parseFloat(netCarbonTCO2e.toFixed(3)),
      calculationDetails,
    };
  }
}

export const carbonCalculationService = new CarbonCalculationService();
