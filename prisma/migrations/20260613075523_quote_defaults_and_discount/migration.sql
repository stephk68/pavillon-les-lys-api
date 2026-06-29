/*
  Warnings:

  - You are about to drop the column `quoteAcceptedAt` on the `EventFolder` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventFolder" DROP COLUMN "quoteAcceptedAt",
ADD COLUMN     "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountReason" TEXT;

-- CreateTable
CREATE TABLE "QuoteDefaultItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteDefaultItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuoteDefaultItem_isActive_idx" ON "QuoteDefaultItem"("isActive");
