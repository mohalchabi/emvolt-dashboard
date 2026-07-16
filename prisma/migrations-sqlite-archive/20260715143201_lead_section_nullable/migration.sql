-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "interestedIn" TEXT NOT NULL,
    "section" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "lostReason" TEXT,
    "calcomBookingUid" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "assignedStaffId" TEXT,
    CONSTRAINT "Lead_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("assignedStaffId", "calcomBookingUid", "createdAt", "id", "interestedIn", "lostReason", "name", "phone", "section", "source", "status", "updatedAt") SELECT "assignedStaffId", "calcomBookingUid", "createdAt", "id", "interestedIn", "lostReason", "name", "phone", "section", "source", "status", "updatedAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_calcomBookingUid_key" ON "Lead"("calcomBookingUid");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_assignedStaffId_idx" ON "Lead"("assignedStaffId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
