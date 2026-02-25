-- KrewPact Migration 00004: Knowledge Vectors (MDM-Book Integration)
-- Purpose: Enable pgvector and create tables for storing embeddings from MDM-Book-Internal

BEGIN;

-- =========================
-- EXTENSIONS
-- =========================
CREATE EXTENSION IF NOT EXISTS vector;

-- =========================
-- TABLES
-- =========================

-- 1. Knowledge Documents (Source of Truth)
CREATE TABLE IF NOT EXISTS knowledge_docs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Metadata from MDM-Book
    file_path TEXT UNIQUE NOT NULL, -- e.g., '05-operations/sops/procurement.md'
    title TEXT NOT NULL,
    category TEXT, -- 'sop', 'policy', 'market', 'competitor', 'strategy'
    division_id UUID REFERENCES divisions(id) ON DELETE SET NULL,
    
    -- Content Control
    checksum TEXT, -- To track changes and avoid re-embedding unchanged files
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Knowledge Embeddings (Vectors)
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID NOT NULL REFERENCES knowledge_docs(id) ON DELETE CASCADE,
    
    -- Chunking
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL, -- The actual text chunk
    
    -- Vector (OpenAI ada-002 = 1536 dimensions)
    embedding vector(1536),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast similarity search
CREATE INDEX ON knowledge_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- =========================
-- RLS POLICIES
-- =========================
ALTER TABLE knowledge_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access to knowledge_docs" ON knowledge_docs FOR SELECT USING (true);
CREATE POLICY "Allow all read access to knowledge_embeddings" ON knowledge_embeddings FOR SELECT USING (true);

-- Only admins/system can write (enforced by app logic + service role, reusing permissive for now during setup)
CREATE POLICY "Allow all write access to knowledge_docs" ON knowledge_docs FOR ALL USING (true);
CREATE POLICY "Allow all write access to knowledge_embeddings" ON knowledge_embeddings FOR ALL USING (true);

COMMIT;
