# Module 1 advanced source changes

| Location | Change |
|---|---|
| backend/src/db/migrations/018_module1_advanced.sql | Issue embedding, priority, conversation/message tables, notifications/preferences, feedback vectors, pseudonymous customers and opt-outs |
| backend/src/intelligence/ai.ts | Gemini embeddings, cosine and grounded generation, bounded adjudication |
| backend/src/intelligence/issues.ts | Semantic/LLM assisted matching, persistent vectors, active issue filtering, resolution impact |
| backend/src/intelligence/advanced.ts | Conversation persistence, retrieval, signals, optional email, customer identity |
| backend/src/routes/intelligence.ts | Conversation, corrections, impact, notification and privacy APIs |
| backend/src/jobs/worker.ts | Automatic issue reconciliation followed by identity and alert processing |
| frontend/app/api/intelligence/[...path]/route.ts | Extended authenticated route allowlist including DELETE |
| frontend/app/issues/page.tsx | New issue tools, chat history, notifications/preferences and privacy view |
| docs/MODULE_1_ADVANCED_IMPLEMENTATION.md | Architecture, configuration, endpoint guide and limitations |

No tests, builds, migrations, or servers were run. Source changes must be verified before deployment.
