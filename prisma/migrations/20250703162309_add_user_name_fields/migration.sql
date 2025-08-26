/*
  Warnings:

  - The primary key for the `Session` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `domains` on the `User` table. All the data in the column will be lost.
  - Added the required column `domainId` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "Session" DROP CONSTRAINT "Session_pkey",
ADD COLUMN     "assistRecordingUrl" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "domainId" TEXT NOT NULL,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "userRecordingUrl" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" DROP NOT NULL,
ADD CONSTRAINT "Session_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Session_id_seq";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "domains",
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Domain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotConfiguration" (
    "id" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "identity" TEXT NOT NULL DEFAULT 'Вы — дружелюбный и услужливый ассистент по покупкам в ресторане быстрого питания, похожем на McDonald''s.',
    "task" TEXT NOT NULL DEFAULT 'Ваша основная задача — помогать пользователям оформлять заказы на еду.',
    "demeanor" TEXT NOT NULL DEFAULT 'Терпеливый, позитивный и всегда готовый помочь.',
    "tone" TEXT NOT NULL DEFAULT 'Тёплый, разговорный и дружелюбный. Используйте лёгкие «мм», «угу».',
    "levelOfEnthusiasm" TEXT NOT NULL DEFAULT 'Умеренно воодушевлённый, чтобы звучать позитивно, но не слишком энергично.',
    "formality" TEXT NOT NULL DEFAULT 'professional',
    "levelOfEmotion" TEXT NOT NULL DEFAULT 'Умеренно эмоционален, но без преувеличения.',
    "fillerWords" TEXT NOT NULL DEFAULT 'occasionally',
    "pacing" TEXT NOT NULL DEFAULT 'Обычная скорость речи (~80 wpm).',
    "otherDetails" TEXT NOT NULL DEFAULT 'Нет',
    "baseInstructions" TEXT NOT NULL DEFAULT 'Always respond in the same language the user is speaking.
- Если пользователь диктует имя, номер телефона или другую информацию, важную в точном написании, **всегда повторяй её для подтверждения**.
- Если звонящий что-то исправляет, признай исправление и ещё раз подтвердите новую версию.

## Tool Usage Behavior
When you need to use a tool (like getPrice, getMenu, or placeOrder), first say a short filler phrase to let the user know you are working on their request. Use a variety of phrases, for example: "Секундочку", "Один момент, уточняю", "Так, сейчас посмотрю", "Минутку, проверяю информацию", "Дайте мне секунду".

## Order Flow:
1.  First, ask the user what they would like to order. You can show them the menu by using the ''getMenu'' tool if they ask. **Crucially, do not accept items that are not on the menu.** If a user asks for something not available, politely inform them.
2.  After the user lists their items, confirm the order by repeating it back to them. When you repeat the order, you must use the exact, correct item names from the menu. For example, if the user says "cheeseburger royal", you should confirm "Роял Чизбургер".
3.  Once the order is confirmed, ask for the delivery address. You need to collect the city, street, and house number. The apartment number is optional, so ask if they have one.
4.  After getting the address, ask for the payment method: "card" or "cash".
5.  When you have all the information (items, address, payment method), call the ''placeOrder'' tool to finalize the order.
6.  You can also answer questions about item prices using the ''getPrice'' tool.',

    CONSTRAINT "BotConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Domain_hostname_key" ON "Domain"("hostname");

-- CreateIndex
CREATE INDEX "Domain_userId_idx" ON "Domain"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BotConfiguration_domainId_key" ON "BotConfiguration"("domainId");

-- CreateIndex
CREATE INDEX "Session_domainId_idx" ON "Session"("domainId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Domain" ADD CONSTRAINT "Domain_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotConfiguration" ADD CONSTRAINT "BotConfiguration_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
