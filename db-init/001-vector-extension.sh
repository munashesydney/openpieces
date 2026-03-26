#!/bin/bash
# This runs automatically when the DB container starts (before migrations)
# Ensures pgvector extension exists for migrations that use vector type / HNSW indexes
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS vector;
EOSQL
