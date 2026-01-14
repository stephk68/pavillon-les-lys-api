-- CreateEnum
CREATE TYPE "InventoryItemType" AS ENUM ('INTERNAL', 'EXTERNAL_PROVIDER');

-- CreateEnum
CREATE TYPE "InventoryItemStatus" AS ENUM ('AVAILABLE', 'MAINTENANCE', 'LOST');

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "type" "InventoryItemType" NOT NULL,
    "category" TEXT,
    "providerName" TEXT,
    "providerContact" TEXT,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "availableStock" INTEGER NOT NULL DEFAULT 0,
    "status" "InventoryItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "unitPrice" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationEquipment" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantityReserved" INTEGER NOT NULL,
    "returnedQuantity" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReservationEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryItem_type_status_idx" ON "InventoryItem"("type", "status");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "ReservationEquipment_reservationId_idx" ON "ReservationEquipment"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationEquipment_inventoryItemId_idx" ON "ReservationEquipment"("inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ReservationEquipment_reservationId_inventoryItemId_key" ON "ReservationEquipment"("reservationId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "ReservationEquipment" ADD CONSTRAINT "ReservationEquipment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationEquipment" ADD CONSTRAINT "ReservationEquipment_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
