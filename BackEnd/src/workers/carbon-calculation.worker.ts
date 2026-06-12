import { Worker, Job } from 'bullmq';
import { bullConnection } from '../shared/queues/carbon.queue';
import { carbonRecordService } from '../modules/carbon/carbon.record.service';
import { CarbonCalculationJobPayload } from '../shared/queues/queue.types';

export class CarbonCalculationWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'carbon-calculation-queue',
      async (job: Job<CarbonCalculationJobPayload>) => {
        const { seasonId } = job.data;
        console.log(`[CarbonCalculationWorker] Processing job ${job.id} for season ${seasonId}`);
        try {
          await carbonRecordService.calculateAndSaveCarbonRecord(seasonId);
          console.log(`[CarbonCalculationWorker] Completed job ${job.id} for season ${seasonId}`);
        } catch (error: any) {
          console.error(`[CarbonCalculationWorker] Job ${job.id} failed:`, error.message);
          throw error; // throw to let BullMQ trigger retry policy
        }
      },
      { connection: bullConnection }
    );

    this.worker.on('failed', (job, err) => {
      console.error(`[CarbonCalculationWorker] Job ${job?.id} failed permanently:`, err.message);
    });
  }

  public async close() {
    await this.worker.close();
  }
}

export const carbonCalculationWorker = new CarbonCalculationWorker();
export default carbonCalculationWorker;
