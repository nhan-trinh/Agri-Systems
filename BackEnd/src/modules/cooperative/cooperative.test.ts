import { CooperativeService } from './cooperative.service';
import { cooperativeRepository } from './cooperative.repository';
import { AppError } from '../../shared/utils/app-error';

// ── Mock dependencies ────────────────────────────────────────────
jest.mock('./cooperative.repository');
jest.mock('../../shared/utils/redis.client', () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  }),
}));

const mockRepo = cooperativeRepository as jest.Mocked<typeof cooperativeRepository>;

// Helper: instantiate a fresh service so the cache mock state can be reset per-test.
function makeService() {
  return new CooperativeService();
}

// ── Shared fixtures ──────────────────────────────────────────────

const baseCoop = {
  id: 'coop-1',
  htx_code: 'BMT01',
  name: 'HTX Nông nghiệp Buôn Ma Thuột',
  province: 'Đắk Lắk',
  district: 'Buôn Ma Thuột',
  address: 'Số 1, Lê Lợi',
  phone: '0901234567',
  is_active: true,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
} as any;

const createDto = {
  htx_code: 'BMT02',
  name: 'HTX Mới',
  province: 'Đắk Lắk',
  district: 'Krông Pắc',
  address: 'Số 2, Nguyễn Trãi',
  phone: '0909876543',
};

// ═══════════════════════════════════════════════════════════════
// LIST
// ═══════════════════════════════════════════════════════════════

describe('CooperativeService — listCooperatives', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paginated results with meta', async () => {
    const service = makeService();
    mockRepo.findAll.mockResolvedValue([baseCoop]);
    mockRepo.count.mockResolvedValue(1);

    const result = await service.listCooperatives({ page: 1, limit: 20 });

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.total_pages).toBe(1);
    // Default unfiltered query should be cached.
    expect(mockRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('passes search / is_active filters through to the repository', async () => {
    const service = makeService();
    mockRepo.findAll.mockResolvedValue([]);
    mockRepo.count.mockResolvedValue(0);

    await service.listCooperatives({ search: 'buôn', is_active: 'true', page: 1, limit: 20 });

    expect(mockRepo.findAll).toHaveBeenCalledWith(expect.objectContaining({
      search: 'buôn',
      isActive: true,
    }));
  });
});

// ═══════════════════════════════════════════════════════════════
// GET BY ID
// ═══════════════════════════════════════════════════════════════

describe('CooperativeService — getCooperativeById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the cooperative when it exists', async () => {
    const service = makeService();
    mockRepo.findActiveById.mockResolvedValue(baseCoop);

    const result = await service.getCooperativeById('coop-1');
    expect(result.id).toBe('coop-1');
  });

  it('throws 404 when the cooperative is soft-deleted (findActiveById returns null)', async () => {
    const service = makeService();
    mockRepo.findActiveById.mockResolvedValue(null);

    await expect(service.getCooperativeById('coop-x')).rejects.toThrow('Không tìm thấy Hợp tác xã');
  });
});

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════

describe('CooperativeService — createCooperative', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates when the htx_code is free', async () => {
    const service = makeService();
    mockRepo.findByHtxCode.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ ...baseCoop, htx_code: 'BMT02' } as never);

    const result = await service.createCooperative(createDto);
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ htx_code: 'BMT02' }));
    expect(result.htx_code).toBe('BMT02');
  });

  it('rejects a duplicate htx_code with 409 (app-level check)', async () => {
    const service = makeService();
    mockRepo.findByHtxCode.mockResolvedValue(baseCoop as never);

    await expect(service.createCooperative(createDto)).rejects.toThrow('đã tồn tại trên hệ thống');
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('maps a Prisma P2002 (concurrent insert race) to the same 409', async () => {
    const service = makeService();
    mockRepo.findByHtxCode.mockResolvedValue(null);
    mockRepo.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }) as never);

    await expect(service.createCooperative(createDto)).rejects.toThrow('đã tồn tại trên hệ thống');
  });
});

// ═══════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════

