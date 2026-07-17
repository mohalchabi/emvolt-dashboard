-- AlterTable
ALTER TABLE "ClientOtp" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
