import prisma from './prisma/client';
import { carbonRecordService } from './modules/carbon/carbon.record.service';

async function main() {
  const seasons = await prisma.season.findMany({
    where: { status: 'COMPLETED' },
    include: { carbon_record: true },
  });

  console.log(`Found ${seasons.length} completed seasons to process.`);

  for (const season of seasons) {
    console.log(`Processing season "${season.season_name}" (ID: ${season.id})...`);
    if (season.carbon_record) {
      if (season.carbon_record.status === 'DRAFT') {
        console.log(`Deleting existing DRAFT carbon record ID: ${season.carbon_record.id}...`);
        await prisma.carbonRecord.delete({ where: { id: season.carbon_record.id } });
      } else {
        console.log(`Carbon record status is ${season.carbon_record.status}. Skipping.`);
        continue;
      }
    }
    
    console.log('Calculating new carbon record...');
    const record = await carbonRecordService.calculateAndSaveCarbonRecord(season.id);
    console.log(`Saved new CarbonRecord:`, JSON.stringify(record, null, 2));
  }
  
  console.log('=== Recalculation Complete ===');
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
