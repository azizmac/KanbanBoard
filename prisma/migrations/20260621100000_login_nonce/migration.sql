-- One-time login nonce for the bot deep-link sign-in (RU-friendly, no telegram.org).
CREATE TABLE "LoginNonce" (
    "id" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "inviteToken" TEXT,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginNonce_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoginNonce_nonce_key" ON "LoginNonce"("nonce");
CREATE INDEX "LoginNonce_expiresAt_idx" ON "LoginNonce"("expiresAt");
