export interface DashboardStats {
  total_farmers: number;
  total_farm_zones: number;
  active_seasons: number;
  completed_seasons_ytd: number;
  total_yield_kg_ytd: number;
  active_batches: number;
  total_qr_issued: number;
  carbon: {
    draft: number;
    verified: number;
    issued: number;
    total_credits_tCO2e: number;
  };
}

export interface YieldChartData {
  month: number;
  yield_kg: number;
}

export interface CarbonChartData {
  month: number;
  emitted_kg: number;
  sequestered_kg: number;
  net_tCO2e: number;
}

export interface MapZoneData {
  farm_zone_id: string;
  zone_name: string;
  boundary: any; // GeoJSON Polygon
  crop_type: string;
  active_season: boolean;
  farmer_name: string;
}

export interface RecentActivity {
  type: 'FARMING_LOG' | 'BATCH_ACTIVATED' | 'CARBON_ISSUED';
  message: string;
  time: string | Date;
}

export interface ActionItem {
  type: 'CARBON_DRAFT' | 'LOW_STOCK' | 'QR_RECEIVED';
  message: string;
  action_url: string;
}
