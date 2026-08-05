-- CreateTable
CREATE TABLE "WalletDeposit" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "receivedFrom" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "payeeStaffId" TEXT,
    "payeeName" TEXT,
    "note" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PettyCashExpense" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "vatAmount" DOUBLE PRECISION,
    "vendor" TEXT NOT NULL,
    "vatNumber" TEXT,
    "description" TEXT,
    "spentAt" TIMESTAMP(3) NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PettyCashExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAttachment" (
    "id" TEXT NOT NULL,
    "depositId" TEXT,
    "transactionId" TEXT,
    "pettyCashExpenseId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletDeposit_receivedAt_idx" ON "WalletDeposit"("receivedAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_paidAt_idx" ON "WalletTransaction"("paidAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_category_idx" ON "WalletTransaction"("category");

-- CreateIndex
CREATE INDEX "WalletTransaction_payeeStaffId_idx" ON "WalletTransaction"("payeeStaffId");

-- CreateIndex
CREATE INDEX "PettyCashExpense_issueId_idx" ON "PettyCashExpense"("issueId");

-- CreateIndex
CREATE INDEX "PettyCashExpense_spentAt_idx" ON "PettyCashExpense"("spentAt");

-- CreateIndex
CREATE INDEX "WalletAttachment_depositId_idx" ON "WalletAttachment"("depositId");

-- CreateIndex
CREATE INDEX "WalletAttachment_transactionId_idx" ON "WalletAttachment"("transactionId");

-- CreateIndex
CREATE INDEX "WalletAttachment_pettyCashExpenseId_idx" ON "WalletAttachment"("pettyCashExpenseId");

-- AddForeignKey
ALTER TABLE "WalletDeposit" ADD CONSTRAINT "WalletDeposit_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_payeeStaffId_fkey" FOREIGN KEY ("payeeStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashExpense" ADD CONSTRAINT "PettyCashExpense_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "WalletTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PettyCashExpense" ADD CONSTRAINT "PettyCashExpense_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAttachment" ADD CONSTRAINT "WalletAttachment_depositId_fkey" FOREIGN KEY ("depositId") REFERENCES "WalletDeposit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAttachment" ADD CONSTRAINT "WalletAttachment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "WalletTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAttachment" ADD CONSTRAINT "WalletAttachment_pettyCashExpenseId_fkey" FOREIGN KEY ("pettyCashExpenseId") REFERENCES "PettyCashExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAttachment" ADD CONSTRAINT "WalletAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
