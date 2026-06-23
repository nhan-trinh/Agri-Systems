import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { userRepository, FindManyFilters } from './user.repository';
import { cooperativeRepository } from '../cooperative/cooperative.repository';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from '../auth/auth.types';
import { User, UserRole } from '@prisma/client';
import {
  CreateManagerDtoType,
  ListUsersQueryDtoType,
} from './user.dto';
import { PaginationMeta } from '../../shared/utils/response.helper';

// ─────────────────────────────────────────────────────
// User Service — SUPER_ADMIN user management with RBAC guards.
//
// Deliberately NOT cached (unlike farmer/cooperative): a locked user appearing stale
// for 5 minutes, or a just-created manager not appearing, is a correctness/security
// problem. User management is low-volume, so the cache trade-off isn't worth it.
// ─────────────────────────────────────────────────────

// Must match the auth module's cost factor — read from a single source of truth.
const BCRYPT_SALT_ROUNDS = 12;
const TEMP_PASSWORD_LENGTH = 12;

export interface PaginatedUsersResult {
  data: User[];
  meta: PaginationMeta;
}

export class UserService {

  // ══════════════════════════════════════════════════
  // CREATE MANAGER
  // ══════════════════════════════════════════════════

  /**
   * Create a new HTX_MANAGER user. Returns the plaintext temporary password exactly once.
   *
   * The `role` is hardcoded to HTX_MANAGER — never accepted from input — so this
   * endpoint cannot be repurposed to create SUPER_ADMIN accounts.
   */
  async createManager(data: CreateManagerDtoType): Promise<{ user: User; temporaryPassword: string }> {
    // 1. Verify the target cooperative exists and is active.
    const coop = await cooperativeRepository.findById(data.cooperative_id);
    if (!coop) {
      throw new AppError('COOPERATIVE_NOT_FOUND', 404, 'Không tìm thấy Hợp tác xã tương ứng');
    }
    if (!coop.is_active) {
      throw new AppError('COOPERATIVE_INACTIVE', 422, 'Hợp tác xã đang bị khóa, không thể tạo quản lý mới');
    }

    // 2. Phone must be unique across the entire User table (login identifier).
    const existing = await userRepository.findByPhone(data.phone);
    if (existing) {
      throw new AppError('USER_PHONE_DUPLICATE', 409, 'Số điện thoại này đã được sử dụng cho tài khoản khác');
    }

    // 3. Generate a temporary password (never stored in plaintext).
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

    // 4. Create the user. role is hardcoded — not from the DTO.
    const user = await userRepository.createManager({
      phone: data.phone,
      display_name: data.full_name,
      password_hash: passwordHash,
      cooperative_id: data.cooperative_id,
      role: UserRole.HTX_MANAGER,
      is_first_login: true,
      is_active: true,
      // farmer_id and zalo_id are never set — left null at the schema level.
    });

    return { user, temporaryPassword };
  }

  // ══════════════════════════════════════════════════
  // LIST USERS
  // ══════════════════════════════════════════════════

  async listUsers(
    query: ListUsersQueryDtoType,
    requestingUser: JwtPayload,
  ): Promise<PaginatedUsersResult> {
    const filters: FindManyFilters = {
      role: query.role as UserRole | undefined,
      isActive: query.is_active,
      search: query.search,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    };

    // RBAC: HTX_MANAGER can only see members of their own cooperative, regardless of
    // what cooperative_id they pass in the query. SUPER_ADMIN sees all.
    if (requestingUser.role === UserRole.HTX_MANAGER) {
      if (!requestingUser.cooperativeId) {
        throw new AppError('FORBIDDEN', 403, 'Tài khoản của bạn không thuộc Hợp tác xã nào');
      }
      filters.cooperativeId = requestingUser.cooperativeId; // forced, overrides any query param
    } else if (query.cooperative_id) {
      filters.cooperativeId = query.cooperative_id;
    }

    const { data, total } = await userRepository.findMany(filters);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  // ══════════════════════════════════════════════════
  // GET USER BY ID
  // ══════════════════════════════════════════════════

  async getUserById(id: string, requestingUser: JwtPayload): Promise<User> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError('USER_NOT_FOUND', 404, 'Không tìm thấy tài khoản tương ứng');
    }

    // RBAC: HTX_MANAGER can only access users in their own cooperative.
    // Return 403 (not 404) on cross-cooperative access — 404 would leak existence.
    if (
      requestingUser.role === UserRole.HTX_MANAGER &&
      user.cooperative_id !== requestingUser.cooperativeId
    ) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền xem tài khoản này');
    }

    return user;
  }

  // ══════════════════════════════════════════════════
  // SET USER STATUS (lock / unlock)
  // ══════════════════════════════════════════════════

  async setUserStatus(
    targetUserId: string,
    isActive: boolean,
    requestingUser: JwtPayload,
  ): Promise<User> {
    // Only SUPER_ADMIN can change account status.
    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      throw new AppError('FORBIDDEN', 403, 'Chỉ SUPER_ADMIN mới có quyền khóa/mở tài khoản');
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new AppError('USER_NOT_FOUND', 404, 'Không tìm thấy tài khoản tương ứng');
    }

    // Locking guards (only matter when deactivating). Self-lock is checked first
    // because it is the more specific, user-actionable error when both conditions hold
    // (a SUPER_ADMIN locking their own account should see "can't lock self", not the
    // generic "can't lock a SUPER_ADMIN" message).
    if (!isActive) {
      // Cannot lock your own account — prevents self-lockout.
      if (target.id === requestingUser.userId) {
        throw new AppError('CANNOT_LOCK_SELF', 422, 'Không thể khóa chính tài khoản của bạn');
      }
      // Cannot lock a SUPER_ADMIN account — protects the system operator.
      if (target.role === UserRole.SUPER_ADMIN) {
        throw new AppError('CANNOT_LOCK_SUPER_ADMIN', 422, 'Không thể khóa tài khoản SUPER_ADMIN');
      }
    }

    return userRepository.updateStatus(targetUserId, isActive);
  }

  // ══════════════════════════════════════════════════
  // RESET PASSWORD
  // ══════════════════════════════════════════════════

  /**
   * Reset a user's password to a new system-generated temporary value.
   * Resets is_first_login = true so the password-change prompt reappears.
   * The account is NOT locked during/after the reset (Clarification #6).
   */
  async resetPassword(
    targetUserId: string,
    requestingUser: JwtPayload,
  ): Promise<{ temporaryPassword: string }> {
    if (requestingUser.role !== UserRole.SUPER_ADMIN) {
      throw new AppError('FORBIDDEN', 403, 'Chỉ SUPER_ADMIN mới có quyền đặt lại mật khẩu');
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) {
      throw new AppError('USER_NOT_FOUND', 404, 'Không tìm thấy tài khoản tương ứng');
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

    await userRepository.updatePasswordHash(targetUserId, passwordHash, true);

    return { temporaryPassword };
  }

  // ══════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════

  /**
   * Generate a cryptographically-strong, URL-safe temporary password.
   * Never logged, returned once to the caller, stored only as a bcrypt hash.
   */
  private generateTemporaryPassword(): string {
    // base64url is URL-safe and excludes ambiguous characters (+/=).
    return crypto.randomBytes(16).toString('base64url').slice(0, TEMP_PASSWORD_LENGTH);
  }
}

export const userService = new UserService();
