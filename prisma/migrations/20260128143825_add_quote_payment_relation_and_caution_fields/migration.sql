-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "isRefundable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quoteId" TEXT,
ADD COLUMN     "refundedAmount" DECIMAL(10,2),
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Quote" ALTER COLUMN "vatRate" SET DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;
