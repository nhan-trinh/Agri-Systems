import prisma from '../../prisma/client';
import { Batch, QrCode, BatchStatus, QrStatus } from '@prisma/client';

export interface CreateBatchDbInput {
  season_id: string;
  batch_code: string;
  batch_name: string;
  total_weight_kg: number;
  quantity_qr_requested: number;
  packaging_unit: string;
  product_description?: string;
  created_by: string;
}

export interface BatchStatusUpdateData {
  checkvn_batch_id?: string;
  activated_at?: Date | null;
  activation_note?: string | null;
  recalled_at?: Date | null;
  recall_reason?: string | null;
}

export class CheckvnQrRepository {
  public async createBatch(data: CreateBatchDbInput): Promise<Batch> {
    return prisma.batch.create({
      data: {
        season_id: data.season_id,
        batch_code: data.batch_code,
        batch_name: data.batch_name,
        total_weight_kg: data.total_weight_kg,
        quantity_qr_requested: data.quantity_qr_requested,
        packaging_unit: data.packaging_unit,
        product_description: data.product_description,
        created_by: data.created_by,
        status: BatchStatus.DRAFT,
      },
    });
  }

  public async findBatchById(id: string): Promise<(Batch & { season: any; qr_codes: QrCode[] }) | null> {
    return prisma.batch.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            farm_zone: {
              include: {
                farmer: {
                  include: {
                    cooperative: true,
                  },
                },
              },
            },
          },
        },
        qr_codes: true,
      },
    }) as any;
  }

  public async findBatchByCode(batchCode: string): Promise<Batch | null> {
    return prisma.batch.findUnique({
      where: { batch_code: batchCode },
    });
  }

  public async findBatchBySeasonId(seasonId: string): Promise<Batch | null> {
    return prisma.batch.findUnique({
      where: { season_id: seasonId },
    });
  }

  public async findBatchByCheckvnId(checkvnBatchId: string): Promise<Batch | null> {
    return prisma.batch.findFirst({
      where: { checkvn_batch_id: checkvnBatchId },
    });
  }

  public async findAllBatches(filters: { cooperativeId?: string; status?: BatchStatus }): Promise<Batch[]> {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.cooperativeId) {
      where.season = {
        farm_zone: {
          farmer: {
            cooperative_id: filters.cooperativeId,
          },
        },
      };
    }

    return prisma.batch.findMany({
      where,
      include: {
        season: {
          include: {
            farm_zone: {
              include: {
                farmer: {
                  include: {
                    cooperative: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    }) as any;
  }

  public async findBatchesByCodePrefix(prefix: string): Promise<{ batch_code: string }[]> {
    return prisma.batch.findMany({
      where: {
        batch_code: {
          startsWith: prefix,
        },
      },
      select: {
        batch_code: true,
      },
    });
  }

  public async updateBatchStatus(id: string, status: BatchStatus, updateData?: BatchStatusUpdateData): Promise<Batch> {
    return prisma.batch.update({
      where: { id },
      data: {
        status,
        ...updateData,
      },
    });
  }

  public async saveQrCodesTransaction(batchId: string, qrCodes: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái batch = QR_RECEIVED
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.QR_RECEIVED,
        },
      });

      // 2. Lưu các mã QR ở trạng thái INACTIVE
      const qrData = qrCodes.map((code) => ({
        batch_id: batchId,
        code,
        status: QrStatus.INACTIVE,
      }));

      await tx.qrCode.createMany({
        data: qrData,
      });
    });
  }

  public async activateBatchTransaction(batchId: string, note?: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      // 1. Cập nhật batch -> ACTIVE
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.ACTIVE,
          activated_at: now,
          activation_note: note,
        },
      });

      // 2. Cập nhật all qr_codes -> ACTIVE
      await tx.qrCode.updateMany({
        where: { batch_id: batchId },
        data: {
          status: QrStatus.ACTIVE,
          activated_at: now,
        },
      });
    });
  }

  public async recallBatchTransaction(batchId: string, reason: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const now = new Date();
      // 1. Cập nhật batch -> RECALLED
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: BatchStatus.RECALLED,
          recalled_at: now,
          recall_reason: reason,
        },
      });

      // 2. Cập nhật all qr_codes -> RECALLED
      await tx.qrCode.updateMany({
        where: { batch_id: batchId },
        data: {
          status: QrStatus.RECALLED,
          recalled_at: now,
        },
      });
    });
  }

  public async getBatchQrCodes(batchId: string): Promise<QrCode[]> {
    return prisma.qrCode.findMany({
      where: { batch_id: batchId },
      orderBy: { created_at: 'asc' },
    });
  }

  public async findQrCodeWithTrace(qrCodeValue: string): Promise<(QrCode & { batch: any }) | null> {
    return prisma.qrCode.findUnique({
      where: { code: qrCodeValue },
      include: {
        batch: {
          include: {
            season: {
              include: {
                farm_zone: {
                  include: {
                    farmer: {
                      include: {
                        cooperative: true,
                      },
                    },
                  },
                },
                farming_logs: {
                  orderBy: {
                    activity_date: 'asc',
                  },
                },
              },
            },
          },
        },
      },
    }) as any;
  }

  public async incrementQrScanCount(qrCodeId: string): Promise<void> {
    await prisma.qrCode.update({
      where: { id: qrCodeId },
      data: {
        scan_count: { increment: 1 },
        last_scanned_at: new Date(),
      },
    });
  }
}

export const checkvnQrRepository = new CheckvnQrRepository();
