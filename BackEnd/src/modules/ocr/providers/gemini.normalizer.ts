import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiNormalizer, CooperativeContext, NormalizedDraft } from './ocr-provider.interface';

export class GeminiNormalizer implements AiNormalizer {
  readonly name = 'gemini-normalizer';
  private genAI: GoogleGenerativeAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY environment variable');
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }

  async normalize(
    rawText: string,
    hint?: string,
    coopContext?: CooperativeContext,
  ): Promise<NormalizedDraft[]> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = this.buildPrompt(rawText, hint, coopContext);

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const jsonText = response.response.text();
    try {
      return JSON.parse(jsonText) as NormalizedDraft[];
    } catch (error) {
      console.error('[GeminiNormalizer] Failed to parse Gemini response JSON:', jsonText);
      throw new Error('Gemini response was not a valid NormalizedDraft[] JSON structure');
    }
  }

  private buildPrompt(rawText: string, hint?: string, coopContext?: CooperativeContext): string {
    const materialsList = coopContext?.materialNames?.join(', ') || 'Không có';
    const seasonsList = coopContext?.seasons?.map(s => `ID: ${s.id}, Tên: ${s.name}, Vùng: ${s.zoneName}`).join('; ') || 'Không có';

    return `
Bạn là một trợ lý AI chuyên phân tích dữ liệu hóa đơn nhập xuất kho vật tư và nhật ký canh tác nông nghiệp.
Nhiệm vụ của bạn là nhận vào văn bản thô (raw OCR text) được quét từ một tài liệu và trích xuất/chuẩn hóa dữ liệu sang dạng cấu trúc JSON.

YÊU CẦU:
1. Bạn BẮT BUỘC phải trả về một mảng JSON có kiểu dữ liệu là NormalizedDraft[]:
\`\`\`ts
interface NormalizedDraft {
  target_entity: 'FARMING_LOG' | 'WAREHOUSE_TRANSACTION';
  document_type: 'FARMING_LOGBOOK' | 'MATERIAL_INVOICE' | 'UNKNOWN';
  ai_normalized_data: Record<string, any>; // xem chi tiết Schema bên dưới
  confidence_score: number; // Điểm tin cậy từ 0.0 đến 1.0
}
\`\`\`

2. Phân loại thực thể đích (target_entity):
- Nếu tài liệu mô tả các hoạt động canh tác (ví dụ: bón phân, tưới nước, thu hoạch, phun thuốc trừ sâu), target_entity = 'FARMING_LOG' và document_type = 'FARMING_LOGBOOK'.
- Nếu tài liệu mô tả phiếu nhập kho, phiếu xuất kho, mua bán hóa đơn vật tư nông nghiệp, target_entity = 'WAREHOUSE_TRANSACTION' và document_type = 'MATERIAL_INVOICE'.

3. Định nghĩa Schema cho trường \`ai_normalized_data\`:
- Với FARMING_LOG (Nhật ký canh tác):
  * activity_date: Định dạng chuỗi ngày ISO 8601 (YYYY-MM-DD). Trích xuất từ tài liệu hoặc lấy ngày hiện tại nếu không thấy.
  * activity_type: Chỉ chấp nhận các giá trị: 'FERTILIZING', 'PESTICIDE', 'IRRIGATION', 'HARVESTING'.
  * notes: Tóm tắt hoạt động bằng tiếng Việt.
  * season_id: ID vụ mùa tương ứng (Ưu tiên so khớp từ danh sách Vụ mùa HTX được cung cấp).
  * material_id: ID vật tư sử dụng (nếu có và trùng khớp trong danh mục HTX).
  * Nếu activity_type = 'FERTILIZING':
    - fertilizer_type: Tên loại phân bón sử dụng.
    - quantity_kg: Số lượng phân bón (số thực).
  * Nếu activity_type = 'PESTICIDE':
    - product_name: Tên thuốc bảo vệ thực vật.
    - dosage: Liều lượng pha/sử dụng.
    - unit: Đơn vị tính (lít, chai, ml).
  * Nếu activity_type = 'IRRIGATION':
    - water_volume_m3: Thể tích nước m3 (số thực).
    - duration_hours: Thời gian tưới (giờ, số thực).
  * Nếu activity_type = 'HARVESTING':
    - yield_kg: Sản lượng thu hoạch (kg, số thực).
    - harvest_method: Phương pháp thu hoạch (ví dụ: Thủ công, Máy gặt).

- Với WAREHOUSE_TRANSACTION (Giao dịch kho):
  * transaction_type: Chỉ chấp nhận: 'IMPORT' hoặc 'EXPORT'.
  * transaction_date: Định dạng ISO 8601 (YYYY-MM-DD).
  * material_id: ID vật tư nông nghiệp (Ưu tiên khớp từ danh sách vật tư HTX được cung cấp).
  * quantity: Số lượng giao dịch (số thực).
  * notes: Ghi chú tiếng Việt.
  * Nếu transaction_type = 'IMPORT':
    - unit_price: Đơn giá vật tư (số thực, lớn hơn 0).
    - supplier: Tên nhà cung cấp trích xuất từ hóa đơn.
    - invoice_no: Số hóa đơn hoặc mã phiếu nhập.
    - expiry_date: Hạn sử dụng (nếu có, YYYY-MM-DD).
  * Nếu transaction_type = 'EXPORT':
    - recipient_farmer_id: ID nông dân nhận (nếu tìm thấy).
    - purpose: Mục đích xuất kho (ít nhất 5 ký tự).

4. THÔNG TIN BỔ TRỢ HỢP TÁC XÃ (Dùng để so khớp):
- Danh sách tên vật tư hiện có trong HTX: [ ${materialsList} ]
- Danh sách Vụ mùa hiện có trong HTX: [ ${seasonsList} ]
- Gợi ý loại tài liệu (hint): ${hint || 'AUTO'}

VĂN BẢN OCR THÔ CẦN PHÂN TÍCH:
----------------------------------
${rawText}
----------------------------------

LƯU Ý QUAN TRỌNG: Không thêm bất kỳ text giải thích hay định dạng markdown \`\`\`json \`\`\` nào ngoài chuỗi mảng JSON thuần túy hợp lệ.
`;
  }
}
