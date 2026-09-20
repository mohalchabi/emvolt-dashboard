-- Correct the EMS prices.
--
-- An earlier migration in this branch wrote the personal training price list
-- into rows that turned out to be the EMS product, so seven of the eight EMS
-- rows have been quoting PT prices. This puts the EMS list back.
--
-- The durations were right and are restated only so each row is described in
-- one place. Platinum EMS at 8 sessions already held 2,300 and is included
-- for the same reason; it is unchanged.
--
-- Prices are the list price. The "Apply 45% Off" button works the promotion
-- out from the figure stored here.
--
-- This does not reprice anything already sold. A package keeps its own copy
-- of what the client actually paid, which is the right record of the sale
-- even when the catalogue behind it was wrong.

UPDATE "PackageTemplate"
SET "durationDays" = 30, "price" = 1950
WHERE "name" = 'Standard EMS' AND "sessions" = 8;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_ems_8', 'Standard EMS', 8, 30, 1950, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard EMS' AND "sessions" = 8
);

UPDATE "PackageTemplate"
SET "durationDays" = 45, "price" = 2890
WHERE "name" = 'Standard EMS' AND "sessions" = 12;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_ems_12', 'Standard EMS', 12, 45, 2890, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard EMS' AND "sessions" = 12
);

UPDATE "PackageTemplate"
SET "durationDays" = 90, "price" = 5400
WHERE "name" = 'Standard EMS' AND "sessions" = 24;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_ems_24', 'Standard EMS', 24, 90, 5400, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard EMS' AND "sessions" = 24
);

UPDATE "PackageTemplate"
SET "durationDays" = 180, "price" = 7280
WHERE "name" = 'Standard EMS' AND "sessions" = 48;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_ems_48', 'Standard EMS', 48, 180, 7280, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard EMS' AND "sessions" = 48
);

UPDATE "PackageTemplate"
SET "durationDays" = 44, "price" = 2300
WHERE "name" = 'Platinum EMS' AND "sessions" = 8;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_ems_8', 'Platinum EMS', 8, 44, 2300, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum EMS' AND "sessions" = 8
);

UPDATE "PackageTemplate"
SET "durationDays" = 74, "price" = 3399
WHERE "name" = 'Platinum EMS' AND "sessions" = 12;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_ems_12', 'Platinum EMS', 12, 74, 3399, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum EMS' AND "sessions" = 12
);

UPDATE "PackageTemplate"
SET "durationDays" = 111, "price" = 6360
WHERE "name" = 'Platinum EMS' AND "sessions" = 24;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_ems_24', 'Platinum EMS', 24, 111, 6360, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum EMS' AND "sessions" = 24
);

UPDATE "PackageTemplate"
SET "durationDays" = 240, "price" = 9120
WHERE "name" = 'Platinum EMS' AND "sessions" = 48;

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_ems_48', 'Platinum EMS', 48, 240, 9120, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum EMS' AND "sessions" = 48
);
