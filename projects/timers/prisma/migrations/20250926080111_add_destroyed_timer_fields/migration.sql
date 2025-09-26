-- AlterTable
ALTER TABLE "timers" ADD COLUMN     "isDestroyed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zkillboardId" TEXT;
