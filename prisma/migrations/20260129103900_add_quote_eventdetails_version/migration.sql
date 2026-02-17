-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "eventDetails" JSONB,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;
