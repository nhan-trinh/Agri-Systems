import prisma from '../../prisma/client';
import { 
  EmissionFactor, 
  CarbonRecord, 
  CarbonStatus, 
  Prisma, 
  ActivityType,
  ExportJob,
  ExportStatus,
  ExportFormat
} from '@prisma/client';

export class CarbonRepository {
  // ==================== EMISSION FACTORS ====================

  public async findAllEmissionFactors(): Promise<EmissionFactor[]> {
    return prisma.emissionFactor.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  public async findEmissionFactorById(id: string): Promise<EmissionFactor | null> {
    return prisma.emissionFactor.findUnique({
      where: { id },
    });
  }

  public async createEmissionFactor(data: Prisma.EmissionFactorCreateInput): Promise<EmissionFactor> {
    return prisma.emissionFactor.create({
      data,
    });
  }

  public async updateEmissionFactor(id: string, data: Prisma.EmissionFactorUpdateInput): Promise<EmissionFactor> {
    return prisma.emissionFactor.update({
      where: { id },
      data,
    });
  }

  public async deleteEmissionFactor(id: string): Promise<EmissionFactor> {
    return prisma.emissionFactor.delete({
      where: { id },
    });
  }

  // ==================== SEASONS ====================

  public async getSeasonForCalculation(seasonId: string) {
    return prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        farm_zone: {
          include: {
            farmer: true,
          },
        },
        farming_logs: {
          where: {
            activity_type: {
              in: [ActivityType.FERTILIZING, ActivityType.PESTICIDE, ActivityType.HARVESTING],
            },
          },
          orderBy: {
            activity_date: 'asc',
          },
        },
      },
    });
  }

  // ==================== CARBON RECORDS ====================

  public async findCarbonRecordById(id: string): Promise<any | null> {
    return prisma.carbonRecord.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            farm_zone: {
              include: {
                farmer: {
                  include: {
                    cooperative: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  public async findCarbonRecordBySeasonId(seasonId: string): Promise<CarbonRecord | null> {
    return prisma.carbonRecord.findUnique({
      where: { season_id: seasonId },
    });
  }

  public async createCarbonRecord(data: Prisma.CarbonRecordUncheckedCreateInput): Promise<CarbonRecord> {
    return prisma.carbonRecord.create({
      data,
    });
  }

  public async updateCarbonRecordStatus(
    id: string, 
    status: CarbonStatus, 
    extraData?: Partial<Omit<CarbonRecord, 'id' | 'status' | 'created_at' | 'season_id' | 'total_emitted_kg' | 'total_sequestered_kg' | 'net_carbon_tCO2e' | 'calculation_details'>>
  ): Promise<CarbonRecord> {
    return prisma.carbonRecord.update({
      where: { id },
      data: {
        status,
        ...extraData,
      },
    });
  }

  public async updateCarbonRecordCertificate(
    id: string,
    certificateUrl: string,
    expiresAt: Date
  ): Promise<CarbonRecord> {
    return prisma.carbonRecord.update({
      where: { id },
      data: {
        certificate_url: certificateUrl,
        certificate_expires_at: expiresAt,
      },
    });
  }

  public async findAllCarbonRecords(
    filters: { 
      cooperativeId?: string; 
      status?: CarbonStatus;
    },
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: any[]; total: number }> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.cooperativeId) {
      where.season = {
        farm_zone: {
          farmer: {
            cooperative_id: filters.cooperativeId,
          },
        },
      };
    }

    const [data, total] = await prisma.$transaction([
      prisma.carbonRecord.findMany({
        where,
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
        orderBy: {
          created_at: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.carbonRecord.count({ where }),
    ]);

    return { data, total };
  }

  // ==================== EXPORT JOBS ====================

  public async createExportJob(data: {
    report_type: string;
    format: ExportFormat;
    filters: Prisma.InputJsonValue;
    status: ExportStatus;
    created_by: string;
  }): Promise<ExportJob> {
    return prisma.exportJob.create({
      data,
    });
  }

  public async findExportJobById(id: string): Promise<ExportJob | null> {
    return prisma.exportJob.findUnique({
      where: { id },
    });
  }

  public async updateExportJobStatus(
    id: string,
    status: ExportStatus,
    downloadUrl?: string
  ): Promise<ExportJob> {
    return prisma.exportJob.update({
      where: { id },
      data: {
        status,
        download_url: downloadUrl || null,
      },
    });
  }
}

export const carbonRepository = new CarbonRepository();
export default carbonRepository;
