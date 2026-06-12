import crypto from 'crypto';
import { CarbonStatus, UserRole, ExportStatus, ExportFormat, EmissionFactor } from '@prisma/client';
import { carbonRepository } from './carbon.repository';
import { carbonCalculationService } from './carbon.calculation.service';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from '../auth/auth.types';
import { carbonCertificateQueue } from '../../shared/queues/carbon.queue';
import { dashboardCache } from '../dashboard/dashboard.cache';
import { CERTIFICATE_PREFIX } from './carbon.constants';

export class CarbonRecordService {
  // ==================== EMISSION FACTORS ====================

  public async getAllEmissionFactors(): Promise<EmissionFactor[]> {
    return carbonRepository.findAllEmissionFactors();
  }

  public async getEmissionFactorById(id: string): Promise<EmissionFactor> {
    const factor = await carbonRepository.findEmissionFactorById(id);
    if (!factor) {
      throw new AppError('EMISSION_FACTOR_NOT_FOUND', 404, 'Không tìm thấy hệ số phát thải');
    }
    return factor;
  }

  public async createEmissionFactor(data: any): Promise<EmissionFactor> {
    return carbonRepository.createEmissionFactor(data);
  }

  public async updateEmissionFactor(id: string, data: any): Promise<EmissionFactor> {
    await this.getEmissionFactorById(id);
    return carbonRepository.updateEmissionFactor(id, data);
  }

  public async deleteEmissionFactor(id: string): Promise<EmissionFactor> {
    await this.getEmissionFactorById(id);
    return carbonRepository.deleteEmissionFactor(id);
  }

  // ==================== CARBON RECORDS ====================

  /**
   * Get all carbon records filtered by roles/cooperatives.
   */
  public async getCarbonRecords(
    user: JwtPayload, 
    status?: CarbonStatus,
    page: number = 1,
    limit: number = 10
  ): Promise<{ data: any[]; total: number }> {
    const filters: { cooperativeId?: string; status?: CarbonStatus } = { status };

    if (user.role === UserRole.HTX_MANAGER) {
      filters.cooperativeId = user.cooperativeId || undefined;
    }

    return carbonRepository.findAllCarbonRecords(filters, page, limit);
  }

  /**
   * Get a single carbon record with authorization checks.
   */
  public async getCarbonRecordById(id: string, user: JwtPayload): Promise<any> {
    const record = await carbonRepository.findCarbonRecordById(id);
    if (!record) {
      throw new AppError('CARBON_RECORD_NOT_FOUND', 404, 'Không tìm thấy bản ghi carbon');
    }

    // HTX_MANAGER can only access records belonging to their cooperative
    if (user.role === UserRole.HTX_MANAGER && record.season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập bản ghi carbon này');
    }

    return record;
  }

  /**
   * Performs automated carbon calculation and saves the result as DRAFT.
   * [IDEMPOTENT] If a record for the season already exists, return it directly.
   */
  public async calculateAndSaveCarbonRecord(seasonId: string): Promise<any> {
    // 1. Idempotency Check
    const existing = await carbonRepository.findCarbonRecordBySeasonId(seasonId);
    if (existing) {
      console.log(`[CarbonRecordService] CarbonRecord already exists for season ${seasonId}. Skipping.`);
      return existing;
    }

    // 2. Fetch Season and Emission Factors
    const season = await carbonRepository.getSeasonForCalculation(seasonId);
    if (!season) {
      throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa tương ứng để tính toán');
    }

    const factors = await carbonRepository.findAllEmissionFactors();

    // 3. Compute values
    const result = carbonCalculationService.calculateSeasonEmissions(season, factors);

    // 4. Save DRAFT Carbon Record
    const record = await carbonRepository.createCarbonRecord({
      season_id: seasonId,
      total_emitted_kg: result.totalEmittedKg,
      total_sequestered_kg: result.totalSequesteredKg,
      net_carbon_tCO2e: result.netCarbonTCO2e,
      calculation_details: result.calculationDetails as any,
      status: CarbonStatus.DRAFT,
    });

    // 5. Invalidate Dashboard Cache
    const cooperativeId = season.farm_zone?.farmer?.cooperative_id;
    if (cooperativeId) {
      await dashboardCache.invalidateCooperativeCache(cooperativeId);
    }

    return record;
  }

