-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('FLAT', 'PERCENT');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "CustomerService" ADD COLUMN     "agentCommissionAmount" DECIMAL(10,2),
ADD COLUMN     "agentCommissionPaidAt" TIMESTAMP(3),
ADD COLUMN     "agentCommissionStatus" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "amountReceived" DECIMAL(10,2) DEFAULT 0,
ADD COLUMN     "assignedEmployeeId" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "agentCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "altMobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "commissionType" "CommissionType" NOT NULL DEFAULT 'FLAT',
    "commissionValue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_agentCode_key" ON "Agent"("agentCode");

-- CreateIndex
CREATE INDEX "Agent_name_idx" ON "Agent"("name");

-- CreateIndex
CREATE INDEX "Agent_mobile_idx" ON "Agent"("mobile");

-- CreateIndex
CREATE INDEX "CustomerService_agentId_idx" ON "CustomerService"("agentId");

-- CreateIndex
CREATE INDEX "CustomerService_assignedEmployeeId_idx" ON "CustomerService"("assignedEmployeeId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerService" ADD CONSTRAINT "CustomerService_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerService" ADD CONSTRAINT "CustomerService_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
