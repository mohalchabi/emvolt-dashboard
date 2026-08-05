-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'transfer';
