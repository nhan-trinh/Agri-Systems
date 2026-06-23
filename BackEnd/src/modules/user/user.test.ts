import { UserService } from './user.service';
import { userRepository } from './user.repository';
import { cooperativeRepository } from '../cooperative/cooperative.repository';
import { AppError } from '../../shared/utils/app-error';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ── Mock dependencies ────────────────────────────────────────────
jest.mock('./user.repository');
jest.mock('../cooperative/cooperative.repository');

const mockRepo = userRepository as jest.Mocked<typeof userRepository>;
const mockCoopRepo = cooperativeRepository as jest.Mocked<typeof cooperativeRepository>;

// Helper: fresh service instance per test so mock state is clean.
function makeService() {
  return new UserService();
}

// ── Shared fixtures ──────────────────────────────────────────────

const mockAdmin = {
  userId: 'admin-1',
  role: UserRole.SUPER_ADMIN,
  cooperativeId: null,
  farmerId: null,
  isFirstLogin: false,
};

const mockManager = {
  userId: 'mgr-1',
  role: UserRole.HTX_MANAGER,
  cooperativeId: 'coop-1',
  farmerId: null,
  isFirstLogin: false,
};

const baseUser = {
  id: 'user-1',
  phone: '0901234567',
  password_hash: 'hashed',
  role: UserRole.HTX_MANAGER,
  cooperative_id: 'coop-1',
  farmer_id: null,
  zalo_id: null,
  zalo_name: null,
  avatar_url: null,
  display_name: 'Nguyễn Quản Lý',
  is_first_login: true,
  is_active: true,
  last_login_at: null,
  created_at: new Date(),
  updated_at: new Date(),
} as any;

const activeCoop = {
  id: 'coop-1',
  htx_code: 'BMT01',
  name: 'HTX Nông nghiệp',
  is_active: true,
  deleted_at: null,
} as any;

const createDto = {
  phone: '0901234567',
  full_name: 'Nguyễn Quản Lý',
  cooperative_id: 'coop-1',
};

// ═══════════════════════════════════════════════════════════════
// CREATE MANAGER (T-01 through T-06)
// ═══════════════════════════════════════════════════════════════

describe('UserService — createManager', () => {
  beforeEach(() => jest.clearAllMocks());

  it('T-01: creates an HTX_MANAGER with is_first_login=true, farmer_id=null, zalo_id=null, and returns a temp password', async () => {
    const service = makeService();
    mockCoopRepo.findById.mockResolvedValue(activeCoop);
    mockRepo.findByPhone.mockResolvedValue(null);
    mockRepo.createManager.mockImplementation(async (data) => ({ ...baseUser, ...data, id: 'user-new' }) as never);

    const result = await service.createManager(createDto);

    expect(result.temporaryPassword).toEqual(expect.any(String));
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(10);

    // Verify the user is created with the correct, hardcoded attributes.
    const createArg = mockRepo.createManager.mock.calls[0][0];
    expect(createArg.role).toBe(UserRole.HTX_MANAGER); // hardcoded, not from DTO
    expect(createArg.is_first_login).toBe(true);
    expect(createArg.is_active).toBe(true);
    expect(createArg.display_name).toBe('Nguyễn Quản Lý');
    // farmer_id / zalo_id must never appear in the create payload.
    expect(createArg).not.toHaveProperty('farmer_id');
    expect(createArg).not.toHaveProperty('zalo_id');

    // The returned temporary password must hash to what was stored.
    expect(await bcrypt.compare(result.temporaryPassword, createArg.password_hash)).toBe(true);
  });

  it('T-02: rejects a phone already used by another User with 409', async () => {
    const service = makeService();
    mockCoopRepo.findById.mockResolvedValue(activeCoop);
    mockRepo.findByPhone.mockResolvedValue(baseUser as never);

    await expect(service.createManager(createDto)).rejects.toThrow('đã được sử dụng');
    expect(mockRepo.createManager).not.toHaveBeenCalled();
  });

  it('T-03: rejects a non-existent cooperative_id with 404', async () => {
    const service = makeService();
    mockCoopRepo.findById.mockResolvedValue(null);

    await expect(service.createManager(createDto)).rejects.toThrow('Không tìm thấy Hợp tác xã');
    expect(mockRepo.createManager).not.toHaveBeenCalled();
  });

  it('T-04: rejects an inactive cooperative with 422', async () => {
    const service = makeService();
    mockCoopRepo.findById.mockResolvedValue({ ...activeCoop, is_active: false } as never);

    await expect(service.createManager(createDto)).rejects.toThrow('Hợp tác xã đang bị khóa');
    expect(mockRepo.createManager).not.toHaveBeenCalled();
  });

  it('T-06: ignores a `role` field injected into the DTO payload — created user is always HTX_MANAGER', async () => {
    const service = makeService();
    mockCoopRepo.findById.mockResolvedValue(activeCoop);
    mockRepo.findByPhone.mockResolvedValue(null);
    mockRepo.createManager.mockResolvedValue(baseUser as never);

    // Simulate a raw/untyped caller (e.g. crafted JSON) that injects `role`.
    // The service signature excludes `role`, so cast to bypass TS and test runtime behavior.
    const injectedPayload = { ...createDto, role: 'SUPER_ADMIN' } as unknown as Parameters<
      typeof service.createManager
    >[0];

    await service.createManager(injectedPayload);

    const createArg = mockRepo.createManager.mock.calls[0][0];
    expect(createArg.role).toBe(UserRole.HTX_MANAGER); // NOT SUPER_ADMIN — service hardcodes it
  });
});

