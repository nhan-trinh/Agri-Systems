import prisma from '../../prisma/client';
import { UserRole, CarbonStatus, BatchStatus, CropType } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { 
  DashboardStats, 
  YieldChartData, 
  CarbonChartData, 
  MapZoneData, 
  RecentActivity, 
  ActionItem 
} from './dashboard.types';
import { 
  getDashboardStatsKey, 
  getDashboardYieldChartKey, 
  getDashboardCarbonChartKey, 
  getDashboardFarmZonesKey, 
  getDashboardRecentActivitiesKey, 
  getDashboardActionItemsKey 
} from './dashboard.cache-keys';
import { dashboardCache } from './dashboard.cache';

export class DashboardService {
  /**
   * Helper to construct Prisma filter queries based on role and target cooperative.
   */
  private getCooperativeId(user: JwtPayload, targetCooperativeId?: string): string {
    if (user.role === UserRole.HTX_MANAGER) {
      return user.cooperativeId || '';
    }
    return targetCooperativeId || 'all';
  }

  public async getStats(user: JwtPayload, targetCooperativeId?: string): Promise<DashboardStats> {
    const coopId = this.getCooperativeId(user, targetCooperativeId);
    const cacheKey = getDashboardStatsKey(coopId);
    
    // Cache-Aside: check Redis first
    const cached = await dashboardCache.getCachedDashboardData(cacheKey);
    if (cached) return cached;

    // Filter structures
    const isFiltered = coopId !== 'all';
    const farmerWhere = isFiltered ? { cooperative_id: coopId } : {};
    const farmZoneWhere = isFiltered ? { farmer: { cooperative_id: coopId } } : {};
    const seasonWhere = isFiltered ? { farm_zone: { farmer: { cooperative_id: coopId } } } : {};
    const batchWhere = isFiltered ? { season: { farm_zone: { farmer: { cooperative_id: coopId } } } } : {};
    const carbonWhere = isFiltered ? { season: { farm_zone: { farmer: { cooperative_id: coopId } } } } : {};

    const currentYearStart = new Date(new Date().getFullYear(), 0, 1);

    // Parallel Queries Execution
    const [
      totalFarmers,
      totalFarmZones,
      activeSeasons,
      completedSeasonsYtd,
      totalYieldYtd,
      activeBatches,
      totalQrIssued,
      carbonDraft,
      carbonVerified,
      carbonIssued,
      totalCredits,
    ] = await Promise.all([
      prisma.farmer.count({ where: { ...farmerWhere, deleted_at: null } }),
      prisma.farmZone.count({ where: { ...farmZoneWhere, deleted_at: null } }),
      prisma.season.count({ where: { ...seasonWhere, status: 'ACTIVE' } }),
      prisma.season.count({
        where: {
          ...seasonWhere,
          status: 'COMPLETED',
          actual_end_date: { gte: currentYearStart },
        },
      }),
      prisma.season.aggregate({
        where: {
          ...seasonWhere,
          status: 'COMPLETED',
          actual_end_date: { gte: currentYearStart },
        },
        _sum: { actual_yield_kg: true },
      }),
      prisma.batch.count({ where: { ...batchWhere, status: BatchStatus.ACTIVE } }),
      prisma.batch.aggregate({
        where: batchWhere,
        _sum: { quantity_qr_requested: true },
      }),
      prisma.carbonRecord.count({ where: { ...carbonWhere, status: CarbonStatus.DRAFT } }),
      prisma.carbonRecord.count({ where: { ...carbonWhere, status: CarbonStatus.VERIFIED } }),
      prisma.carbonRecord.count({ where: { ...carbonWhere, status: CarbonStatus.ISSUED } }),
      prisma.carbonRecord.aggregate({
        where: { ...carbonWhere, status: CarbonStatus.ISSUED, net_carbon_tCO2e: { lt: 0 } },
        _sum: { credit_amount_tCO2e: true },
      }),
    ]);

    const stats: DashboardStats = {
      total_farmers: totalFarmers,
      total_farm_zones: totalFarmZones,
      active_seasons: activeSeasons,
      completed_seasons_ytd: completedSeasonsYtd,
      total_yield_kg_ytd: totalYieldYtd._sum.actual_yield_kg || 0,
      active_batches: activeBatches,
      total_qr_issued: totalQrIssued._sum.quantity_qr_requested || 0,
      carbon: {
        draft: carbonDraft,
        verified: carbonVerified,
        issued: carbonIssued,
        total_credits_tCO2e: totalCredits._sum.credit_amount_tCO2e || 0,
      },
    };

    // Save to Cache
    await dashboardCache.setCachedDashboardData(cacheKey, stats);
    return stats;
  }

