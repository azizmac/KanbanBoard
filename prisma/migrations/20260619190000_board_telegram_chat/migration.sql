-- Link a Telegram group chat to a board
ALTER TABLE "Board" ADD COLUMN "telegramChatId" TEXT;
CREATE UNIQUE INDEX "Board_telegramChatId_key" ON "Board"("telegramChatId");
