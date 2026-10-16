-- Requires PostgreSQL with the pgvector extension available to the database owner.
-- Upgrade-in-place: retain original JSONB embedding columns for backward compatibility.
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE intelligence_feedback_embeddings ADD COLUMN IF NOT EXISTS embedding_vector vector(768);
ALTER TABLE intelligence_issues ADD COLUMN IF NOT EXISTS embedding_vector vector(768);
-- Backfill previously generated vectors. JSONB numeric arrays cast to pgvector's vector text input.
UPDATE intelligence_feedback_embeddings SET embedding_vector = embedding::text::vector(768)
 WHERE embedding_vector IS NULL AND jsonb_typeof(embedding)='array' AND jsonb_array_length(embedding)=768;
UPDATE intelligence_issues SET embedding_vector = embedding::text::vector(768)
 WHERE embedding_vector IS NULL AND embedding IS NOT NULL AND jsonb_typeof(embedding)='array' AND jsonb_array_length(embedding)=768;
-- Cosine-distance HNSW approximate nearest-neighbor indexes; product_id remains a mandatory query filter.
CREATE INDEX IF NOT EXISTS idx_feedback_embedding_vector_hnsw
 ON intelligence_feedback_embeddings USING hnsw (embedding_vector vector_cosine_ops)
 WHERE embedding_vector IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issue_embedding_vector_hnsw
 ON intelligence_issues USING hnsw (embedding_vector vector_cosine_ops)
 WHERE embedding_vector IS NOT NULL AND merged_into IS NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_embedding_product ON intelligence_feedback_embeddings(product_id);
-- Synchronize SQL vectors on every JSONB write, including existing processing and subsequent upserts.
CREATE OR REPLACE FUNCTION intelligence_sync_vector() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='intelligence_feedback_embeddings' THEN
    NEW.embedding_vector := CASE WHEN NEW.embedding IS NOT NULL AND jsonb_typeof(NEW.embedding)='array' AND jsonb_array_length(NEW.embedding)=768
      THEN NEW.embedding::text::vector(768) ELSE NULL END;
  ELSE
    NEW.embedding_vector := CASE WHEN NEW.embedding IS NOT NULL AND jsonb_typeof(NEW.embedding)='array' AND jsonb_array_length(NEW.embedding)=768
      THEN NEW.embedding::text::vector(768) ELSE NULL END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS intelligence_feedback_vector_sync ON intelligence_feedback_embeddings;
CREATE TRIGGER intelligence_feedback_vector_sync BEFORE INSERT OR UPDATE OF embedding
 ON intelligence_feedback_embeddings FOR EACH ROW EXECUTE FUNCTION intelligence_sync_vector();
DROP TRIGGER IF EXISTS intelligence_issue_vector_sync ON intelligence_issues;
CREATE TRIGGER intelligence_issue_vector_sync BEFORE INSERT OR UPDATE OF embedding
 ON intelligence_issues FOR EACH ROW EXECUTE FUNCTION intelligence_sync_vector();
