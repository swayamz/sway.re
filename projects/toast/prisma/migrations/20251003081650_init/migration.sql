-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "characterId" INTEGER NOT NULL,
    "characterName" TEXT NOT NULL,
    "corporationId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entosis_events" (
    "id" TEXT NOT NULL,
    "system" TEXT NOT NULL,
    "region" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Being Captured!',
    "timestamp" TIMESTAMP(3) NOT NULL,
    "isReinforced" BOOLEAN NOT NULL DEFAULT false,
    "notificationHash" TEXT NOT NULL,
    "importedBy" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "markedBy" TEXT,
    "markedAt" TIMESTAMP(3),
    "markedNote" TEXT,
    "lastUpdatedBy" TEXT,
    "lastUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "entosis_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_characterId_key" ON "users"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "entosis_events_notificationHash_key" ON "entosis_events"("notificationHash");

-- CreateIndex
CREATE INDEX "entosis_events_timestamp_idx" ON "entosis_events"("timestamp");

-- CreateIndex
CREATE INDEX "entosis_events_system_idx" ON "entosis_events"("system");

-- CreateIndex
CREATE INDEX "entosis_events_status_idx" ON "entosis_events"("status");

-- AddForeignKey
ALTER TABLE "entosis_events" ADD CONSTRAINT "entosis_events_importedBy_fkey" FOREIGN KEY ("importedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
