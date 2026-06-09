# Farmer Redis Caching Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Triển khai cơ chế caching (Cache-Aside) sử dụng Redis cho danh sách và chi tiết nông dân của module Farmer.

**Architecture:** Sử dụng Redis Client thông qua `getRedisClient` để kiểm tra cache trước khi query DB (PostgreSQL/Prisma) ở tầng Service, đồng thời thực hiện xóa các cache key tương ứng khi có sự kiện write. Xử lý fail-safe bọc trong try-catch để dự phòng khi Redis downtime.

**Tech Stack:** Redis 7, Prisma ORM, Jest, TypeScript

---

### Task 1: Tạo test suite cho logic Farmer Caching

**Files:**
- Create: `d:/Downloads/agri-system/BackEnd/src/modules/farmer/farmer.cache.test.ts`

**Step 1: Viết test suite giả lập lỗi và kiểm tra đọc/ghi cache**
Viết nội dung file test để xác minh các hàm đọc (`getAllFarmers`, `getFarmerById`) hoạt động đúng với cache hit/miss và các hàm ghi (`createFarmer`, `updateFarmer`, `toggleFarmerStatus`) thực hiện invalidate chính xác các key liên quan.

```typescript
import { farmerService } from './farmer.service';
import { farmerRepository } from './farmer.repository';
import { cooperativeRepository } from '../cooperative/cooperative.repository';
import { getRedisClient } from '../../shared/utils/redis.client';
import { AppError } from '../../shared/utils/app-error';

jest.mock('./farmer.repository');
jest.mock('../cooperative/cooperative.repository');
jest.mock('../../shared/utils/redis.client');

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

describe('Farmer Service Caching', () => {
  const mockUserAdmin = { id: 'admin-1', role: 'SUPER_ADMIN' };
  const mockUserCoop = { id: 'manager-1', role: 'HTX_MANAGER', cooperativeId: 'coop-1' };
  
  const mockFarmer = {
    id: 'farmer-1',
    full_name: 'Nguyen Van A',
    phone: '0987654321',
    farmer_code: 'HTX-2026-0001',
    cooperative_id: 'coop-1',
    is_active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockResolvedValue({
      get: mockRedisGet,
      set: mockRedisSet,
      del: mockRedisDel,
    });
  });

  describe('getAllFarmers', () => {
    it('should return cached list if available (SUPER_ADMIN)', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify([mockFarmer]));
      
      const result = await farmerService.getAllFarmers(mockUserAdmin);
      
      expect(mockRedisGet).toHaveBeenCalledWith('farmers:list:all');
      expect(farmerRepository.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockFarmer]);
    });

    it('should query DB and set cache if cache miss (HTX_MANAGER)', async () => {
      mockRedisGet.mockResolvedValue(null);
      (farmerRepository.findAll as jest.Mock).mockResolvedValue([mockFarmer]);

      const result = await farmerService.getAllFarmers(mockUserCoop);

      expect(mockRedisGet).toHaveBeenCalledWith('farmers:list:coop:coop-1');
      expect(farmerRepository.findAll).toHaveBeenCalledWith('coop-1');
      expect(mockRedisSet).toHaveBeenCalledWith(
        'farmers:list:coop:coop-1',
        JSON.stringify([mockFarmer]),
        { EX: 300 }
      );
      expect(result).toEqual([mockFarmer]);
    });

    it('should fallback to DB if Redis fails', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis Down'));
      (farmerRepository.findAll as jest.Mock).mockResolvedValue([mockFarmer]);

      const result = await farmerService.getAllFarmers(mockUserAdmin);

      expect(farmerRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockFarmer]);
    });
  });

  describe('getFarmerById', () => {
    it('should return cached detail and enforce RBAC validation', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockFarmer));

      const result = await farmerService.getFarmerById('farmer-1', mockUserCoop);

      expect(mockRedisGet).toHaveBeenCalledWith('farmers:detail:farmer-1');
      expect(farmerRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockFarmer);
    });

    it('should query DB, set cache and check RBAC if cache miss', async () => {
      mockRedisGet.mockResolvedValue(null);
      (farmerRepository.findById as jest.Mock).mockResolvedValue(mockFarmer);

      const result = await farmerService.getFarmerById('farmer-1', mockUserCoop);

      expect(farmerRepository.findById).toHaveBeenCalledWith('farmer-1');
      expect(mockRedisSet).toHaveBeenCalledWith(
        'farmers:detail:farmer-1',
        JSON.stringify(mockFarmer),
        { EX: 300 }
      );
      expect(result).toEqual(mockFarmer);
    });

    it('should throw FORBIDDEN if manager accesses farmer from another coop', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify({ ...mockFarmer, cooperative_id: 'coop-other' }));

      await expect(farmerService.getFarmerById('farmer-1', mockUserCoop)).rejects.toThrow(AppError);
    });
  });

  describe('createFarmer / updateFarmer / toggleFarmerStatus', () => {
    it('should invalidate list cache when creating farmer', async () => {
      (cooperativeRepository.findById as jest.Mock).mockResolvedValue({ htx_code: 'HTX' });
      (farmerRepository.findByPhone as jest.Mock).mockResolvedValue(null);
      (farmerRepository.countByCooperativeAndYear as jest.Mock).mockResolvedValue(0);
      (farmerRepository.create as jest.Mock).mockResolvedValue(mockFarmer);

      await farmerService.createFarmer(
        { full_name: 'A', phone: '0987654321', cooperative_id: 'coop-1', address: 'XYZ' },
        mockUserCoop
      );

      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:all');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:coop:coop-1');
    });

    it('should invalidate list and detail cache when updating farmer', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockFarmer)); // getFarmerById
      (farmerRepository.update as jest.Mock).mockResolvedValue(mockFarmer);

      await farmerService.updateFarmer('farmer-1', { full_name: 'New Name' }, mockUserCoop);

      expect(mockRedisDel).toHaveBeenCalledWith('farmers:detail:farmer-1');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:all');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:coop:coop-1');
    });
  });
});
```

