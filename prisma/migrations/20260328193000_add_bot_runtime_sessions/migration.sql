CREATE TABLE "BotRuntimeSession" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "currentStateId" TEXT,
    "pendingStateId" TEXT,
    "stateVersion" INTEGER NOT NULL DEFAULT 1,
    "providerSessionHandle" TEXT,
    "historySummary" TEXT NOT NULL DEFAULT '',
    "slots" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotRuntimeSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BotRuntimeSession_domainId_status_idx"
ON "BotRuntimeSession"("domainId", "status");

ALTER TABLE "BotRuntimeSession"
ADD CONSTRAINT "BotRuntimeSession_domainId_fkey"
FOREIGN KEY ("domainId") REFERENCES "Domain"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
