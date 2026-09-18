-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "enterpriseName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "CustomerService" ADD COLUMN     "acceptedAt" TIMESTAMP(3);
