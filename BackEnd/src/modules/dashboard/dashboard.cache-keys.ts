export const DASHBOARD_CACHE_PREFIX = 'dashboard:';

export const getDashboardStatsKey = (cooperativeId: string) => 
  `${DASHBOARD_CACHE_PREFIX}stats:${cooperativeId}`;

export const getDashboardYieldChartKey = (cooperativeId: string, year: number) => 
  `${DASHBOARD_CACHE_PREFIX}yield-chart:${cooperativeId}:${year}`;

export const getDashboardCarbonChartKey = (cooperativeId: string, year: number) => 
  `${DASHBOARD_CACHE_PREFIX}carbon-chart:${cooperativeId}:${year}`;

export const getDashboardFarmZonesKey = (cooperativeId: string) => 
  `${DASHBOARD_CACHE_PREFIX}farm-zones:${cooperativeId}`;

export const getDashboardRecentActivitiesKey = (cooperativeId: string) => 
  `${DASHBOARD_CACHE_PREFIX}recent-activities:${cooperativeId}`;

export const getDashboardActionItemsKey = (cooperativeId: string) => 
  `${DASHBOARD_CACHE_PREFIX}action-items:${cooperativeId}`;
