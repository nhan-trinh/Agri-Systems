/**
 * OCR Provider interface — abstraction over different OCR engines.
 * Implementations: StubOcrProvider (demo), future GoogleVisionProvider.
 */
export interface OcrProvider {
  /** Human-readable provider name for logging and audit. */
  readonly name: string;

  /**
   * Extract raw text and layout from an image/PDF buffer.
   * @param buffer File bytes (JPEG, PNG, or PDF)
   * @param mimeType e.g. 'image/jpeg', 'application/pdf'
   */
  extract(buffer: Buffer, mimeType: string): Promise<RawOcrResult>;
}

export interface RawOcrResult {
  /** Full extracted text content. */
  text: string;
  /** Structured blocks / lines / words with bounding boxes (provider-specific). */
  blocks?: unknown[];
  /** Overall confidence score 0–1 from the provider. */
  confidence?: number;
}

/**
 * AI Normalizer interface — classifies document type and maps raw OCR text
 * into structured draft JSON that matches system domain schemas.
 * Implementations: StubAiNormalizer (demo), future GeminiNormalizer.
 */
export interface AiNormalizer {
  /** Human-readable normalizer name. */
  readonly name: string;

  /**
   * Classify the document and produce structured draft records.
   * @param rawText The raw OCR text output.
   * @param hint Optional user-provided hint: 'FARMING_LOGBOOK' | 'MATERIAL_INVOICE' | 'AUTO'.
   * @param coopContext Cooperative context for fuzzy matching (materials, seasons).
   */
  normalize(
    rawText: string,
    hint?: string,
    coopContext?: CooperativeContext,
  ): Promise<NormalizedDraft[]>;
}

export interface CooperativeContext {
  cooperativeId: string;
  /** Known material names in this cooperative (for fuzzy matching). */
  materialNames?: string[];
  /** Active season ids/names in this cooperative (for logbook matching). */
  seasons?: { id: string; name: string; zoneName: string }[];
}

export interface NormalizedDraft {
  /** Which domain entity this draft maps to. */
  target_entity: 'FARMING_LOG' | 'WAREHOUSE_TRANSACTION';
  /** Detected document type. */
  document_type: 'FARMING_LOGBOOK' | 'MATERIAL_INVOICE' | 'UNKNOWN';
  /** AI-structured data matching the target entity schema. */
  ai_normalized_data: Record<string, unknown>;
  /** Confidence score 0–1 (lower = needs more manual review). */
  confidence_score: number;
}
