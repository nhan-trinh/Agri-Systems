import { cooperativeRepository } from './cooperative.repository';
import { AppError } from '../../shared/utils/app-error';
import { Cooperative } from '@prisma/client';

export class CooperativeService {
  async getAllCooperatives(): Promise<Cooperative[]> {
    return cooperativeRepository.findAll();
  }

  async getCooperativeById(id: string): Promise<Cooperative> {
    const coop = await cooperativeRepository.findById(id);
    if (!coop) {
      throw new AppError('COOPERATIVE_NOT_FOUND', 404, 'Không tìm thấy Hợp tác xã');
    }
    return coop;
  }

  async createCooperative(data: any): Promise<Cooperative> {
    const existing = await cooperativeRepository.findByHtxCode(data.htx_code);
    if (existing) {
      throw new AppError('COOPERATIVE_CODE_DUPLICATE', 409, 'Mã Hợp tác xã đã tồn tại trên hệ thống');
    }
    return cooperativeRepository.create(data);
  }

  async updateCooperative(id: string, data: any): Promise<Cooperative> {
    await this.getCooperativeById(id);

    if (data.htx_code) {
      const existing = await cooperativeRepository.findByHtxCode(data.htx_code);
      if (existing && existing.id !== id) {
        throw new AppError('COOPERATIVE_CODE_DUPLICATE', 409, 'Mã Hợp tác xã đã tồn tại trên hệ thống');
      }
    }

    return cooperativeRepository.update(id, data);
  }

  async deleteCooperative(id: string): Promise<Cooperative> {
    await this.getCooperativeById(id);
    return cooperativeRepository.delete(id);
  }
}

export const cooperativeService = new CooperativeService();
