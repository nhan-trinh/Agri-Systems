-- Farming Log: enforce BR-003-7 (only ONE HARVESTING log per season) at the DB level.
--
-- The service layer checks hasHarvestingLog() before insert, but that check-then-insert
-- is a TOCTOU race: two concurrent requests can both pass the check and both insert.
-- This partial unique index makes the "at most one non-deleted harvest per season"
-- invariant impossible to violate, even under concurrency or via raw SQL.
--
-- Only active (non-soft-deleted) HARVESTING rows are constrained — soft-deleted
-- harvests are excluded via the WHERE filter, so re-harvesting after a correction
-- (delete old log → create new) still works.
--
-- Prisma schema cannot express a filtered unique index, so this is applied out-of-band:
--   npx prisma db execute --file prisma/sql/farming_log_single_harvest.sql
--
-- Idempotent: CREATE UNIQUE INDEX IF NOT EXISTS. Re-run after any `prisma db push`
-- that recreates the FarmingLog table.

CREATE UNIQUE INDEX IF NOT EXISTS "farming_log_single_harvest_per_season"
  ON "FarmingLog" ("season_id")
  WHERE "activity_type" = 'HARVESTING' AND "deleted_at" IS NULL;
