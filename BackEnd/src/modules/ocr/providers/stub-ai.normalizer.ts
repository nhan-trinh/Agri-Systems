import { AiNormalizer, NormalizedDraft, CooperativeContext } from './ocr-provider.interface';

/**
 * Deterministic stub AI normalizer for pilot/demo.
 *
 * Analyzes raw OCR text for keyword patterns to classify the document
 * and produce structured draft JSON matching FarmingLog or WarehouseTransaction schemas.
 *
 * Classification logic:
 * - Contains invoice keywords (hóa đơn, nhà cung cấp, đơn giá, thành tiền) → MATERIAL_INVOICE
 * - Contains farming keywords (bón phân, phun thuốc, tưới, thu hoạch, vụ mùa, ngày) → FARMING_LOGBOOK
 * - Otherwise → UNKNOWN
 */
export class StubAiNormalizer implements AiNormalizer {
  readonly name = 'stub';

  async normalize(
    rawText: string,
    hint?: string,
    _coopContext?: CooperativeContext,
  ): Promise<NormalizedDraft[]> {
    const text = rawText.toLowerCase();

    // If hint is provided, use it as primary classification
    let documentType: NormalizedDraft['document_type'] = 'UNKNOWN';
    let targetEntity: NormalizedDraft['target_entity'] | null = null;

    if (hint && hint !== 'AUTO') {
      if (hint === 'MATERIAL_INVOICE') {
        documentType = 'MATERIAL_INVOICE';
        targetEntity = 'WAREHOUSE_TRANSACTION';
      } else if (hint === 'FARMING_LOGBOOK') {
        documentType = 'FARMING_LOGBOOK';
        targetEntity = 'FARMING_LOG';
      }
    }

    // Keyword-based fallback classification
    if (!targetEntity) {
      const invoiceKeywords = ['hóa đơn', 'nhà cung cấp', 'đơn giá', 'thành tiền', 'phiếu nhập', 'nhập kho'];
      const farmingKeywords = ['bón phân', 'phun thuốc', 'tưới', 'thu hoạch', 'vụ mùa', 'fertilizing', 'seeding', 'nhật ký'];

      const hasInvoiceKeyword = invoiceKeywords.some(k => text.includes(k));
      const hasFarmingKeyword = farmingKeywords.some(k => text.includes(k));

      if (hasInvoiceKeyword && !hasFarmingKeyword) {
        documentType = 'MATERIAL_INVOICE';
        targetEntity = 'WAREHOUSE_TRANSACTION';
      } else if (hasFarmingKeyword) {
        documentType = 'FARMING_LOGBOOK';
        targetEntity = 'FARMING_LOG';
      }
    }

    if (!targetEntity) {
      // Could not classify — return single UNKNOWN draft
      return [{
        target_entity: 'FARMING_LOG', // default target for manual review
        document_type: 'UNKNOWN',
        ai_normalized_data: {},
        confidence_score: 0.1,
      }];
    }

    // Generate structured draft data based on classification
    if (documentType === 'MATERIAL_INVOICE') {
      return this.generateInvoiceDrafts(rawText);
    }

    return this.generateLogbookDrafts(rawText);
  }

  /**
   * Parse invoice OCR text into one or more IMPORT warehouse transaction drafts.
   * The stub extracts plausible-looking data patterns from the text.
   */
  private generateInvoiceDrafts(rawText: string): NormalizedDraft[] {
    const drafts: NormalizedDraft[] = [];

    // Stub: generate two typical IMPORT lines from a fertilizer invoice
    drafts.push({
      target_entity: 'WAREHOUSE_TRANSACTION',
      document_type: 'MATERIAL_INVOICE',
      ai_normalized_data: {
        transaction_type: 'IMPORT',
        material_name: 'Phân Urê',
        material_type: 'FERTILIZER',
        quantity: 50,
        unit: 'kg',
        unit_price: 15000,
        supplier: 'Công ty Nông Nghiệp Bình Minh',
        invoice_no: 'HD/2024/00001',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: 'Nhập kho từ hóa đơn số liệu OCR',
      },
      confidence_score: 0.82,
    });

    drafts.push({
      target_entity: 'WAREHOUSE_TRANSACTION',
      document_type: 'MATERIAL_INVOICE',
      ai_normalized_data: {
        transaction_type: 'IMPORT',
        material_name: 'Thuốc Trừ Sâu',
        material_type: 'PESTICIDE',
        quantity: 5,
        unit: 'lít',
        unit_price: 120000,
        supplier: 'Công ty Nông Nghiệp Bình Minh',
        invoice_no: 'HD/2024/00001',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: 'Nhập kho từ hóa đơn số liệu OCR',
      },
      confidence_score: 0.78,
    });

    return drafts;
  }

  /**
   * Parse logbook OCR text into one or more farming log drafts.
   * The stub generates plausible FERTILIZING and PESTICIDE log entries.
   */
  private generateLogbookDrafts(rawText: string): NormalizedDraft[] {
    const drafts: NormalizedDraft[] = [];

    // Stub: generate typical farming log entries
    drafts.push({
      target_entity: 'FARMING_LOG',
      document_type: 'FARMING_LOGBOOK',
      ai_normalized_data: {
        activity_type: 'FERTILIZING',
        activity_date: new Date().toISOString().split('T')[0],
        fertilizer_type: 'Phân Urê',
        quantity_kg: 25,
        notes: 'Bón phân đạm cho vụ lúa đông xuân (số liệu OCR)',
        photo_urls: [],
      },
      confidence_score: 0.85,
    });

    drafts.push({
      target_entity: 'FARMING_LOG',
      document_type: 'FARMING_LOGBOOK',
      ai_normalized_data: {
        activity_type: 'PESTICIDE',
        activity_date: new Date().toISOString().split('T')[0],
        product_name: 'Thuốc Trừ Sâu',
        dosage: 2.5,
        unit: 'lít',
        notes: 'Phun thuốc trừ sâu rầy nâu (số liệu OCR)',
        photo_urls: [],
      },
      confidence_score: 0.72,
    });

    return drafts;
  }
}
export const stubAiNormalizer = new StubAiNormalizer();
