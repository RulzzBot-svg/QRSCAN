-- Migration: add_buildings_and_building_id.sql
-- Purpose: create `buildings` table and add nullable `building_id` FK to `ahus`.
-- Run this file against your database (psql or other client).

BEGIN;

-- 1) Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  hospital_id INTEGER NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL
);

-- 2) Add building_id column to ahus (nullable)
ALTER TABLE IF EXISTS ahus
  ADD COLUMN IF NOT EXISTS building_id INTEGER;

-- 3) Add foreign key constraint from ahus.building_id -> buildings.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ahus_building'
  ) THEN
    ALTER TABLE ahus
      ADD CONSTRAINT fk_ahus_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL;
  END IF;
END$$;

-- 4) Optional index to speed lookups
CREATE INDEX IF NOT EXISTS idx_ahus_building_id ON ahus(building_id);

COMMIT;

-- Downgrade (manual rollback):
-- ALTER TABLE ahus DROP CONSTRAINT IF EXISTS fk_ahus_building;
-- ALTER TABLE ahus DROP COLUMN IF EXISTS building_id;
-- DROP TABLE IF EXISTS buildings;