  public async getYieldChart(user: JwtPayload, year: number, targetCooperativeId?: string): Promise<YieldChartData[]> {
    const coopId = this.getCooperativeId(user, targetCooperativeId);
    const cacheKey = getDashboardYieldChartKey(coopId, year);

    const cached = await dashboardCache.getCachedDashboardData(cacheKey);
    if (cached) return cached;

    const isFiltered = coopId !== 'all';
    const seasonWhere = isFiltered ? { farm_zone: { farmer: { cooperative_id: coopId } } } : {};

    const seasons = await prisma.season.findMany({
      where: {
        ...seasonWhere,
        status: 'COMPLETED',
        actual_end_date: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
      select: {
        actual_end_date: true,
        actual_yield_kg: true,
      },
    });

    const monthlyData: YieldChartData[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      yield_kg: 0,
    }));

    for (const s of seasons) {
      if (s.actual_end_date) {
        const monthIndex = s.actual_end_date.getMonth(); // 0 to 11
        monthlyData[monthIndex].yield_kg += s.actual_yield_kg || 0;
      }
    }

    await dashboardCache.setCachedDashboardData(cacheKey, monthlyData);
    return monthlyData;
  }

  public async getCarbonChart(user: JwtPayload, year: number, targetCooperativeId?: string): Promise<CarbonChartData[]> {
    const coopId = this.getCooperativeId(user, targetCooperativeId);
    const cacheKey = getDashboardCarbonChartKey(coopId, year);

    const cached = await dashboardCache.getCachedDashboardData(cacheKey);
    if (cached) return cached;

    const isFiltered = coopId !== 'all';
    const carbonWhere = isFiltered ? { season: { farm_zone: { farmer: { cooperative_id: coopId } } } } : {};

    const records = await prisma.carbonRecord.findMany({
      where: {
        ...carbonWhere,
        created_at: {
          gte: new Date(year, 0, 1),
          lte: new Date(year, 11, 31, 23, 59, 59),
        },
      },
      select: {
        created_at: true,
        total_emitted_kg: true,
        total_sequestered_kg: true,
        net_carbon_tCO2e: true,
      },
    });

    const monthlyData: CarbonChartData[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      emitted_kg: 0,
      sequestered_kg: 0,
      net_tCO2e: 0,
    }));

    for (const r of records) {
      const monthIndex = r.created_at.getMonth();
      monthlyData[monthIndex].emitted_kg += r.total_emitted_kg || 0;
      monthlyData[monthIndex].sequestered_kg += r.total_sequestered_kg || 0;
      monthlyData[monthIndex].net_tCO2e += r.net_carbon_tCO2e || 0;
    }

    await dashboardCache.setCachedDashboardData(cacheKey, monthlyData);
    return monthlyData;
  }

  public async getFarmZones(user: JwtPayload, targetCooperativeId?: string): Promise<MapZoneData[]> {
    const coopId = this.getCooperativeId(user, targetCooperativeId);
    const cacheKey = getDashboardFarmZonesKey(coopId);

    const cached = await dashboardCache.getCachedDashboardData(cacheKey);
    if (cached) return cached;

    const isFiltered = coopId !== 'all';
    const farmZoneWhere = isFiltered ? { farmer: { cooperative_id: coopId } } : {};

    const farmZones = await prisma.farmZone.findMany({
      where: {
        ...farmZoneWhere,
        deleted_at: null,
      },
      include: {
        farmer: true,
        seasons: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    const isGov = user.role === UserRole.GOV_VIEWER;

    const mapData: MapZoneData[] = farmZones.map((fz) => ({
      farm_zone_id: fz.id,
      zone_name: fz.zone_name,
      boundary: fz.boundary,
      crop_type: fz.crop_type,
      active_season: fz.seasons.length > 0,
      farmer_name: isGov ? 'Nông dân HTX' : fz.farmer.full_name,
    }));

    await dashboardCache.setCachedDashboardData(cacheKey, mapData);
    return mapData;
  }

  public async getRecentActivities(user: JwtPayload, targetCooperativeId?: string): Promise<RecentActivity[]> {
    const coopId = this.getCooperativeId(user, targetCooperativeId);
    const cacheKey = getDashboardRecentActivitiesKey(coopId);

    const cached = await dashboardCache.getCachedDashboardData(cacheKey);
    if (cached) return cached;

    const isFiltered = coopId !== 'all';
    const seasonWhere = isFiltered ? { farm_zone: { farmer: { cooperative_id: coopId } } } : undefined;
    const batchWhere = isFiltered ? { season: { farm_zone: { farmer: { cooperative_id: coopId } } } } : {};
    const carbonWhere = isFiltered ? { season: { farm_zone: { farmer: { cooperative_id: coopId } } } } : {};

    const [logs, batches, carbon] = await Promise.all([
      prisma.farmingLog.findMany({
        where: seasonWhere ? { season: seasonWhere } : {},
        include: {
          season: {
            include: {
              farm_zone: {
                include: {
                  farmer: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      prisma.batch.findMany({
        where: batchWhere,
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
      prisma.carbonRecord.findMany({
        where: carbonWhere,
        include: {
          season: {
            include: {
              farm_zone: {
                include: {
                  farmer: true,
                },
              },
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      }),
    ]);

    const isGov = user.role === UserRole.GOV_VIEWER;
    const activities: RecentActivity[] = [];

    for (const log of logs) {
      const farmerName = isGov ? 'Nông dân' : log.season.farm_zone.farmer.full_name;
      let detail = '';
      if (log.activity_type === 'FERTILIZING') {
        detail = `bón phân ${log.fertilizer_type || ''}`;
      } else if (log.activity_type === 'PESTICIDE') {
        detail = `phun thuốc ${log.product_name || ''}`;
      } else if (log.activity_type === 'HARVESTING') {
        detail = `thu hoạch ${log.yield_kg || 0} kg`;
      } else {
        detail = `ghi nhật ký ${log.activity_type.toLowerCase()}`;
      }

      activities.push({
        type: 'FARMING_LOG',
        message: `${farmerName} đã thực hiện hoạt động ${detail}`,
        time: log.created_at,
      });
    }

    for (const b of batches) {
      if (b.status === BatchStatus.ACTIVE) {
        activities.push({
          type: 'BATCH_ACTIVATED',
          message: `Lô hàng ${b.batch_code} đã được kích hoạt`,
          time: b.activated_at || b.updated_at,
        });
      }
    }

    for (const c of carbon) {
      if (c.status === CarbonStatus.ISSUED) {
        activities.push({
          type: 'CARBON_ISSUED',
          message: `Tín chỉ Carbon ${c.certificate_no} đã được phát hành (${c.credit_amount_tCO2e} tCO2e)`,
          time: c.issued_at || c.created_at,
        });
      }
    }

    const sortedActivities = activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    await dashboardCache.setCachedDashboardData(cacheKey, sortedActivities);
    return sortedActivities;
  }

  public async getActionItems(user: JwtPayload, targetCooperativeId?: string): Promise<ActionItem[]> {
    const coopId = this.getCooperativeId(user, targetCooperativeId);
    const cacheKey = getDashboardActionItemsKey(coopId);

    const cached = await dashboardCache.getCachedDashboardData(cacheKey);
    if (cached) return cached;

    const isFiltered = coopId !== 'all';
    const batchWhere = isFiltered ? { season: { farm_zone: { farmer: { cooperative_id: coopId } } } } : {};
    const carbonWhere = isFiltered ? { season: { farm_zone: { farmer: { cooperative_id: coopId } } } } : {};
    const materialWhere = isFiltered ? { cooperative_id: coopId } : {};

    const [draftCarbonCount, qrReceivedCount, stockItems] = await Promise.all([
      prisma.carbonRecord.count({
        where: {
          ...carbonWhere,
          status: CarbonStatus.DRAFT,
        },
      }),
      prisma.batch.count({
        where: {
          ...batchWhere,
          status: BatchStatus.QR_RECEIVED,
        },
      }),
      prisma.stockItem.findMany({
        where: isFiltered ? {
          material: materialWhere,
        } : {},
        include: {
          material: true,
        },
      }),
    ]);

    const actions: ActionItem[] = [];

    // 1. DRAFT Carbon alert (requires verify by SUPER_ADMIN)
    if (draftCarbonCount > 0) {
      actions.push({
        type: 'CARBON_DRAFT',
        message: `${draftCarbonCount} bản ghi Carbon đang ở trạng thái DRAFT chờ duyệt`,
        action_url: '/carbon/records?status=DRAFT',
      });
    }

    // 2. Low Stock Alerts
    const lowStockCount = stockItems.filter(
      (item) => item.current_stock < item.material.min_stock_alert
    ).length;

    if (lowStockCount > 0) {
      actions.push({
        type: 'LOW_STOCK',
        message: `${lowStockCount} vật tư trong kho sắp hết hàng (dưới mức cảnh báo)`,
        action_url: '/warehouse/inventory',
      });
    }

    // 3. QR received batches waiting activation
    if (qrReceivedCount > 0) {
      actions.push({
        type: 'QR_RECEIVED',
        message: `${qrReceivedCount} lô hàng đã nhận dải mã QR, chờ kích hoạt`,
        action_url: '/qr/batches?status=QR_RECEIVED',
      });
    }

    await dashboardCache.setCachedDashboardData(cacheKey, actions);
    return actions;
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
