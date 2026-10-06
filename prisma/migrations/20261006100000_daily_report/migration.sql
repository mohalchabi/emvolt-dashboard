-- A trainer's account of their day, filed as they clock out.
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "issues" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- One per person per day, so a second clock out edits rather than duplicates.
CREATE UNIQUE INDEX "DailyReport_staffId_day_key" ON "DailyReport"("staffId", "day");
CREATE INDEX "DailyReport_day_idx" ON "DailyReport"("day");

ALTER TABLE "DailyReport" ADD CONSTRAINT "DailyReport_staffId_fkey"
    FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
