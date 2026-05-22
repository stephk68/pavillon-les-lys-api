-- AlterTable: add isActive field with default true for all existing users
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
