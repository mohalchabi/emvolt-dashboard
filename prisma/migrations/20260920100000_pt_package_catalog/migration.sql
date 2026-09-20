-- The personal training catalogue, from the price list dated September 2026.
--
-- Prices here are the list price, not the promotional one: the app's "Apply
-- 45% Off" button works the offer out from the figure stored here, so storing
-- the discounted price would take 45% off a second time.
--
-- Sold packages keep their own copy of the price and session count, so nothing
-- a client already bought is rewritten by this.
--
-- Each row is updated where it already exists and inserted where it doesn't,
-- matched on name and session count, so a catalogue that already holds some of
-- them has those corrected rather than duplicated.
--
-- Only Standard and Platinum are touched. The Pilates entries are a different
-- product and are left exactly as they are.

UPDATE "PackageTemplate"
SET "durationDays" = 30, "price" = 1400, "active" = true
WHERE "name" = 'Standard' AND "sessions" = 8;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_8', 'Standard', 8, 30, 1400, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard' AND "sessions" = 8
);

UPDATE "PackageTemplate"
SET "durationDays" = 45, "price" = 1900, "active" = true
WHERE "name" = 'Standard' AND "sessions" = 12;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_12', 'Standard', 12, 45, 1900, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard' AND "sessions" = 12
);

UPDATE "PackageTemplate"
SET "durationDays" = 90, "price" = 3500, "active" = true
WHERE "name" = 'Standard' AND "sessions" = 24;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_24', 'Standard', 24, 90, 3500, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard' AND "sessions" = 24
);

UPDATE "PackageTemplate"
SET "durationDays" = 180, "price" = 6000, "active" = true
WHERE "name" = 'Standard' AND "sessions" = 48;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_48', 'Standard', 48, 180, 6000, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard' AND "sessions" = 48
);

UPDATE "PackageTemplate"
SET "durationDays" = 44, "price" = 1700, "active" = true
WHERE "name" = 'Platinum' AND "sessions" = 8;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_8', 'Platinum', 8, 44, 1700, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum' AND "sessions" = 8
);

UPDATE "PackageTemplate"
SET "durationDays" = 74, "price" = 2400, "active" = true
WHERE "name" = 'Platinum' AND "sessions" = 12;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_12', 'Platinum', 12, 74, 2400, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum' AND "sessions" = 12
);

UPDATE "PackageTemplate"
SET "durationDays" = 111, "price" = 4500, "active" = true
WHERE "name" = 'Platinum' AND "sessions" = 24;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_24', 'Platinum', 24, 111, 4500, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum' AND "sessions" = 24
);

UPDATE "PackageTemplate"
SET "durationDays" = 240, "price" = 7500, "active" = true
WHERE "name" = 'Platinum' AND "sessions" = 48;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_48', 'Platinum', 48, 240, 7500, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum' AND "sessions" = 48
);

-- The catalogue held a single Standard and a single Platinum on the wrong
-- session count. Those are retired rather than deleted: a sold package points
-- back at the template it came from, so removing the row would either break
-- that reference or strand it. Deactivating drops it out of the picker while
-- leaving every past sale intact and explicable.
UPDATE "PackageTemplate"
SET "active" = false
WHERE "name" IN ('Standard', 'Platinum')
  AND "sessions" NOT IN (8, 12, 24, 48);
