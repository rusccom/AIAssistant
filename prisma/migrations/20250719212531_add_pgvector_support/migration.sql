-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Convert existing DOUBLE PRECISION[] columns to vector(3072)
-- First, rename old columns
ALTER TABLE "Product" RENAME COLUMN "embedding" TO "embedding_old";
ALTER TABLE "ProductVariant" RENAME COLUMN "embedding" TO "embedding_old";

-- Add new vector columns
ALTER TABLE "Product" ADD COLUMN "embedding" vector(1536);
ALTER TABLE "ProductVariant" ADD COLUMN "embedding" vector(1536);

-- Copy data from old columns to new vector columns (only for non-empty arrays)
UPDATE "Product" 
SET "embedding" = "embedding_old"::vector 
WHERE array_length("embedding_old", 1) = 1536;

UPDATE "ProductVariant" 
SET "embedding" = "embedding_old"::vector 
WHERE array_length("embedding_old", 1) = 1536;

-- Drop old columns
ALTER TABLE "Product" DROP COLUMN "embedding_old";
ALTER TABLE "ProductVariant" DROP COLUMN "embedding_old";

-- Create HNSW indexes for fast similarity search (supports >2000 dimensions)
CREATE INDEX IF NOT EXISTS idx_product_embedding_cosine 
ON "Product" USING hnsw ("embedding" vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_variant_embedding_cosine 
ON "ProductVariant" USING hnsw ("embedding" vector_cosine_ops);

-- Create additional HNSW indexes for other distance functions
CREATE INDEX IF NOT EXISTS idx_product_embedding_l2 
ON "Product" USING hnsw ("embedding" vector_l2_ops);

CREATE INDEX IF NOT EXISTS idx_variant_embedding_l2 
ON "ProductVariant" USING hnsw ("embedding" vector_l2_ops);