**Step 2: Chạy test để kiểm tra lỗi**
Run: `npx jest src/modules/farmer/farmer.cache.test.ts`
Expected: Thất bại (vì class `FarmerService` chưa import Redis client hay tích hợp logic caching).

**Step 3: Commit**
```bash
git add src/modules/farmer/farmer.cache.test.ts
git commit -m "test: add unit tests for farmer caching layer"
```

---

### Task 2: Cập nhật FarmerService để cài đặt Caching & Invalidation

**Files:**
- Modify: `d:/Downloads/agri-system/BackEnd/src/modules/farmer/farmer.service.ts`

**Step 1: Cập nhật code implementation**
Sửa đổi file `farmer.service.ts` để thêm import `getRedisClient`, viết method `invalidateCache`, và tích hợp logic cache vào tất cả các method.

```typescript
import { farmerRepository } from './farmer.repository';
import { cooperativeRepository } from '../cooperative/cooperative.repository';
import { AppError } from '../../shared/utils/app-error';
import { Farmer } from '@prisma/client';
import { getRedisClient } from '../../shared/utils/redis.client';

export class FarmerService {
  private async invalidateCache(farmerId?: string, cooperativeId?: string) {
    try {
      const redis = await getRedisClient();
      await redis.del('farmers:list:all');
      if (cooperativeId) {
        await redis.del(`farmers:list:coop:${cooperativeId}`);
      }
      if (farmerId) {
        await redis.del(`farmers:detail:${farmerId}`);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to invalidate farmer cache:', error);
    }
  }

  async getAllFarmers(user: any): Promise<Farmer[]> {
    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    const cacheKey = isSuperAdmin ? 'farmers:list:all' : `farmers:list:coop:${user.cooperativeId}`;

    try {
      const redis = await getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to get farmers list cache:', error);
    }

    const farmers = isSuperAdmin
      ? await farmerRepository.findAll()
      : await farmerRepository.findAll(user.cooperativeId);

    try {
      const redis = await getRedisClient();
      await redis.set(cacheKey, JSON.stringify(farmers), { EX: 300 });
    } catch (error) {
      console.error('[Redis Error] Failed to set farmers list cache:', error);
    }

    return farmers;
  }

  async getFarmerById(id: string, user: any): Promise<Farmer> {
    const cacheKey = `farmers:detail:${id}`;
    let farmer: Farmer | null = null;

    try {
      const redis = await getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        farmer = JSON.parse(cached);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to get farmer detail cache:', error);
    }

    if (!farmer) {
      farmer = await farmerRepository.findById(id);
      if (farmer) {
        try {
          const redis = await getRedisClient();
          await redis.set(cacheKey, JSON.stringify(farmer), { EX: 300 });
        } catch (error) {
          console.error('[Redis Error] Failed to set farmer detail cache:', error);
        }
      }
    }

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

    const farmer = await farmerRepository.create({
      ...data,
      farmer_code: farmerCode,
    });

    // Invalidate cache
    await this.invalidateCache(undefined, data.cooperative_id);

    return farmer;
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

    const updatedFarmer = await farmerRepository.update(id, data);

    // Invalidate cache
    await this.invalidateCache(id, farmer.cooperative_id);
    if (data.cooperative_id && data.cooperative_id !== farmer.cooperative_id) {
      await this.invalidateCache(undefined, data.cooperative_id);
    }

    return updatedFarmer;
  }

  async toggleFarmerStatus(id: string, user: any): Promise<Farmer> {
    const farmer = await this.getFarmerById(id, user);
    
    // Đảo ngược trạng thái hoạt động thay vì xóa cứng (BR-001-4)
    const updatedFarmer = await farmerRepository.update(id, {
      is_active: !farmer.is_active,
    });

    // Invalidate cache
    await this.invalidateCache(id, farmer.cooperative_id);

    return updatedFarmer;
  }
}

export const farmerService = new FarmerService();
```

**Step 2: Chạy unit tests để verify code chạy đúng**
Run: `npx jest src/modules/farmer/farmer.cache.test.ts`
Expected: PASS

**Step 3: Commit**
```bash
git add src/modules/farmer/farmer.service.ts
git commit -m "feat: implement Redis caching in FarmerService with Cache-Aside pattern"
```

---

### Task 3: Chạy lại toàn bộ test suite và build kiểm thử hệ thống

**Step 1: Chạy toàn bộ các bài test backend**
Run: `npm run test`
Expected: 12/12 test suites, 70+ tests pass (bao gồm cả suite mới).

**Step 2: Build project kiểm tra lỗi TypeScript/Syntax**
Run: `npm run build`
Expected: Build thành công không có lỗi `tsc`.

**Step 3: Commit**
```bash
git commit --allow-empty -m "chore: verify backend tests & build successfully"
```
