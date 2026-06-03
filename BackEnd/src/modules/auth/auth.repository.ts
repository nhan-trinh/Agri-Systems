import prisma from '../../prisma/client';
import { User, UserRole } from '@prisma/client';

export class AuthRepository {
  /**
   * Tìm user theo Zalo ID
   */
  async findByZaloId(zaloId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { zalo_id: zaloId },
    });
  }

  /**
   * Tìm user theo số điện thoại
   */
  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  /**
   * Tìm user theo ID
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Gắn zalo_id vào user đã tồn tại (map qua SĐT)
   */
  async linkZaloId(
    userId: string,
    zaloId: string,
    zaloName: string | null,
    avatarUrl: string | null
  ): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        zalo_id: zaloId,
        zalo_name: zaloName,
        avatar_url: avatarUrl,
      },
    });
  }

  /**
   * Cập nhật thời gian đăng nhập cuối
   */
  async updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { last_login_at: new Date() },
    });
  }

  /**
   * Cập nhật mật khẩu
   */
  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        is_first_login: false,
      },
    });
  }

  /**
   * Đánh dấu đã đổi mật khẩu lần đầu
   */
  async clearFirstLoginFlag(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { is_first_login: false },
    });
  }
}

export const authRepository = new AuthRepository();
