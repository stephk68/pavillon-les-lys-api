/*
  Warnings:

  - You are about to drop the column `basePrice` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `taxes` on the `Quote` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `Quote` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[number]` on the table `Quote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `number` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalHT` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalTTC` to the `Quote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Quote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Quote" DROP COLUMN "basePrice",
DROP COLUMN "description",
DROP COLUMN "taxes",
DROP COLUMN "totalPrice",
ADD COLUMN     "number" TEXT NOT NULL,
ADD COLUMN     "totalHT" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "totalTTC" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
ADD COLUMN     "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 18.0;

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