  /**
   * Verify a carbon record (DRAFT -> VERIFIED).
   * SUPER_ADMIN role only.
   */
  public async verifyCarbonRecord(id: string, user: JwtPayload): Promise<any> {
    const record = await this.getCarbonRecordById(id, user);

    if (record.status !== CarbonStatus.DRAFT) {
      throw new AppError(
        'INVALID_CARBON_STATUS',
        422,
        'Chỉ bản ghi ở trạng thái DRAFT mới có thể xác minh'
      );
    }

    const updated = await carbonRepository.updateCarbonRecordStatus(id, CarbonStatus.VERIFIED, {
      verified_by: user.userId,
      verified_at: new Date(),
    });

    const cooperativeId = record.season.farm_zone.farmer.cooperative_id;
    await dashboardCache.invalidateCooperativeCache(cooperativeId);

    return updated;
  }

  /**
   * Issue carbon credits (VERIFIED -> ISSUED).
   * SUPER_ADMIN role only. Can only issue if net carbon is negative (net carbon offset).
   */
  public async issueCarbonCredits(id: string, user: JwtPayload): Promise<any> {
    const record = await this.getCarbonRecordById(id, user);

    if (record.status !== CarbonStatus.VERIFIED) {
      throw new AppError(
        'INVALID_CARBON_STATUS',
        422,
        'Chỉ bản ghi ở trạng thái VERIFIED mới có thể phát hành tín chỉ'
      );
    }

    if (record.net_carbon_tCO2e >= 0) {
      throw new AppError(
        'CARBON_NOT_ELIGIBLE',
        422,
        'Vụ mùa này không đạt hấp thụ ròng để phát hành tín chỉ carbon'
      );
    }

    const creditAmount = Math.abs(record.net_carbon_tCO2e);

    let updated;
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        const year = new Date().getFullYear();
        // Generate a 12-char highly unique hexadecimal string
        const randomChars = crypto.randomBytes(6).toString('hex').toUpperCase();
        const certificateNo = `${CERTIFICATE_PREFIX}${year}-${randomChars}`;

        updated = await carbonRepository.updateCarbonRecordStatus(id, CarbonStatus.ISSUED, {
          certificate_no: certificateNo,
          credit_amount_tCO2e: creditAmount,
          issued_at: new Date(),
        });
        break; // Successfully updated, exit loop
      } catch (error: any) {
        attempts++;
        const isUniqueConstraint = error?.code === 'P2002' || (error?.message && error.message.includes('Unique constraint'));
        if (!isUniqueConstraint || attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    // Create ExportJob to track PDF generation in background
    const exportJob = await carbonRepository.createExportJob({
      report_type: 'CARBON_CERTIFICATE',
      format: ExportFormat.PDF,
      filters: { recordId: id },
      status: ExportStatus.PENDING,
      created_by: user.userId,
    });

    // Queue PDF generation task
    await carbonCertificateQueue.add('generate', {
      recordId: id,
      exportJobId: exportJob.id,
    });

    const cooperativeId = record.season.farm_zone.farmer.cooperative_id;
    await dashboardCache.invalidateCooperativeCache(cooperativeId);

    return { record: updated, exportJobId: exportJob.id };
  }

  /**
   * Manually trigger certificate PDF generation (for retry/re-download cases).
   */
  public async triggerPdfGeneration(id: string, user: JwtPayload): Promise<any> {
    const record = await this.getCarbonRecordById(id, user);

    if (record.status !== CarbonStatus.ISSUED) {
      throw new AppError(
        'INVALID_CARBON_STATUS',
        422,
        'Chỉ bản ghi ở trạng thái ISSUED mới có thể tạo chứng nhận'
      );
    }

    const exportJob = await carbonRepository.createExportJob({
      report_type: 'CARBON_CERTIFICATE',
      format: ExportFormat.PDF,
      filters: { recordId: id },
      status: ExportStatus.PENDING,
      created_by: user.userId,
    });

    await carbonCertificateQueue.add('generate', {
      recordId: id,
      exportJobId: exportJob.id,
    });

    return exportJob;
  }
}

export const carbonRecordService = new CarbonRecordService();
export default carbonRecordService;
