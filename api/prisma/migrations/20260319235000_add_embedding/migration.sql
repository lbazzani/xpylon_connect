-- Add embedding column for profile matching (pgvector)
ALTER TABLE "User" ADD COLUMN "embedding" vector(1536);

-- Create index for fast cosine similarity search
CREATE INDEX "User_embedding_idx" ON "User" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Add industry field
ALTER TABLE "User" ADD COLUMN "industry" TEXT;
