-- Personal training and the PT+EMS mix, from the September price lists.
--
-- These are two product lines the catalogue didn't carry at all. It already
-- held Pilates and EMS, and the app's own TRAINING_TYPES has known about all
-- three (ems, pilates, pt) from the start.
--
-- Named to match what is already there, where the product follows the tier:
-- "Standard EMS" is joined by "Standard PT" and "Standard PT + EMS", so a
-- trainer selling one can tell at a glance which product it is.
--
-- Session counts are the combined total on the mix rows. The poster splits
-- them half and half, 4 PT + 4 EMS and so on, but a package counts down from
-- one number, and that number is the total the client may book.
--
-- Prices are the list price, not the promotional one: the "Apply 45% Off"
-- button works the offer out from the figure stored here.
--
-- Inserts only. Nothing already in the catalogue is updated, renamed or
-- deactivated by this, the Standard EMS and Platinum EMS rows included.

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_pt_8', 'Standard PT', 8, 30, 1400, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard PT' AND "sessions" = 8
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_pt_12', 'Standard PT', 12, 45, 1900, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard PT' AND "sessions" = 12
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_pt_24', 'Standard PT', 24, 90, 3500, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard PT' AND "sessions" = 24
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_pt_48', 'Standard PT', 48, 180, 6000, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard PT' AND "sessions" = 48
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_pt_8', 'Platinum PT', 8, 44, 1700, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum PT' AND "sessions" = 8
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_pt_12', 'Platinum PT', 12, 74, 2400, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum PT' AND "sessions" = 12
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_pt_24', 'Platinum PT', 24, 111, 4500, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum PT' AND "sessions" = 24
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_pt_48', 'Platinum PT', 48, 240, 7500, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum PT' AND "sessions" = 48
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_pt_ems_8', 'Standard PT + EMS', 8, 30, 1750, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard PT + EMS' AND "sessions" = 8
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_pt_ems_12', 'Standard PT + EMS', 12, 45, 2500, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard PT + EMS' AND "sessions" = 12
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_pt_ems_24', 'Standard PT + EMS', 24, 90, 4600, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard PT + EMS' AND "sessions" = 24
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_standard_pt_ems_48', 'Standard PT + EMS', 48, 180, 6800, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Standard PT + EMS' AND "sessions" = 48
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_pt_ems_8', 'Platinum PT + EMS', 8, 44, 2100, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum PT + EMS' AND "sessions" = 8
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_pt_ems_12', 'Platinum PT + EMS', 12, 74, 3000, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum PT + EMS' AND "sessions" = 12
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_pt_ems_24', 'Platinum PT + EMS', 24, 111, 5600, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum PT + EMS' AND "sessions" = 24
);

INSERT INTO "PackageTemplate" ("id", "name", "sessions", "durationDays", "price", "section", "active", "createdAt")
SELECT 'tpl_platinum_pt_ems_48', 'Platinum PT + EMS', 48, 240, 8500, NULL, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "PackageTemplate" WHERE "name" = 'Platinum PT + EMS' AND "sessions" = 48
);
