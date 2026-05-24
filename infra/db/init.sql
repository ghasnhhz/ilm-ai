-- Runs on first container start (mounted into postgres docker-entrypoint-initdb.d).
-- Enables pgvector so material_chunks.embedding can use the vector type.
CREATE EXTENSION IF NOT EXISTS vector;
