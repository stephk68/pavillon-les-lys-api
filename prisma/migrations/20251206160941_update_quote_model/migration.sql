/*
  Warnings:

  - You are about to drop the column `currency` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `items` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `totalAmount` on the `Quote` table. All the data in the column will be lost.
  - Added the required column `basePrice` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxes` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalPrice` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `validUntil` to the `Quote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "currency",
DROP COLUMN "items",
DROP COLUMN "totalAmount",
ADD COLUMN     "basePrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "reservationId" TEXT,
ADD COLUMN     "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "taxes" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "totalPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "validUntil" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimatedBudget" DECIMAL(10,2),
ADD COLUMN     "specialRequests" TEXT;
