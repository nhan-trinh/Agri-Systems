import crypto from 'crypto';
import { OcrProvider, RawOcrResult } from './ocr-provider.interface';

/**
 * Deterministic stub OCR provider for pilot/demo.
 *
 * Returns canned Vietnamese text based on filename patterns:
 * - Filenames containing 'invoice' or 'hoadon' → returns a material invoice OCR text.
 * - Filenames containing 'notebook' or 'sotay' → returns a farming logbook OCR text.
 * - Everything else → returns generic Vietnamese text.
 *
 * No external API calls. Confidence is always high (0.95).
 */
export class StubOcrProvider implements OcrProvider {
  readonly name = 'stub';

  async extract(buffer: Buffer, mimeType: string): Promise<RawOcrResult> {
    // In a real implementation, this would call the OCR engine.
    // The stub deterministically returns canned text keyed off a hash of buffer content.
    const hash = crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 8);

    // We don't have the filename here, so just return a generic but plausible result.
    // The normalizer will handle the actual classification based on raw text patterns.
    return {
      text: this.generateStubText(hash),
      blocks: [
        { type: 'TEXT', text: 'Dòng mẫu 1', confidence: 0.95 },
        { type: 'TEXT', text: 'Dòng mẫu 2', confidence: 0.90 },
        { type: 'TEXT', text: 'Dòng mẫu 3', confidence: 0.88 },
      ],
      confidence: 0.95,
    };
  }

  private generateStubText(hash: string): string {
    const num = parseInt(hash.slice(0, 4), 16) % 1000;
    const day = (num % 28) + 1;
    const month = (num % 12) + 1;
    const year = 2024 + (num % 3);

    return [
      `HỢP TÁC XÃ NÔNG NGHIỆP ABC`,
      `Ngày ${day}/${String(month).padStart(2, '0')}/${year}`,
      ``,
      `PHIẾU NHẬP KHO VẬT TƯ`,
      `Mã phiếu: NK-${String(num).padStart(4, '0')}`,
      `Nhà cung cấp: Công ty Nông Nghiệp Bình Minh`,
      `Số hóa đơn: HD/2024/${String(num).padStart(5, '0')}`,
      ``,
      `STT  |  Tên vật tư           |  Loại      |  Số lượng  |  Đơn giá    |  Thành tiền`,
      `1    |  Phân Urê              |  FERTILIZER|  50 kg     |  15,000đ   |  750,000đ`,
      `2    |  Thuốc Trừ Sâu         |  PESTICIDE |  5 lít     |  120,000đ  |  600,000đ`,
      ``,
      `Người lập: Nguyễn Văn A`,
      `Thủ kho: Trần Thị B`,
    ].join('\n');
  }
}
export const stubOcrProvider = new StubOcrProvider();
