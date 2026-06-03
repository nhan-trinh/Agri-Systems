import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import config from '../../config/app.config';
import { AppError } from '../../shared/utils/app-error';
import { getRedisClient } from '../../shared/utils/redis.client';
import { authRepository } from './auth.repository';
import { zaloService } from './zalo.service';
import {
  JwtPayload,
  JwtTokenPair,
  LoginResponse,
  AuthUserResponse,
} from './auth.types';
import {
  ZaloLoginInput,
  LoginInput,
  ChangePasswordInput,
  FirstLoginChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from './auth.dto';
import { User } from '@prisma/client';

// ==================== Constants ====================

const BCRYPT_SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 ngày
const OTP_TTL_SECONDS = 5 * 60; // 5 phút
const OTP_LOCK_TTL_SECONDS = 15 * 60; // 15 phút
const OTP_MAX_ATTEMPTS = 3;

// ==================== Helper ====================

function toAuthUserResponse(user: User): AuthUserResponse {
  return {
    id: user.id,
    phone: user.phone,
    role: user.role,
    cooperativeId: user.cooperative_id,
    farmerId: user.farmer_id,
    zaloId: user.zalo_id,
    zaloName: user.zalo_name,
    avatarUrl: user.avatar_url,
    isFirstLogin: user.is_first_login,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at,
  };
}

function buildJwtPayload(user: User): JwtPayload {
  return {
    userId: user.id,
    role: user.role,
    cooperativeId: user.cooperative_id,
    farmerId: user.farmer_id,
    isFirstLogin: user.is_first_login,
  };
}

// ==================== Service ====================

export class AuthService {
  // ─────────── Token Generation ───────────

  /**
   * Sinh cặp JWT access + refresh token.
   * Refresh token lưu vào Redis với TTL 30 ngày.
   */
  async generateTokenPair(user: User): Promise<JwtTokenPair> {
    const payload = buildJwtPayload(user);

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as any,
    });

    // Refresh token = random ID, lưu vào Redis
    const refreshTokenId = crypto.randomUUID();
    const refreshToken = jwt.sign(
      { userId: user.id, tokenId: refreshTokenId },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn as any }
    );

    // Lưu refresh token vào Redis
    const redis = await getRedisClient();
    await redis.set(
      `refresh:${user.id}:${refreshTokenId}`,
      'valid',
      { EX: REFRESH_TOKEN_TTL_SECONDS }
    );

    return { accessToken, refreshToken };
  }

  // ─────────── Luồng A: Zalo Mini App Login ───────────

  /**
   * Đăng nhập qua Zalo Mini App.
   * 1. Đổi auth code → access_token (Zalo OAuth)
   * 2. Lấy profile từ Graph API
   * 3. Tìm/map user trong DB → sinh JWT
   */
  async zaloLogin(input: ZaloLoginInput): Promise<LoginResponse> {
    // Bước 1: Đổi code lấy access_token từ Zalo
    const zaloAccessToken = await zaloService.exchangeCodeForToken(input.code);

    // Bước 2: Lấy profile user
    const profile = await zaloService.getUserProfile(zaloAccessToken);

    // Bước 3: Tìm user theo zalo_id
    let user = await authRepository.findByZaloId(profile.zaloId);

    if (!user) {
      // zalo_id chưa có → không tự tạo user mới (BR-001: HTX_MANAGER phải tạo trước)
      throw new AppError(
        'USER_NOT_FOUND',
        404,
        'Tài khoản chưa được tạo trong hệ thống. Vui lòng liên hệ quản lý HTX.'
      );
    }

    // Kiểm tra tài khoản có bị khóa không
    if (!user.is_active) {
      throw new AppError(
        'ACCOUNT_INACTIVE',
        403,
        'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'
      );
    }

    // Cập nhật thông tin Zalo mới nhất (tên, avatar có thể thay đổi)
    user = await authRepository.linkZaloId(
      user.id,
      profile.zaloId,
      profile.name,
      profile.avatar
    );

    // Cập nhật last login
    await authRepository.updateLastLogin(user.id);

    // Sinh token
    const tokens = await this.generateTokenPair(user);

    return {
      ...tokens,
      user: toAuthUserResponse(user),
    };
  }

  // ─────────── Luồng B: Web Admin Login ───────────

  /**
   * Đăng nhập bằng SĐT + mật khẩu (cho HTX_MANAGER, SUPER_ADMIN, WAREHOUSE_KEEPER)
   */
  async webLogin(input: LoginInput): Promise<LoginResponse> {
    const user = await authRepository.findByPhone(input.phone);

    if (!user) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        401,
        'Số điện thoại hoặc mật khẩu không đúng'
      );
    }

    if (!user.is_active) {
      throw new AppError(
        'ACCOUNT_INACTIVE',
        403,
        'Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'
      );
    }

    if (!user.password_hash) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        401,
        'Tài khoản này không hỗ trợ đăng nhập bằng mật khẩu'
      );
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        401,
        'Số điện thoại hoặc mật khẩu không đúng'
      );
    }

    await authRepository.updateLastLogin(user.id);

    const tokens = await this.generateTokenPair(user);

    return {
      ...tokens,
      user: toAuthUserResponse(user),
    };
  }

  // ─────────── Refresh Token ───────────

  /**
   * Đổi refresh token lấy access token mới.
   * Refresh token cũ bị hủy (rotation) → sinh refresh token mới.
   */
  async refreshToken(refreshTokenStr: string): Promise<JwtTokenPair> {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenStr, config.jwt.secret);
    } catch {
      throw new AppError('UNAUTHORIZED', 401, 'Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const { userId, tokenId } = decoded;

    // Kiểm tra refresh token còn trong Redis không
    const redis = await getRedisClient();
    const stored = await redis.get(`refresh:${userId}:${tokenId}`);

    if (!stored) {
      throw new AppError('UNAUTHORIZED', 401, 'Refresh token đã bị thu hồi');
    }

    // Hủy refresh token cũ (rotation)
    await redis.del(`refresh:${userId}:${tokenId}`);

    // Tìm user
    const user = await authRepository.findById(userId);
    if (!user || !user.is_active) {
      throw new AppError('UNAUTHORIZED', 401, 'Tài khoản không tồn tại hoặc đã bị khóa');
    }

    // Sinh cặp token mới
    return this.generateTokenPair(user);
  }

  // ─────────── Logout ───────────

  /**
   * Hủy refresh token khỏi Redis → user không thể dùng lại.
   */
  async logout(refreshTokenStr: string): Promise<void> {
    let decoded: any;
    try {
      decoded = jwt.verify(refreshTokenStr, config.jwt.secret);
    } catch {
      // Token đã hết hạn thì cũng coi như logout thành công
      return;
    }

    const { userId, tokenId } = decoded;
    const redis = await getRedisClient();
    await redis.del(`refresh:${userId}:${tokenId}`);
  }

  // ─────────── Get Current User ───────────

  /**
   * Lấy thông tin user đang đăng nhập từ JWT payload.
   */
  async getMe(userId: string): Promise<AuthUserResponse> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'Không tìm thấy user');
    }
    return toAuthUserResponse(user);
  }

  // ─────────── Change Password (Web Admin) ───────────

  /**
   * Đổi mật khẩu — yêu cầu nhập mật khẩu cũ.
   */
  async changePassword(userId: string, input: ChangePasswordInput): Promise<void> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'Không tìm thấy user');
    }

    if (!user.password_hash) {
      throw new AppError(
        'FORBIDDEN',
        403,
        'Tài khoản này không hỗ trợ đổi mật khẩu (đăng nhập qua Zalo)'
      );
    }

    const isValid = await bcrypt.compare(input.old_password, user.password_hash);
    if (!isValid) {
      throw new AppError('INVALID_CREDENTIALS', 401, 'Mật khẩu cũ không đúng');
    }

    const newHash = await bcrypt.hash(input.new_password, BCRYPT_SALT_ROUNDS);
    await authRepository.updatePassword(userId, newHash);
  }

  // ─────────── First Login Change Password ───────────

  /**
   * Đổi mật khẩu bắt buộc lần đầu đăng nhập (web admin).
   */
  async firstLoginChangePassword(
    userId: string,
    input: FirstLoginChangePasswordInput
  ): Promise<void> {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'Không tìm thấy user');
    }

    if (!user.is_first_login) {
      throw new AppError('FORBIDDEN', 403, 'Tài khoản đã đổi mật khẩu lần đầu rồi');
    }

    const newHash = await bcrypt.hash(input.new_password, BCRYPT_SALT_ROUNDS);
    await authRepository.updatePassword(userId, newHash);
  }

  // ─────────── Forgot Password (OTP) ───────────

  /**
   * Gửi OTP qua SMS để reset mật khẩu.
   * OTP lưu Redis với TTL 5 phút. Đếm số lần sai tối đa 3 lần.
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const user = await authRepository.findByPhone(input.phone);
    if (!user) {
      // Không tiết lộ SĐT có tồn tại hay không (bảo mật)
      return { message: 'Nếu số điện thoại tồn tại, OTP sẽ được gửi qua SMS' };
    }

    const redis = await getRedisClient();

    // Kiểm tra có đang bị lock không
    const lockKey = `otp_attempt:${input.phone}`;
    const attemptCount = await redis.get(lockKey);
    if (attemptCount && parseInt(attemptCount) >= OTP_MAX_ATTEMPTS) {
      throw new AppError(
        'OTP_LOCKED',
        429,
        'Bạn đã nhập sai OTP quá 3 lần. Vui lòng thử lại sau 15 phút.'
      );
    }

    // Sinh OTP 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Lưu vào Redis
    await redis.set(`otp:${input.phone}`, otp, { EX: OTP_TTL_SECONDS });

    // TODO: Gọi SMS provider để gửi OTP thật (Twilio, Viettel SMS Gateway, v.v.)
    console.log(`[DEV] OTP cho ${input.phone}: ${otp}`);

    return { message: 'Nếu số điện thoại tồn tại, OTP sẽ được gửi qua SMS' };
  }

  // ─────────── Reset Password (OTP Verification) ───────────

  /**
   * Xác nhận OTP và reset mật khẩu mới.
   */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const redis = await getRedisClient();

    // Kiểm tra lock
    const lockKey = `otp_attempt:${input.phone}`;
    const attemptCount = await redis.get(lockKey);
    if (attemptCount && parseInt(attemptCount) >= OTP_MAX_ATTEMPTS) {
      throw new AppError(
        'OTP_LOCKED',
        429,
        'Bạn đã nhập sai OTP quá 3 lần. Vui lòng thử lại sau 15 phút.'
      );
    }

    // Lấy OTP đã lưu
    const otpKey = `otp:${input.phone}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      throw new AppError('OTP_EXPIRED', 422, 'OTP đã hết hạn hoặc chưa được yêu cầu');
    }

    if (storedOtp !== input.otp) {
      // Tăng đếm số lần sai
      const newCount = attemptCount ? parseInt(attemptCount) + 1 : 1;
      await redis.set(lockKey, newCount.toString(), { EX: OTP_LOCK_TTL_SECONDS });

      if (newCount >= OTP_MAX_ATTEMPTS) {
        // Xóa OTP khi đã lock
        await redis.del(otpKey);
        throw new AppError(
          'OTP_LOCKED',
          429,
          'Bạn đã nhập sai OTP quá 3 lần. Vui lòng thử lại sau 15 phút.'
        );
      }

      throw new AppError('OTP_INVALID', 422, `OTP không đúng. Còn ${OTP_MAX_ATTEMPTS - newCount} lần thử.`);
    }

    // OTP đúng → xóa OTP + lock counter
    await redis.del(otpKey);
    await redis.del(lockKey);

    // Tìm user và cập nhật mật khẩu
    const user = await authRepository.findByPhone(input.phone);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'Không tìm thấy tài khoản');
    }

    const newHash = await bcrypt.hash(input.new_password, BCRYPT_SALT_ROUNDS);
    await authRepository.updatePassword(user.id, newHash);
  }
}

export const authService = new AuthService();
