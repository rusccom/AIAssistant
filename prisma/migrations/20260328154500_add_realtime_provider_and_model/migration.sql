ALTER TABLE "BotConfiguration"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'openai',
ADD COLUMN "model" TEXT NOT NULL DEFAULT 'gpt-realtime';
