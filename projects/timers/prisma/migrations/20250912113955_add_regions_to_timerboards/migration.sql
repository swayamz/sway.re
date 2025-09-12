-- AlterTable
ALTER TABLE "timerboards" ADD COLUMN     "regions" TEXT[] DEFAULT ARRAY[]::TEXT[];
