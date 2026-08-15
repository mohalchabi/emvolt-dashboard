-- Whether a package was sold as a renewal rather than a first purchase.
-- Recorded as staff intent rather than inferred from "the client already had a
-- package": a client can hold a PT block and a class pass at the same time
-- without either being a renewal.
-- AlterTable
ALTER TABLE "Package" ADD COLUMN "isRenewal" BOOLEAN NOT NULL DEFAULT false;

-- No backfill. Existing rows predate the question being asked, and guessing
-- from purchase order would invent renewals that were never recorded as such.
