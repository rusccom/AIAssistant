ALTER TABLE "Product"
ADD COLUMN "brand" TEXT,
ADD COLUMN "category" TEXT,
ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "embeddingSourceText" TEXT;

ALTER TABLE "ProductVariant"
ADD COLUMN "attributes" JSONB,
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "embeddingSourceText" TEXT;

UPDATE "ProductVariant"
SET "isDefault" = true
WHERE LOWER(TRIM(title)) = 'default title';

CREATE INDEX IF NOT EXISTS "Product_domainId_status_idx"
ON "Product"("domainId", "status");

CREATE INDEX IF NOT EXISTS "Product_domainId_category_idx"
ON "Product"("domainId", "category");

CREATE INDEX IF NOT EXISTS "Product_domainId_brand_idx"
ON "Product"("domainId", "brand");

CREATE INDEX IF NOT EXISTS "ProductVariant_sku_idx"
ON "ProductVariant"("sku");

CREATE INDEX IF NOT EXISTS "ProductVariant_productId_isAvailable_idx"
ON "ProductVariant"("productId", "isAvailable");
