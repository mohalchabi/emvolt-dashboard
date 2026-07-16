-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "leadTarget" INTEGER;

-- CreateTable
CREATE TABLE "LeadContactAttempt" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadContactAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadContactAttempt_leadId_idx" ON "LeadContactAttempt"("leadId");

-- CreateIndex
CREATE INDEX "LeadContactAttempt_staffId_idx" ON "LeadContactAttempt"("staffId");

-- AddForeignKey
ALTER TABLE "LeadContactAttempt" ADD CONSTRAINT "LeadContactAttempt_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadContactAttempt" ADD CONSTRAINT "LeadContactAttempt_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
