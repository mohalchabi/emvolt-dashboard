-- Who actually spent the money, as distinct from who keyed the invoice in.
-- `recordedById` conflates the two: on an invoice typed up at the desk it names
-- the admin, not the person who made the purchase, so spend-per-person is wrong.
-- AlterTable
ALTER TABLE "PettyCashExpense" ADD COLUMN "spentById" TEXT;

-- Backfill: attribute existing invoices to the holder of the float they were
-- filed against. That is the best information available for rows that predate
-- the column, and it matches what any report would have assumed anyway.
UPDATE "PettyCashExpense" AS e
SET "spentById" = t."payeeStaffId"
FROM "WalletTransaction" AS t
WHERE t."id" = e."issueId"
  AND t."payeeStaffId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "PettyCashExpense_spentById_idx" ON "PettyCashExpense"("spentById");

-- AddForeignKey
-- SET NULL rather than RESTRICT: losing a staff record should not take the
-- gym's invoice history with it, and the amount still reconciles against the
-- float either way.
ALTER TABLE "PettyCashExpense" ADD CONSTRAINT "PettyCashExpense_spentById_fkey" FOREIGN KEY ("spentById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
