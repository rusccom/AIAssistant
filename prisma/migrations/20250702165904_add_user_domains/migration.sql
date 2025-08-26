-- AlterTable
ALTER TABLE "User" ADD COLUMN     "domains" TEXT[] DEFAULT ARRAY[]::TEXT[];
