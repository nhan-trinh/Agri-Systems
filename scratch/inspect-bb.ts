import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const season = await prisma.season.findFirst({
    where: { season_name: 'BB' },
    include: {
      farming_logs: true,
      carbon_record: true,
    },
  });

  console.log('=== SEASON BB ===');
  console.log(JSON.stringify(season, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
