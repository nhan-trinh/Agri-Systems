import path from 'path';
import { Worker, Job } from 'bullmq';
import { ExportStatus } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { bullConnection } from '../shared/queues/carbon.queue';
import { carbonRepository } from '../modules/carbon/carbon.repository';
import { CarbonCertificateJobPayload } from '../shared/queues/queue.types';
import StorageFactory from '../shared/storage/storage.factory';
import { CERTIFICATE_EXPIRY_YEARS } from '../modules/carbon/carbon.constants';

// ── Font paths (Noto Sans — full Vietnamese Unicode support) ──────────
const FONTS_DIR = path.resolve(__dirname, '../../fonts');
const FONT_REGULAR = path.join(FONTS_DIR, 'NotoSans-Regular.ttf');
const FONT_BOLD    = path.join(FONTS_DIR, 'NotoSans-Bold.ttf');

export class CarbonCertificateWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'carbon-certificate-queue',
      async (job: Job<CarbonCertificateJobPayload>) => {
        const { recordId, exportJobId } = job.data;
        console.log(`[CarbonCertificateWorker] Processing certificate PDF for record ${recordId}, job ${exportJobId}`);
        
        try {
          // 1. Fetch Carbon Record details
          const record = await carbonRepository.findCarbonRecordById(recordId);
          if (!record) {
            throw new Error(`CarbonRecord not found: ${recordId}`);
          }

          // Update ExportJob to PROCESSING
          await carbonRepository.updateExportJobStatus(exportJobId, ExportStatus.PROCESSING);

          // 2. Generate PDF Buffer using pdfkit
          const pdfBuffer = await this.generatePdfBuffer(record);

          // 3. Save File using Storage Service
          const storage = StorageFactory.getStorageService();
          const relativePath = `certificates/${record.certificate_no}.pdf`;
          const { url: downloadUrl } = await storage.saveFile(relativePath, pdfBuffer);

          // 4. Update expiry date
          const expiresAt = new Date();
          expiresAt.setFullYear(expiresAt.getFullYear() + CERTIFICATE_EXPIRY_YEARS);

          // 5. Update CarbonRecord and ExportJob
          await carbonRepository.updateCarbonRecordCertificate(recordId, downloadUrl, expiresAt);
          await carbonRepository.updateExportJobStatus(exportJobId, ExportStatus.COMPLETED, downloadUrl);

          console.log(`[CarbonCertificateWorker] Successfully generated PDF. URL: ${downloadUrl}`);
        } catch (error: any) {
          console.error(`[CarbonCertificateWorker] Job ${job.id} failed:`, error.message);
          // Mark ExportJob as FAILED
          await carbonRepository.updateExportJobStatus(exportJobId, ExportStatus.FAILED);
          throw error;
        }
      },
      { connection: bullConnection }
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[CarbonCertificateWorker] Job ${job?.id} failed permanently:`, err.message);
    });
  }

  /**
   * Helper to draw and generate a PDF in memory.
   */
  private generatePdfBuffer(record: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        // Register Vietnamese-compatible font (Noto Sans) — Helvetica lacks
        // Vietnamese diacritics (đ, ồ, ệ, ư, …).
        doc.registerFont('NotoSans', FONT_REGULAR);
        doc.registerFont('NotoSans-Bold', FONT_BOLD);

        // Set NotoSans as the default font for all subsequent text.
        doc.font('NotoSans');

        const width = doc.page.width;
        const height = doc.page.height;

        // Draw double border
        doc.rect(20, 20, width - 40, height - 40).lineWidth(3).strokeColor('#2e7d32').stroke();
        doc.rect(25, 25, width - 50, height - 50).lineWidth(1).strokeColor('#81c784').stroke();

        // Title header
        doc.moveDown(2);
        doc.font('NotoSans-Bold').fontSize(24).fillColor('#1b5e20').text('🌱 AGRITRACE CARBON', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(16).fillColor('#2e7d32').text('CHỨNG NHẬN TÍN CHỈ CARBON', { align: 'center' });
        doc.font('NotoSans'); // reset to regular
        doc.moveDown(0.8);

        const certNo = record.certificate_no || 'CARBON-MOCK-000000';
        doc.fontSize(11).fillColor('#424242').text(`Số chứng nhận: ${certNo}`, { align: 'center' });
        doc.moveDown(1);

        // Thin separator line
        doc.moveTo(50, doc.y).lineTo(width - 50, doc.y).lineWidth(1).strokeColor('#e0e0e0').stroke();
        doc.moveDown(1.5);

        // Fetching data variables safely
        const coopName = record.season?.farm_zone?.farmer?.cooperative?.name || 'N/A';
        const coopAddr = record.season?.farm_zone?.farmer?.cooperative?.address || 'N/A';
        const farmerName = record.season?.farm_zone?.farmer?.full_name || 'N/A';
        const zoneName = record.season?.farm_zone?.zone_name || 'N/A';
        const areaVal = record.season?.farm_zone?.area_sqm || 0;
        const area = areaVal.toLocaleString('vi-VN');
        const seasonName = record.season?.season_name || 'N/A';
        const cropVariety = record.season?.crop_variety || 'N/A';

        // Information Grid
        doc.fontSize(12).fillColor('#212121');
        doc.text(`Hợp tác xã:   ${coopName}`, { lineGap: 6 });
        doc.text(`Địa chỉ:      ${coopAddr}`, { lineGap: 6 });
        doc.text(`Nông dân:     ${farmerName}`, { lineGap: 6 });
        doc.text(`Vùng trồng:   ${zoneName} (${area} m²)`, { lineGap: 6 });
        doc.text(`Vụ mùa:       ${seasonName}`, { lineGap: 6 });
        doc.text(`Cây trồng:    ${cropVariety}`, { lineGap: 6 });

        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(width - 50, doc.y).lineWidth(1).strokeColor('#e0e0e0').stroke();
        doc.moveDown(1.5);

        // Credit metrics
        const credits = (record.credit_amount_tCO2e || 0).toFixed(2);
        const issuedDate = record.issued_at ? new Date(record.issued_at).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
        
        const expDateObj = record.issued_at ? new Date(record.issued_at) : new Date();
        expDateObj.setFullYear(expDateObj.getFullYear() + CERTIFICATE_EXPIRY_YEARS);
        const expiryDate = expDateObj.toLocaleDateString('vi-VN');

        doc.fontSize(14).fillColor('#1b5e20').text(`Lượng tín chỉ: ${credits} tCO2e`, { lineGap: 6 });
        doc.font('NotoSans').fontSize(11).fillColor('#424242').text(`Ngày cấp:     ${issuedDate}`, { lineGap: 4 });
        doc.text(`Hiệu lực:     ${expiryDate}`, { lineGap: 4 });

        doc.moveDown(1.5);
        doc.moveTo(50, doc.y).lineTo(width - 50, doc.y).lineWidth(1).strokeColor('#e0e0e0').stroke();
        doc.moveDown(1.5);

        // Disclaimer
        doc.fontSize(10).fillColor('#757575').text(
          'Chứng nhận này xác nhận lô nông sản trên đã được canh tác theo tiêu chuẩn carbon thấp, đóng góp vào mục tiêu giảm phát thải.',
          { align: 'center', lineGap: 4 }
        );

        doc.moveDown(2.5);
        doc.font('NotoSans-Bold').fontSize(12).fillColor('#1b5e20').text('AgriTrace Carbon — TakaTech', { align: 'center' });
        doc.font('NotoSans').fontSize(8).fillColor('#9e9e9e').text('Được cấp bởi hệ thống AgriTrace Carbon', { align: 'center' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  public async close() {
    await this.worker.close();
  }
}

export const carbonCertificateWorker = new CarbonCertificateWorker();
export default carbonCertificateWorker;
