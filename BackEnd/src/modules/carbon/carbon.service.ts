import { carbonRepository } from './carbon.repository';
import { AppError } from '../../shared/utils/app-error';
import { EmissionFactor } from '@prisma/client';

export class CarbonService {
  async getAllEmissionFactors(): Promise<EmissionFactor[]> {
    return carbonRepository.findAll();
  }

  async getEmissionFactorById(id: string): Promise<EmissionFactor> {
    const factor = await carbonRepository.findById(id);
    if (!factor) {
      throw new AppError('EMISSION_FACTOR_NOT_FOUND', 404, 'Không tìm thấy hệ số phát thải');
    }
    return factor;
  }

  async createEmissionFactor(data: any): Promise<EmissionFactor> {
    return carbonRepository.create(data);
  }

  async updateEmissionFactor(id: string, data: any): Promise<EmissionFactor> {
    await this.getEmissionFactorById(id); // Check existence
    return carbonRepository.update(id, data);
  }

  async deleteEmissionFactor(id: string): Promise<EmissionFactor> {
    await this.getEmissionFactorById(id); // Check existence
    return carbonRepository.delete(id);
  }
}

export const carbonService = new CarbonService();
