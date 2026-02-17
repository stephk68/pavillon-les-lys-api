/*
  Warnings:

  - You are about to drop the column `reservationId` on the `ChecklistItem` table. All the data in the column will be lost.
  - You are about to drop the column `reservationId` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `quoteId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `reservationId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the `Quote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuoteItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Reservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReservationEquipment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `eventFolderId` to the `ChecklistItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventFolderId` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PROSPECT', 'QUOTED', 'BOOKED', 'READY', 'COMPLETED', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "ChecklistItem" DROP CONSTRAINT "ChecklistItem_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "Feedback" DROP CONSTRAINT "Feedback_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_reservationId_fkey";

-- DropForeignKey
ALTER TABLE "Quote" DROP CONSTRAINT "Quote_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuoteItem" DROP CONSTRAINT "QuoteItem_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_quoteId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReservationEquipment" DROP CONSTRAINT "ReservationEquipment_inventoryItemId_fkey";

-- DropForeignKey
ALTER TABLE "ReservationEquipment" DROP CONSTRAINT "ReservationEquipment_reservationId_fkey";

-- DropIndex
DROP INDEX "ChecklistItem_reservationId_idx";

-- AlterTable
ALTER TABLE "ChecklistItem" DROP COLUMN "reservationId",
ADD COLUMN     "eventFolderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "reservationId",
ADD COLUMN     "eventFolderId" TEXT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "quoteId",
DROP COLUMN "reservationId",
ADD COLUMN     "eventFolderId" TEXT NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- DropTable
DROP TABLE "Quote";

-- DropTable
DROP TABLE "QuoteItem";

-- DropTable
DROP TABLE "Reservation";

-- DropTable
DROP TABLE "ReservationEquipment";

-- DropEnum
DROP TYPE "QuoteStatus";

-- DropEnum
DROP TYPE "ReservationStatus";

-- CreateTable
CREATE TABLE "EventFolder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "attendees" INTEGER NOT NULL,
    "description" TEXT,
    "specialRequests" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'PROSPECT',
    "totalHT" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "totalTTC" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "reminderJ21SentAt" TIMESTAMP(3),
    "reminderJ14SentAt" TIMESTAMP(3),
    "contractSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "EventFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFolderItem" (
    "id" TEXT NOT NULL,
    "eventFolderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventFolderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEquipment" (
    "id" TEXT NOT NULL,
    "eventFolderId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantityReserved" INTEGER NOT NULL,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventFolder_number_key" ON "EventFolder"("number");

-- CreateIndex
CREATE INDEX "EventFolder_userId_idx" ON "EventFolder"("userId");

-- CreateIndex
CREATE INDEX "EventFolder_status_idx" ON "EventFolder"("status");

-- CreateIndex
CREATE INDEX "EventFolder_start_end_idx" ON "EventFolder"("start", "end");

-- CreateIndex
CREATE INDEX "EventFolderItem_eventFolderId_idx" ON "EventFolderItem"("eventFolderId");

-- CreateIndex
CREATE INDEX "EventEquipment_eventFolderId_idx" ON "EventEquipment"("eventFolderId");

-- CreateIndex
CREATE INDEX "EventEquipment_inventoryItemId_idx" ON "EventEquipment"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "EventEquipment_eventFolderId_inventoryItemId_key" ON "EventEquipment"("eventFolderId", "inventoryItemId");

-- CreateIndex
CREATE INDEX "ChecklistItem_eventFolderId_idx" ON "ChecklistItem"("eventFolderId");

-- CreateIndex
CREATE INDEX "Payment_eventFolderId_idx" ON "Payment"("eventFolderId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- AddForeignKey
ALTER TABLE "EventFolder" ADD CONSTRAINT "EventFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFolderItem" ADD CONSTRAINT "EventFolderItem_eventFolderId_fkey" FOREIGN KEY ("eventFolderId") REFERENCES "EventFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventFolderId_fkey" FOREIGN KEY ("eventFolderId") REFERENCES "EventFolder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_eventFolderId_fkey" FOREIGN KEY ("eventFolderId") REFERENCES "EventFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_eventFolderId_fkey" FOREIGN KEY ("eventFolderId") REFERENCES "EventFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEquipment" ADD CONSTRAINT "EventEquipment_eventFolderId_fkey" FOREIGN KEY ("eventFolderId") REFERENCES "EventFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEquipment" ADD CONSTRAINT "EventEquipment_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
