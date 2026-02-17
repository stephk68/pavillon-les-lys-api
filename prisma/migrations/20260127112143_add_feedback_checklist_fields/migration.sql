-- AlterTable
ALTER TABLE "ChecklistItem" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "isRead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "response" TEXT;

-- CreateIndex
CREATE INDEX "ChecklistItem_reservationId_idx" ON "ChecklistItem"("reservationId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_isRead_idx" ON "Feedback"("isRead");
