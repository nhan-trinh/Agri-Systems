import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Attempting to connect to database...");
    await prisma.$connect();
    console.log("SUCCESS: Connected to database successfully!");
  } catch (err) {
    console.error("ERROR: Failed to connect to database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
