-- Attendance: one row per clock in or clock out, with where the person stood.
-- Latitude and longitude are NOT NULL because the action refuses to record an
-- event without a position; accuracy is nullable because the browser does not
-- always report it.
-- CreateTable
CREATE TABLE "ClockEvent" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "departureReason" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClockEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClockEvent_staffId_at_idx" ON "ClockEvent"("staffId", "at");

-- CreateIndex
CREATE INDEX "ClockEvent_at_idx" ON "ClockEvent"("at");

-- AddForeignKey
-- RESTRICT: attendance is a payroll record, so a staff row cannot be removed
-- out from under it.
ALTER TABLE "ClockEvent" ADD CONSTRAINT "ClockEvent_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
