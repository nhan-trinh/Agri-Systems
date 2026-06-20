import { AuthService } from './auth.service';
import { authRepository } from './auth.repository';
import { zaloService } from './zalo.service';
import { AppError } from '../../shared/utils/app-error';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ==================== Mocks ====================

// Mock Prisma
jest.mock('../../prisma/client', () => ({
  __esModule: true,
  default: {},
}));

// Mock Redis
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();
jest.mock('../../shared/utils/redis.client', () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    del: (...args: any[]) => mockRedisDel(...args),
  }),
}));

// Mock repository
jest.mock('./auth.repository');
const mockRepo = authRepository as jest.Mocked<typeof authRepository>;

// Mock zalo service
jest.mock('./zalo.service');
const mockZalo = zaloService as jest.Mocked<typeof zaloService>;

// Mock config
jest.mock('../../config/app.config', () => ({
  __esModule: true,
  default: {
    jwt: {
      secret: 'test-secret-key-that-is-long-enough-32-chars',
      expiresIn: '15m',
      refreshExpiresIn: '30d',
    },
    zalo: {
      appId: 'test-app-id',
      appSecret: 'test-app-secret',
      oauthUrl: 'https://oauth.zaloapp.com/v4/oa/access_token',
      graphApiUrl: 'https://graph.zalo.me/v2.0/me',
    },
  },
}));

// ==================== Test Data ====================

const mockFarmerUser = {
  id: 'user-farmer-001',
  phone: '0901234567',
  password_hash: null,
  role: 'FARMER' as const,
  cooperative_id: 'coop-001',
  farmer_id: 'farmer-001',
  zalo_id: 'zalo-123456',
  zalo_name: 'Nguyễn Văn A',
  avatar_url: 'https://zalo.me/avatar.jpg',
  is_first_login: false,
  is_active: true,
  last_login_at: new Date(),
  created_at: new Date(),
  updated_at: new Date(),
};