// ═══════════════════════════════════════════════════════════════
// LIST USERS (T-07, T-08)
// ═══════════════════════════════════════════════════════════════

describe('UserService — listUsers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('T-07: SUPER_ADMIN sees users across all cooperatives (no forced filter)', async () => {
    const service = makeService();
    mockRepo.findMany.mockResolvedValue({ data: [baseUser], total: 1 });

    const result = await service.listUsers({ page: 1, limit: 20 }, mockAdmin);

    expect(result.data).toHaveLength(1);
    const filterArg = mockRepo.findMany.mock.calls[0][0];
    expect(filterArg.cooperativeId).toBeUndefined(); // not scoped
  });

  it('T-08: HTX_MANAGER is force-scoped to their own cooperative even if they pass another coop id', async () => {
    const service = makeService();
    mockRepo.findMany.mockResolvedValue({ data: [], total: 0 });

    await service.listUsers(
      { cooperative_id: 'coop-other', page: 1, limit: 20 },
      mockManager,
    );

    const filterArg = mockRepo.findMany.mock.calls[0][0];
    // The manager's own coop overrides the crafted query param.
    expect(filterArg.cooperativeId).toBe('coop-1');
  });

  it('parses is_active="false" correctly (avoids the z.coerce.boolean trap)', async () => {
    const service = makeService();
    mockRepo.findMany.mockResolvedValue({ data: [], total: 0 });

    await service.listUsers({ is_active: false, page: 1, limit: 20 }, mockAdmin);

    const filterArg = mockRepo.findMany.mock.calls[0][0];
    expect(filterArg.isActive).toBe(false); // NOT true (the coerce bug)
  });
});

// ═══════════════════════════════════════════════════════════════
// GET USER BY ID (T-14, T-15)
// ═══════════════════════════════════════════════════════════════

describe('UserService — getUserById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('T-14: HTX_MANAGER can access a user in their own cooperative', async () => {
    const service = makeService();
    mockRepo.findById.mockResolvedValue(baseUser as never);

    const result = await service.getUserById('user-1', mockManager);
    expect(result.id).toBe('user-1');
  });

  it('T-15: HTX_MANAGER accessing a user in another cooperative gets 403 (not 404)', async () => {
    const service = makeService();
    mockRepo.findById.mockResolvedValue({ ...baseUser, cooperative_id: 'coop-other' } as never);

    await expect(service.getUserById('user-1', mockManager)).rejects.toThrow('Bạn không có quyền');
  });
});

// ═══════════════════════════════════════════════════════════════
// SET USER STATUS (T-05, T-09, T-10, T-11)
// ═══════════════════════════════════════════════════════════════

