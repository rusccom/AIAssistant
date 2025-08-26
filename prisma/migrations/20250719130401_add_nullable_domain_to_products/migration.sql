-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "domainId" TEXT;

-- CreateIndex
CREATE INDEX "Product_domainId_idx" ON "Product"("domainId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
