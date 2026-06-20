export interface CarbonCalculationJobPayload {
  seasonId: string;
}

export interface CarbonCertificateJobPayload {
  recordId: string;
  exportJobId: string;
}

export interface OcrDocumentJobPayload {
  document_id: string;
  batch_id: string;
  cooperative_id: string;
  object_key: string;
  /** User-provided classification hint: 'FARMING_LOGBOOK' | 'MATERIAL_INVOICE' | 'AUTO'. */
  hint?: string;
  /** Pre-selected season id (only relevant for FARMING_LOGBOOK drafts). */
  season_id?: string;
}
