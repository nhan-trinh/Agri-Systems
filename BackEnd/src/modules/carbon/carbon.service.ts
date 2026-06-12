import { carbonRepository } from './carbon.repository';
import { AppError } from '../../shared/utils/app-error';
import { EmissionFactor } from '@prisma/client';

export class CarbonService {
  async getAllEmissionFactors(): Promise<EmissionFactor[]> {
    return carbonRepository.findAllEmissionFactors();
  }

  async getEmissionFactorById(id: string): Promise<EmissionFactor> {
    const factor = await carbonRepository.findEmissionFactorById(id);
    if (!factor) {
      throw new AppError('EMISSION_FACTOR_NOT_FOUND', 404, 'Không tìm thấy hệ số phát thải');
    }
    return factor;
  }

  async createEmissionFactor(data: any): Promise<EmissionFactor> {
    return carbonRepository.createEmissionFactor(data);
  }

  async updateEmissionFactor(id: string, data: any): Promise<EmissionFactor> {
    await this.getEmissionFactorById(id); // Check existence
    return carbonRepository.updateEmissionFactor(id, data);
  }

  async deleteEmissionFactor(id: string): Promise<EmissionFactor> {
    await this.getEmissionFactorById(id); // Check existence
    return carbonRepository.deleteEmissionFactor(id);
  }
}

export const carbonService = new CarbonService();
