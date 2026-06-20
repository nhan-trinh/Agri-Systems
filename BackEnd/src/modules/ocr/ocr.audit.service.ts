import prisma from '../../prisma/client';
import { Prisma } from '@prisma/client';

/**
 * OcrAuditService — stores raw-vs-confirmed diffs and reviewer actions.
 * Keeps an immutable trail of every edit/confirm/reject for traceability (BR-007-2).
 */
export class OcrAuditService {
  /**
   * Computes a shallow field-level diff between two objects.
   * Returns an array of { field, before, after }.
   */
  public computeDiff(
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
  ): Array<{ field: string; before: unknown; after: unknown }> {
    const allKeys = new Set([
      ...(before ? Object.keys(before) : []),
      ...(after ? Object.keys(after) : []),
    ]);

    const diff: Array<{ field: string; before: unknown; after: unknown }> = [];
    for (const field of allKeys) {
      const b = before?.[field];
      const a = after?.[field];
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        diff.push({ field, before: b ?? null, after: a ?? null });
      }
    }
    return diff;
  }

  public async log(params: {
    document_id: string;
    actor_user_id: string;
    action: string;
    before_data?: Record<string, unknown> | null;
    after_data?: Record<string, unknown> | null;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    const diff = this.computeDiff(
      params.before_data ?? null,
      params.after_data ?? null,
    );

    const data: Prisma.OcrAuditLogUncheckedCreateInput = {
      document_id: params.document_id,
      actor_user_id: params.actor_user_id,
      action: params.action,
      before_data: (params.before_data ?? null) as Prisma.InputJsonValue,
      after_data: (params.after_data ?? null) as Prisma.InputJsonValue,
      diff: diff as unknown as Prisma.InputJsonValue,
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
    };

    await prisma.ocrAuditLog.create({ data });
  }
}

export const ocrAuditService = new OcrAuditService();
