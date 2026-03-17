/*
  Warnings:

  - You are about to drop the column `end` on the `EventFolder` table. All the data in the column will be lost.
  - You are about to drop the column `start` on the `EventFolder` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "EventFolder_start_end_idx";

-- AlterTable
ALTER TABLE "EventFolder" DROP COLUMN "end",
DROP COLUMN "start",
ADD COLUMN     "basePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "cautionAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "remainingBalance" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EventSchedule" (
    "id" TEXT NOT NULL,
    "eventFolderId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSchedule_eventFolderId_idx" ON "EventSchedule"("eventFolderId");

-- CreateIndex
CREATE INDEX "EventSchedule_date_idx" ON "EventSchedule"("date");

-- AddForeignKey
ALTER TABLE "EventSchedule" ADD CONSTRAINT "EventSchedule_eventFolderId_fkey" FOREIGN KEY ("eventFolderId") REFERENCES "EventFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
