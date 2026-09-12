/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Agent` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING_VERIFICATION', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'AGENT';

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "UpiConfig" (
    "id" TEXT NOT NULL,
    "upiId" TEXT NOT NULL,
    "payeeName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPaymentRequest" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "utrNumber" TEXT NOT NULL,
    "screenshotUrl" TEXT NOT NULL,
    "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "verifiedAmount" DECIMAL(10,2),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "submittedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentPaymentRequest_agentId_idx" ON "AgentPaymentRequest"("agentId");

-- CreateIndex
CREATE INDEX "AgentPaymentRequest_status_idx" ON "AgentPaymentRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpiConfig" ADD CONSTRAINT "UpiConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPaymentRequest" ADD CONSTRAINT "AgentPaymentRequest_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPaymentRequest" ADD CONSTRAINT "AgentPaymentRequest_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPaymentRequest" ADD CONSTRAINT "AgentPaymentRequest_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
