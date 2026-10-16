# Module 1 — pgvector semantic search patch

## Files
Patch root paths are relative to your existing project root (`feedback-desk/`). **Merge the files into that folder**, replacing the two existing intelligence services, and adding the migration and vector search helper. Do not replace the entire project.

## Prerequisites and deployment
- Your PostgreSQL service must support the `vector` extension (pgvector), with permission to run `CREATE EXTENSION IF NOT EXISTS vector`. If the migration reports the extension is unavailable, install/enable pgvector on the server first. No application tests were run.
- Install and apply all previous migrations (001–018) first if not already present. The normal migrator applies pending migrations sequentially.
- Back up the database before applying the new migration.
- Existing embeddings are preserved in JSONB; migration `019` backfills the new `vector(768)` columns and adds HNSW cosine indexes. DB triggers keep vector columns updated on later JSONB embedding writes.
- Embedding model remains `gemini-embedding-001` with 768 dimensions (`MODULE1_EMBEDDING_MODEL`, optionally configured). Do not change dimension without a schema migration and re-embedding all data.
- Run `cd backend && npm run migrate`, then restart the backend API **and worker** processes.
- To populate missing embeddings for previously unprocessed feedback, use the existing authenticated `/api/intelligence/reconcile?product_id=<UUID>` flow or Issues > Reconcile. Already-linked feedback without stored embeddings is **not backfilled by reconciliation**; process or re-embed those separately before expecting complete semantic search.

## What changes
1. PostgreSQL `vector(768)` columns and HNSW indexes on feedback and issue embeddings.
2. Product-scoped nearest-neighbor similarity queries in `intelligence/vectorSearch.ts`.
3. AI Q&A retrieves relevant feedback using indexed vector search, then Gemini generates an evidence-grounded answer; each citation still resolves to source feedback IDs.
4. Issue reconciliation uses indexed neighbor candidates and existing LLM borderline validation and conservative lexical fallback.
5. No new frontend or public endpoint required: existing AI Q&A and Issues UI use the updated backend implementation.

## Limitations / operational considerations
- The HNSW index is global, with product filtering in the query. In very large multi-product deployments, tune HNSW `ef_search` / iterative scans or partition by tenant to avoid underfilled filtered result sets. Benchmarks are needed.
- Similarity cutoff `0.45` and issue thresholds are initial heuristics; tune with real labeled feedback. Returned passages remain untrusted and must not be treated as instructions.
- If Gemini embeddings are unavailable, Q&A falls back to a bounded lexical search; reported `method` makes this explicit. A missing pgvector schema should be treated as a migration error, not a successful semantic search.
- Prior JSONB embedding records are backfilled only when the stored value is a valid 768-element numeric array. Malformed arrays will cause the migration to fail; inspect legacy data if that happens.
- This is a source-only delivery per instruction: compilation, migrations and runtime behavior were not executed or verified.
