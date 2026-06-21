-- Harvest Warehouse: DB-level safety constraint (FR-05 belt-and-suspenders).
--
-- The application layer already prevents negative stock inside createEntryInTx,
-- but this CHECK makes the invariant impossible to violate even via raw SQL,
-- a migration, or a future code path that bypasses the service.
--
-- Prisma schema language does not support CHECK constraints, so this is applied
-- out-of-band via:  npx prisma db execute --file prisma/sql/harvest_stock_nonnegative.sql
--
-- It is safe to run repeatedly (idempotent): IF NOT EXISTS guards each step.
-- Re-run it after every `prisma db push` that recreates the HarvestStockItem table.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'harvest_stock_item_current_stock_nonnegative'
  ) THEN
    ALTER TABLE "HarvestStockItem"
      ADD CONSTRAINT harvest_stock_item_current_stock_nonnegative
      CHECK ("current_stock" >= 0);
  END IF;
END $$;
