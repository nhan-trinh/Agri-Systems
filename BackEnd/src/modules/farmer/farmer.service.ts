import { farmerRepository } from './farmer.repository';
import { cooperativeRepository } from '../cooperative/cooperative.repository';
import { AppError } from '../../shared/utils/app-error';
import { Farmer } from '@prisma/client';

export class FarmerService {
  async getAllFarmers(user: any): Promise<Farmer[]> {
    if (user.role === 'SUPER_ADMIN') {
      return farmerRepository.findAll();
    }
    // HTX Manager chỉ xem được nông dân thuộc HTX của mình
    return farmerRepository.findAll(user.cooperativeId);
  }

  async getFarmerById(id: string, user: any): Promise<Farmer> {
    const farmer = await farmerRepository.findById(id);
    if (!farmer) {
      throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy nông dân');
    }
    // Bảo vệ quyền truy cập theo vai trò
    if (user.role !== 'SUPER_ADMIN' && farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền xem thông tin nông dân này');
    }
    return farmer;
  }

  async createFarmer(data: any, user: any): Promise<Farmer> {
    // Ràng buộc quyền: HTX Manager chỉ được thêm nông dân thuộc HTX của mình
    if (user.role !== 'SUPER_ADMIN' && data.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép thêm nông dân vào hợp tác xã của mình');
    }

    // Kiểm tra HTX tồn tại
    const coop = await cooperativeRepository.findById(data.cooperative_id);
    if (!coop) {
      throw new AppError('COOPERATIVE_NOT_FOUND', 404, 'Không tìm thấy Hợp tác xã tương ứng');
    }

    // Kiểm tra trùng số điện thoại nông dân
    const existingPhone = await farmerRepository.findByPhone(data.phone);
    if (existingPhone) {
      throw new AppError('FARMER_PHONE_DUPLICATE', 409, 'Số điện thoại này đã được sử dụng cho nông dân khác');
    }

    // Tự sinh mã farmer_code: HTX_CODE-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const countThisYear = await farmerRepository.countByCooperativeAndYear(data.cooperative_id, currentYear);
    const nextSerial = String(countThisYear + 1).padStart(4, '0');
    const farmerCode = `${coop.htx_code}-${currentYear}-${nextSerial}`;

    return farmerRepository.create({
      ...data,
      farmer_code: farmerCode,
    });
  }

  async updateFarmer(id: string, data: any, user: any): Promise<Farmer> {
    const farmer = await this.getFarmerById(id, user);

    if (data.phone) {
      const existingPhone = await farmerRepository.findByPhone(data.phone);
      if (existingPhone && existingPhone.id !== id) {
        throw new AppError('FARMER_PHONE_DUPLICATE', 409, 'Số điện thoại này đã được sử dụng cho nông dân khác');
      }
    }

    // Ràng buộc bảo vệ: Không cho phép đổi cooperative_id của nông dân sang HTX khác nếu không phải SUPER_ADMIN
    if (data.cooperative_id && data.cooperative_id !== farmer.cooperative_id && user.role !== 'SUPER_ADMIN') {
      throw new AppError('FORBIDDEN', 403, 'Bạn không thể thay đổi Hợp tác xã quản lý của nông dân');
    }

    return farmerRepository.update(id, data);
  }

  async toggleFarmerStatus(id: string, user: any): Promise<Farmer> {
    const farmer = await this.getFarmerById(id, user);
    
    // Đảo ngược trạng thái hoạt động thay vì xóa cứng (BR-001-4)
    return farmerRepository.update(id, {
      is_active: !farmer.is_active,
    });
  }
}

export const farmerService = new FarmerService();