const mockAdminUser = {
  id: 'user-admin-001',
  phone: '0987654321',
  password_hash: bcrypt.hashSync('password123', 10),
  role: 'HTX_MANAGER' as const,
  cooperative_id: 'coop-001',
  farmer_id: null,
  zalo_id: null,
  zalo_name: null,
  avatar_url: null,
  is_first_login: true,
  is_active: true,
  last_login_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockInactiveUser = {
  ...mockFarmerUser,
  id: 'user-inactive-001',
  is_active: false,
};

const hashOtp = (phone: string, otp: string) =>
  crypto
    .createHmac('sha256', 'test-secret-key-that-is-long-enough-32-chars')
    .update(`${phone}:${otp}`)
    .digest('hex');

// ==================== Tests ====================

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
  });

  // ─────────── Zalo Login ───────────

  describe('zaloLogin', () => {
    it('✅ Case 1: zalo_id đã có → đăng nhập thành công, trả JWT', async () => {
      mockZalo.exchangeCodeForToken.mockResolvedValue('zalo-access-token');
      mockZalo.getUserProfile.mockResolvedValue({
        zaloId: 'zalo-123456',
        name: 'Nguyễn Văn A',
        avatar: 'https://zalo.me/avatar.jpg',
      });
      mockRepo.findByZaloId.mockResolvedValue(mockFarmerUser);
      mockRepo.linkZaloId.mockResolvedValue(mockFarmerUser);
      mockRepo.updateLastLogin.mockResolvedValue();

      const result = await service.zaloLogin({ code: 'valid-auth-code' });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe('user-farmer-001');
      expect(result.user.role).toBe('FARMER');
      expect(mockZalo.exchangeCodeForToken).toHaveBeenCalledWith('valid-auth-code');
    });


    it('links Zalo to a pre-created FARMER user by verified phone', async () => {
      const preCreatedFarmerUser = {
        ...mockFarmerUser,
        zalo_id: null,
        zalo_name: null,
        avatar_url: null,
      };
      const linkedFarmerUser = {
        ...preCreatedFarmerUser,
        zalo_id: 'zalo-new-123',
        zalo_name: 'Nguyen Van A',
        avatar_url: 'https://zalo.me/avatar-new.jpg',
      };

      mockZalo.exchangeCodeForToken.mockResolvedValue('zalo-access-token');
      mockZalo.getUserProfile.mockResolvedValue({
        zaloId: 'zalo-new-123',
        name: 'Nguyen Van A',
        avatar: 'https://zalo.me/avatar-new.jpg',
      });
      mockRepo.findByZaloId.mockResolvedValue(null);
      mockRepo.findByPhone.mockResolvedValue(preCreatedFarmerUser);
      mockRepo.linkZaloId.mockResolvedValue(linkedFarmerUser);
      mockRepo.updateLastLogin.mockResolvedValue();

      const result = await service.zaloLogin({
        code: 'valid-auth-code',
        phone: '0901234567',
      });

      expect(mockRepo.findByPhone).toHaveBeenCalledWith('0901234567');
      expect(mockRepo.linkZaloId).toHaveBeenCalledWith(
        preCreatedFarmerUser.id,
        'zalo-new-123',
        'Nguyen Van A',
        'https://zalo.me/avatar-new.jpg'
      );
      expect(result.user.zaloId).toBe('zalo-new-123');
      expect(result.user.role).toBe('FARMER');
    });

    it('❌ Case 2: zalo_id chưa có → 404 USER_NOT_FOUND', async () => {
      mockZalo.exchangeCodeForToken.mockResolvedValue('zalo-access-token');
      mockZalo.getUserProfile.mockResolvedValue({
        zaloId: 'zalo-unknown',
        name: 'Unknown',
        avatar: null,
      });
      mockRepo.findByZaloId.mockResolvedValue(null);

      await expect(service.zaloLogin({ code: 'new-user-code' }))
        .rejects
        .toThrow(AppError);

      try {
        await service.zaloLogin({ code: 'new-user-code' });
      } catch (e: any) {
        expect(e.code).toBe('USER_NOT_FOUND');
        expect(e.statusCode).toBe(404);
      }
    });

    it('❌ Case 3: zalo_id có nhưng is_active = false → 403 ACCOUNT_INACTIVE', async () => {
      mockZalo.exchangeCodeForToken.mockResolvedValue('zalo-access-token');
      mockZalo.getUserProfile.mockResolvedValue({
        zaloId: 'zalo-123456',
        name: 'User',
        avatar: null,
      });
      mockRepo.findByZaloId.mockResolvedValue(mockInactiveUser);

      await expect(service.zaloLogin({ code: 'inactive-code' }))
        .rejects
        .toThrow(AppError);

      try {
        await service.zaloLogin({ code: 'inactive-code' });
      } catch (e: any) {
        expect(e.code).toBe('ACCOUNT_INACTIVE');
        expect(e.statusCode).toBe(403);
      }
    });

    it('❌ Case 4: Zalo API trả lỗi → 502 ZALO_AUTH_FAILED', async () => {
      mockZalo.exchangeCodeForToken.mockRejectedValue(
        new AppError('ZALO_AUTH_FAILED', 502, 'Lỗi kết nối')
      );

      await expect(service.zaloLogin({ code: 'bad-code' }))
        .rejects
        .toThrow(AppError);

      try {
        await service.zaloLogin({ code: 'bad-code' });
      } catch (e: any) {
        expect(e.code).toBe('ZALO_AUTH_FAILED');
        expect(e.statusCode).toBe(502);
      }
    });
  });

  // ─────────── Web Login ───────────

  describe('webLogin', () => {
    it('✅ SĐT + password đúng → trả JWT + refresh token', async () => {
      mockRepo.findByPhone.mockResolvedValue(mockAdminUser);
      mockRepo.updateLastLogin.mockResolvedValue();

      const result = await service.webLogin({
        phone: '0987654321',
        password: 'password123',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.role).toBe('HTX_MANAGER');
      expect(result.user.isFirstLogin).toBe(true);
    });

    it('❌ SĐT không tồn tại → 401 INVALID_CREDENTIALS', async () => {
      mockRepo.findByPhone.mockResolvedValue(null);

      await expect(
        service.webLogin({ phone: '0900000000', password: 'password123' })
      ).rejects.toThrow(AppError);

      try {
        await service.webLogin({ phone: '0900000000', password: 'password123' });
      } catch (e: any) {
        expect(e.code).toBe('INVALID_CREDENTIALS');
        expect(e.statusCode).toBe(401);
      }
    });

    it('❌ Password sai → 401 INVALID_CREDENTIALS', async () => {
      mockRepo.findByPhone.mockResolvedValue(mockAdminUser);

      await expect(
        service.webLogin({ phone: '0987654321', password: 'wrong-password' })
      ).rejects.toThrow(AppError);

      try {
        await service.webLogin({ phone: '0987654321', password: 'wrong-password' });
      } catch (e: any) {
        expect(e.code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('❌ is_active = false → 403 ACCOUNT_INACTIVE', async () => {
      const inactiveAdmin = { ...mockAdminUser, is_active: false };
      mockRepo.findByPhone.mockResolvedValue(inactiveAdmin);

      await expect(
        service.webLogin({ phone: '0987654321', password: 'password123' })
      ).rejects.toThrow(AppError);

      try {
        await service.webLogin({ phone: '0987654321', password: 'password123' });
      } catch (e: any) {
        expect(e.code).toBe('ACCOUNT_INACTIVE');
        expect(e.statusCode).toBe(403);
      }
    });

    it('❌ Tài khoản Zalo (không có password_hash) → 401', async () => {
      mockRepo.findByPhone.mockResolvedValue(mockFarmerUser); // password_hash = null

      await expect(
        service.webLogin({ phone: '0901234567', password: 'any-password' })
      ).rejects.toThrow(AppError);

      try {
        await service.webLogin({ phone: '0901234567', password: 'any-password' });
      } catch (e: any) {
        expect(e.code).toBe('INVALID_CREDENTIALS');
      }
    });
  });

  // ─────────── Get Me ───────────

  describe('getMe', () => {
    it('✅ Trả thông tin user hiện tại', async () => {
      mockRepo.findById.mockResolvedValue(mockFarmerUser);

      const result = await service.getMe('user-farmer-001');

      expect(result.id).toBe('user-farmer-001');
      expect(result.role).toBe('FARMER');
      expect(result.zaloId).toBe('zalo-123456');
    });

    it('❌ User không tồn tại → 404', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getMe('non-existent'))
        .rejects.toThrow(AppError);
    });
  });

  // ─────────── OTP ───────────

  describe('forgotPassword', () => {
    it('✅ Gửi OTP thành công → lưu Redis TTL 5 phút', async () => {
      mockRepo.findByPhone.mockResolvedValue(mockAdminUser);
      mockRedisGet.mockResolvedValue(null); // Không bị lock

      const result = await service.forgotPassword({ phone: '0987654321' });

      expect(result.message).toContain('OTP');
      expect(mockRedisSet).toHaveBeenCalledWith(
        'otp:0987654321',
        expect.any(String),
        { EX: 300 }
      );
    });

    it('✅ Tài khoản farmer/Zalo-only không được cấp OTP reset password web', async () => {
      mockRepo.findByPhone.mockResolvedValue(mockFarmerUser);

      const result = await service.forgotPassword({ phone: '0901234567' });

      expect(result.message).toContain('OTP');
      expect(mockRedisSet).not.toHaveBeenCalled();
    });

    it('❌ Sai OTP 3 lần → khóa 15 phút, throw OTP_LOCKED', async () => {
      mockRepo.findByPhone.mockResolvedValue(mockAdminUser);
      mockRedisGet
        .mockResolvedValueOnce('3') // otp_attempt = 3 (đã lock)
        ;

      await expect(
        service.forgotPassword({ phone: '0987654321' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('resetPassword', () => {
    it('❌ OTP hết hạn → throw OTP_EXPIRED', async () => {
      mockRedisGet
        .mockResolvedValueOnce(null)  // otp_attempt (không bị lock)
        .mockResolvedValueOnce(null); // otp key (hết hạn / không tồn tại)

      await expect(
        service.resetPassword({ phone: '0987654321', otp: '123456', new_password: 'newpass123' })
      ).rejects.toThrow(AppError);

      try {
        await service.resetPassword({ phone: '0987654321', otp: '123456', new_password: 'newpass123' });
      } catch (e: any) {
        expect(e.code).toBe('OTP_EXPIRED');
      }
    });

    it('❌ Farmer/Zalo-only không thể reset password web dù OTP đúng', async () => {
      mockRedisGet
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(hashOtp('0901234567', '123456'));
      mockRepo.findByPhone.mockResolvedValue(mockFarmerUser);

      try {
        await service.resetPassword({ phone: '0901234567', otp: '123456', new_password: 'newpass123' });
        throw new Error('Expected resetPassword to throw');
      } catch (e: any) {
        expect(e).toBeInstanceOf(AppError);
        expect(e.code).toBe('FORBIDDEN');
      }
    });
  });
});

