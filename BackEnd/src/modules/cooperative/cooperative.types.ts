import { Cooperative, Prisma } from '@prisma/client';
import { PaginationMeta } from '../../shared/utils/response.helper';

// ==================== REPOSITORY PAYLOAD TYPE ====================

export type CooperativeWithStats = Cooperative;

// ==================== REPOSITORY INPUT TYPES ====================

export interface FindAllFilters {
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
  skip: number;
  take: number;
}

// ==================== SERVICE INPUT/OUTPUT TYPES ====================

export interface CooperativeListResult {
  data: Cooperative[];
  meta: PaginationMeta;
}

// Re-export for convenience
export { Cooperative, Prisma };
