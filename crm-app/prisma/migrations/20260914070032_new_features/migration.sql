-- CreateEnum
CREATE TYPE "ServiceFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'EMAIL', 'PHONE', 'PASSWORD', 'TEXTAREA', 'SELECT', 'CHECKBOX');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceStatus" ADD VALUE 'PENDING_REVIEW';
ALTER TYPE "ServiceStatus" ADD VALUE 'ACCEPTED';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "updatedById" TEXT;

-- AlterTable
ALTER TABLE "CustomerService" ADD COLUMN     "rejectionReason" TEXT;

-- CreateTable
CREATE TABLE "ServiceField" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "ServiceFieldType" NOT NULL DEFAULT 'TEXT',
    "options" JSONB,
    "requiredAtSubmission" BOOLEAN NOT NULL DEFAULT false,
    "editableAfterSubmission" BOOLEAN NOT NULL DEFAULT true,
    "visibleToAgent" BOOLEAN NOT NULL DEFAULT true,
    "visibleToEmployee" BOOLEAN NOT NULL DEFAULT true,
    "visibleToAdmin" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDocumentRequirement" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationFieldValue" (
    "id" TEXT NOT NULL,
    "customerServiceId" TEXT NOT NULL,
    "serviceFieldId" TEXT NOT NULL,
    "value" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApplicationFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocument" (
    "id" TEXT NOT NULL,
    "customerServiceId" TEXT NOT NULL,
    "requirementId" TEXT,
    "documentName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceField_serviceId_idx" ON "ServiceField"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceField_serviceId_name_key" ON "ServiceField"("serviceId", "name");

-- CreateIndex
CREATE INDEX "ServiceDocumentRequirement_serviceId_idx" ON "ServiceDocumentRequirement"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDocumentRequirement_serviceId_name_key" ON "ServiceDocumentRequirement"("serviceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationFieldValue_customerServiceId_serviceFieldId_key" ON "ApplicationFieldValue"("customerServiceId", "serviceFieldId");

-- CreateIndex
CREATE INDEX "ApplicationDocument_customerServiceId_idx" ON "ApplicationDocument"("customerServiceId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceField" ADD CONSTRAINT "ServiceField_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDocumentRequirement" ADD CONSTRAINT "ServiceDocumentRequirement_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFieldValue" ADD CONSTRAINT "ApplicationFieldValue_customerServiceId_fkey" FOREIGN KEY ("customerServiceId") REFERENCES "CustomerService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFieldValue" ADD CONSTRAINT "ApplicationFieldValue_serviceFieldId_fkey" FOREIGN KEY ("serviceFieldId") REFERENCES "ServiceField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFieldValue" ADD CONSTRAINT "ApplicationFieldValue_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_customerServiceId_fkey" FOREIGN KEY ("customerServiceId") REFERENCES "CustomerService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "ServiceDocumentRequirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocument" ADD CONSTRAINT "ApplicationDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
