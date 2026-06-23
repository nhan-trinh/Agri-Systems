import prisma from '../../prisma/client';
import { User, UserRole, Prisma } from '@prisma/client';
import { ListUsersQueryDtoType } from './user.dto';

// ─────────────────────────────────────────────────────
// Repository — chỉ chứa logic truy vấn DB, không chứa business logic.
// ─────────────────────────────────────────────────────

export interface FindManyFilters {
  role?: UserRole;
  cooperativeId?: string;
  isActive?: boolean;
  search?: string;
  skip: number;
  take: number;
}

export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { phone } });
  }

  /**
   * Paginated user search with optional filters. SUPER_ADMIN passes no cooperative
   * filter; HTX_MANAGER always filters to their own cooperative (enforced in service).
   */
  async findMany(filters: FindManyFilters): Promise<{ data: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {};

    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.cooperativeId) {
      where.cooperative_id = filters.cooperativeId;
    }
    if (filters.isActive !== undefined) {
      where.is_active = filters.isActive;
    }
    if (filters.search) {
      where.OR = [
        { phone: { contains: filters.search, mode: 'insensitive' } },
        { display_name: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { cooperative: true },
        orderBy: { created_at: 'desc' },
        skip: filters.skip,
        take: filters.take,
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Create an HTX_MANAGER user.
   *
   * farmer_id and zalo_id are intentionally ABSENT from the input type — this is a
   * compile-time guarantee that the repository cannot set them (only the farmer
   * module sets farmer_id; only Zalo auth sets zalo_id).
   */
  async createManager(data: {
    phone: string;
    display_name: string;
    password_hash: string;
    cooperative_id: string;
    role: UserRole;                 // always HTX_MANAGER when called from this service
    is_first_login: boolean;
    is_active: boolean;
  }): Promise<User> {
    return prisma.user.create({
      data: {
        phone: data.phone,
        display_name: data.display_name,
        password_hash: data.password_hash,
        cooperative_id: data.cooperative_id,
        role: data.role,
        is_first_login: data.is_first_login,
        is_active: data.is_active,
        // farmer_id and zalo_id are never set here — left null by default.
      },
      include: { cooperative: true },
    });
  }

  async updateStatus(id: string, isActive: boolean): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { is_active: isActive },
      include: { cooperative: true },
    });
  }

  /**
   * Update password hash and reset the first-login flag so the password-change
   * prompt reappears. Used by resetPassword.
   */
  async updatePasswordHash(id: string, passwordHash: string, isFirstLogin: boolean): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { password_hash: passwordHash, is_first_login: isFirstLogin },
    });
  }
}

export const userRepository = new UserRepository();
