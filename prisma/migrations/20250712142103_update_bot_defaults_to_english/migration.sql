/*
  Warnings:

  - Added the required column `config` to the `Tool` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Tool` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BotConfiguration" ALTER COLUMN "demeanor" SET DEFAULT 'Patient, positive, and always ready to help',
ALTER COLUMN "tone" SET DEFAULT 'Warm, conversational, and friendly. Use light ''mm'', ''uh-huh''',
ALTER COLUMN "levelOfEnthusiasm" SET DEFAULT 'Moderately enthusiastic to sound positive but not overly energetic',
ALTER COLUMN "levelOfEmotion" SET DEFAULT 'Moderately emotional but without exaggeration',
ALTER COLUMN "pacing" SET DEFAULT 'Normal speech rate (~80 wpm)';

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "config" JSONB NOT NULL,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "type" TEXT NOT NULL;