describe('CooperativeService — updateCooperative', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates fields when the cooperative exists', async () => {
    const service = makeService();
    mockRepo.findActiveById.mockResolvedValue(baseCoop as never);
    mockRepo.update.mockResolvedValue({ ...baseCoop, name: 'HTX Đổi Tên' } as never);

    const result = await service.updateCooperative('coop-1', { name: 'HTX Đổi Tên' });
    expect(mockRepo.update).toHaveBeenCalledWith('coop-1', { name: 'HTX Đổi Tên' });
    expect(result.name).toBe('HTX Đổi Tên');
  });

  it('rejects renaming htx_code to one already taken by another HTX', async () => {
    const service = makeService();
    mockRepo.findActiveById.mockResolvedValue(baseCoop as never);
    mockRepo.findByHtxCode.mockResolvedValue({ id: 'coop-2', htx_code: 'BMT02' } as never);

    await expect(
      service.updateCooperative('coop-1', { htx_code: 'BMT02' }),
    ).rejects.toThrow('đã tồn tại trên hệ thống');
  });
});

// ═══════════════════════════════════════════════════════════════
// TOGGLE STATUS
// ═══════════════════════════════════════════════════════════════

describe('CooperativeService — toggleStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deactivates when there are no active dependents', async () => {
    const service = makeService();
    mockRepo.findActiveById.mockResolvedValue(baseCoop as never);
    mockRepo.countActiveDependents.mockResolvedValue({ farmers: 0, users: 0 });
    mockRepo.update.mockResolvedValue({ ...baseCoop, is_active: false } as never);

    const result = await service.toggleStatus('coop-1');
    expect(mockRepo.update).toHaveBeenCalledWith('coop-1', { is_active: false });
    expect(result.is_active).toBe(false);
  });

  it('reactivates a deactivated cooperative via restore()', async () => {
    const service = makeService();
    const inactive = { ...baseCoop, is_active: false, deleted_at: new Date() };
    mockRepo.findActiveById.mockResolvedValue(inactive as never);
    mockRepo.restore.mockResolvedValue({ ...baseCoop, is_active: true, deleted_at: null } as never);

    const result = await service.toggleStatus('coop-1');
    expect(mockRepo.restore).toHaveBeenCalledWith('coop-1');
    expect(result.is_active).toBe(true);
  });

  it('blocks deactivation when the HTX has active farmers/users (BR-002-6 equivalent)', async () => {
    const service = makeService();
    mockRepo.findActiveById.mockResolvedValue(baseCoop as never);
    mockRepo.countActiveDependents.mockResolvedValue({ farmers: 3, users: 2 });

    await expect(service.toggleStatus('coop-1')).rejects.toThrow('3 nông dân');
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// DELETE (soft)
// ═══════════════════════════════════════════════════════════════

describe('CooperativeService — deleteCooperative', () => {
  beforeEach(() => jest.clearAllMocks());

  it('soft-deletes when there are no active dependents', async () => {
    const service = makeService();
    mockRepo.findActiveById.mockResolvedValue(baseCoop as never);
    mockRepo.countActiveDependents.mockResolvedValue({ farmers: 0, users: 0 });
    mockRepo.softDelete.mockResolvedValue({ ...baseCoop, is_active: false, deleted_at: new Date() } as never);

    const result = await service.deleteCooperative('coop-1');
    expect(mockRepo.softDelete).toHaveBeenCalledWith('coop-1');
    expect(result.is_active).toBe(false);
    expect(result.deleted_at).not.toBeNull();
  });

  it('blocks deletion when there are active dependents', async () => {
    const service = makeService();
    mockRepo.findActiveById.mockResolvedValue(baseCoop as never);
    mockRepo.countActiveDependents.mockResolvedValue({ farmers: 5, users: 0 });

    await expect(service.deleteCooperative('coop-1')).rejects.toThrow('5 nông dân');
    expect(mockRepo.softDelete).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════
// DTO — htx_code normalization & phone validation
// ═══════════════════════════════════════════════════════════════

describe('CreateCooperativeDto normalization', () => {
  const { CreateCooperativeDto } = require('./cooperative.dto');

  it('uppercases and trims htx_code', () => {
    const parsed = CreateCooperativeDto.parse({
      ...createDto,
      htx_code: '  bmt02  ',
    });
    expect(parsed.htx_code).toBe('BMT02');
  });

  it('rejects an invalid phone number', () => {
    const result = CreateCooperativeDto.safeParse({
      ...createDto,
      phone: 'abc',
    });
    expect(result.success).toBe(false);
  });
});