describe('UserService — setUserStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('T-05: HTX_MANAGER cannot lock accounts (403)', async () => {
    const service = makeService();

    await expect(
      service.setUserStatus('user-1', false, mockManager),
    ).rejects.toThrow('Chỉ SUPER_ADMIN');
    expect(mockRepo.findById).not.toHaveBeenCalled();
  });

  it('T-09: SUPER_ADMIN locks an HTX_MANAGER account', async () => {
    const service = makeService();
    mockRepo.findById.mockResolvedValue(baseUser as never);
    mockRepo.updateStatus.mockResolvedValue({ ...baseUser, is_active: false } as never);

    const result = await service.setUserStatus('user-1', false, mockAdmin);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('user-1', false);
    expect(result.is_active).toBe(false);
  });

  it('T-10: SUPER_ADMIN cannot lock their own account (CANNOT_LOCK_SELF)', async () => {
    const service = makeService();
    mockRepo.findById.mockResolvedValue({ ...baseUser, id: 'admin-1', role: UserRole.SUPER_ADMIN } as never);

    await expect(
      service.setUserStatus('admin-1', false, mockAdmin),
    ).rejects.toThrow('Không thể khóa chính tài khoản');
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('T-11: cannot lock a SUPER_ADMIN account regardless of caller (CANNOT_LOCK_SUPER_ADMIN)', async () => {
    const service = makeService();
    mockRepo.findById.mockResolvedValue({ ...baseUser, id: 'other-admin', role: UserRole.SUPER_ADMIN } as never);

    await expect(
      service.setUserStatus('other-admin', false, mockAdmin),
    ).rejects.toThrow('Không thể khóa tài khoản SUPER_ADMIN');
    expect(mockRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('does NOT apply lock guards when activating (unlocking is always allowed for SUPER_ADMIN)', async () => {
    const service = makeService();
    // Target is a SUPER_ADMIN — but we are activating, not locking, so it should pass.
    mockRepo.findById.mockResolvedValue({ ...baseUser, id: 'other-admin', role: UserRole.SUPER_ADMIN } as never);
    mockRepo.updateStatus.mockResolvedValue({ ...baseUser, is_active: true } as never);

    const result = await service.setUserStatus('other-admin', true, mockAdmin);
    expect(result.is_active).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// RESET PASSWORD (T-12)
// ═══════════════════════════════════════════════════════════════

describe('UserService — resetPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  it('T-12: resets password, returns a new temp password, sets is_first_login=true', async () => {
    const service = makeService();
    mockRepo.findById.mockResolvedValue(baseUser as never);
    mockRepo.updatePasswordHash.mockResolvedValue({ ...baseUser, is_first_login: true } as never);

    const result = await service.resetPassword('user-1', mockAdmin);

    expect(result.temporaryPassword).toEqual(expect.any(String));
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(10);

    const updateArg = mockRepo.updatePasswordHash.mock.calls[0][0];
    expect(updateArg).toBe('user-1');
    const [_, passwordHash, isFirstLogin] = mockRepo.updatePasswordHash.mock.calls[0];
    expect(isFirstLogin).toBe(true);
    // The new password must hash to what was stored.
    expect(await bcrypt.compare(result.temporaryPassword, passwordHash)).toBe(true);
  });

  it('rejects a reset from a non-SUPER_ADMIN (403)', async () => {
    const service = makeService();

    await expect(
      service.resetPassword('user-1', mockManager),
    ).rejects.toThrow('Chỉ SUPER_ADMIN');
  });

  it('returns 404 for a non-existent user', async () => {
    const service = makeService();
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      service.resetPassword('user-x', mockAdmin),
    ).rejects.toThrow('Không tìm thấy tài khoản');
  });
});

// ═══════════════════════════════════════════════════════════════
// DTO validation (phone regex + is_active enum parsing)
// ═══════════════════════════════════════════════════════════════

describe('User DTO validation', () => {
  const { CreateManagerDto, ListUsersQueryDto } = require('./user.dto');

  it('accepts a valid Vietnamese mobile number', () => {
    const parsed = CreateManagerDto.safeParse(createDto);
    expect(parsed.success).toBe(true);
  });

  it('rejects an invalid phone number', () => {
    const result = CreateManagerDto.safeParse({ ...createDto, phone: '12345' });
    expect(result.success).toBe(false);
  });

  it('strips an injected role field from CreateManagerDto (defense in depth)', () => {
    const parsed = CreateManagerDto.parse({ ...createDto, role: 'SUPER_ADMIN' });
    expect(parsed).not.toHaveProperty('role');
  });

  it('parses is_active query strings "true"/"false" to real booleans', () => {
    expect(ListUsersQueryDto.parse({ is_active: 'false' }).is_active).toBe(false);
    expect(ListUsersQueryDto.parse({ is_active: 'true' }).is_active).toBe(true);
  });
});
