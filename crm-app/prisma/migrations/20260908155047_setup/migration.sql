/*
  Warnings:

  - You are about to drop the column `commissionType` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `commissionValue` on the `Agent` table. All the data in the column will be lost.
  - You are about to drop the column `agentCommissionAmount` on the `CustomerService` table. All the data in the column will be lost.
  - You are about to drop the column `agentCommissionPaidAt` on the `CustomerService` table. All the data in the column will be lost.
  - You are about to drop the column `agentCommissionStatus` on the `CustomerService` table. All the data in the column will be lost.
  - You are about to drop the column `defaultAmount` on the `Service` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `Service` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Agent" DROP COLUMN "commissionType",
DROP COLUMN "commissionValue";

-- AlterTable
ALTER TABLE "CustomerService" DROP COLUMN "agentCommissionAmount",
DROP COLUMN "agentCommissionPaidAt",
DROP COLUMN "agentCommissionStatus";

-- AlterTable
ALTER TABLE "Service" DROP COLUMN "defaultAmount",
ADD COLUMN     "agentPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "customerPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- DropEnum
DROP TYPE "CommissionStatus";

-- DropEnum
DROP TYPE "CommissionType";
