-- Personal API tokens for the inbound webhook (Genspark). Only the hash is stored.
CREATE TABLE "WebhookToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookToken_tokenHash_key" ON "WebhookToken"("tokenHash");
CREATE INDEX "WebhookToken_userId_idx" ON "WebhookToken"("userId");

ALTER TABLE "WebhookToken"
  ADD CONSTRAINT "WebhookToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
