# Module 1 advanced customer feedback intelligence (source implementation)

## Scope and implementation state

The existing application now includes **advanced source implementations** for hybrid issue matching, grounded conversational investigation, manual issue corrections, notifications, customer pseudonyms and resolution comparisons. The supplied repository was **not** compiled, migrated, tested, or deployed at the user's request. No production-readiness claim is made.

## Architecture

- `backend/src/intelligence/ai.ts`: Gemini embedding (768-dimension) and text reasoning REST adapter, sanitized customer content, 20-second API timeout, externally configured model names.
- `backend/src/intelligence/issues.ts`: batch reconciliation from feedback rows to persistent issue records; semantic cosine threshold, optional LLM match adjudication (bounded), lexical fallback when vectors unavailable, evidence IDs, historical trend windows and resolution comparison.
- `backend/src/intelligence/advanced.ts`: persisted multi-turn Q&A; evidence retrieval; AI responses with server-controlled citation mapping; notification deduplication, Resend email delivery, customer identity pseudonymization.
- `backend/src/routes/intelligence.ts`: authenticated product-isolated REST operations with write permission and demo-account controls.
- `backend/src/jobs/worker.ts`: best-effort enrichment, customer identity association and alert delivery after feedback classification.
- `frontend/app/issues/page.tsx`: issue cards, evidence, edits, manual merge/split, conversations, notifications/preferences, pseudonymous customer controls, resolution comparisons.
- `frontend/app/api/intelligence/[...path]/route.ts`: Next.js authenticated proxy allowlist.

## Setup

1. Configure backend `.env` from `.env.example`. Supply `GEMINI_API_KEY` and existing database/Auth secrets. For email alerts, set `RESEND_API_KEY` and a verified `RESEND_FROM_EMAIL` sender. Do not commit secrets.
2. Optional: `MODULE1_EMBEDDING_MODEL=gemini-embedding-001`, `MODULE1_GENERATION_MODEL=gemini-2.5-flash`. Gemini models and access must be supported by your account.
3. Apply sequential migrations through the existing migration command (`017` before `018`) in a safe deployment environment. **Not executed while preparing this archive.**
4. Start API, frontend, and background analysis worker using the existing README instructions. These were **not run** while preparing this archive.
5. Open `/issues` and choose a product. Newly classified feedback is automatically reconciled by the worker. Older feedback may be linked by the manual Reconcile action. AI provider quotas and network availability affect completion.

## Endpoints

All paths below are under `/api/intelligence`, require authentication and `product_id` query parameter, and enforce product ownership.

| Method | Path | Purpose |
|---|---|---|
| GET | `/issues?product_id=...&days=30` | Issue list, status, priorities, evidence counts, trends |
| POST | `/reconcile?product_id=...` | Batch issue reconciliation + alerts + identity linking |
| PATCH | `/issues/:id?product_id=...` | Update status, priority, assignee, due date, investigation notes |
| GET | `/issues/:id/evidence` | Underlying feedback evidence |
| GET | `/issues/:id/history` | Change history |
| GET | `/issues/:id/impact?days=30` | Before/after observational comparison |
| POST | `/issues/:id/merge` | `{ "target_issue_id": "uuid" }` merge all evidence |
| POST | `/issues/:id/split` | `{ "feedback_id": "uuid" }` move evidence into new issue |
| POST | `/conversations` | `{ "question":"...", "conversation_id":"optional uuid" }` grounded answer |
| GET | `/conversations` | User's recent conversations |
| GET | `/conversations/:id` | User's own message history |
| GET | `/notifications` | Recent alerts |
| PATCH | `/notifications/:id` | Mark read |
| GET/PATCH | `/preferences` | Email notification opt-in and recipient |
| POST | `/alerts/refresh` | Trigger alert deduplication/delivery |
| GET | `/customers` | Pseudonymous counts, no addresses |
| DELETE | `/customers` | `{ "email":"..." }` unlink customer identity and prevent regeneration |

## Behaviors and limits

**Hybrid clustering.** Each pending feedback is embedded via Gemini when available, with a category-scoped cosine threshold of 0.84. Borderline matches (0.76–0.84) may be approved by Gemini text reasoning, bounded to eight adjudications per reconciliation call. Without embeddings, conservative Jaccard matching is used. This is approximate, not guaranteed semantic equivalence. Merge and split give human corrections. Background reconciliation makes provider calls and may be slow for batches. The first implementation caps work at 300 feedback records per request and may require repeated sweeps for legacy data.

**Conversations.** Retrieval uses a bounded snapshot of up to 350 recent evidence items per product, reranked by embedding plus lexical overlap. Up to ten feedback items feed the LLM; citations are mapped to real feedback IDs and issue IDs, with invalid bracket citations removed. The assistant does not have full historical coverage for products over the retrieval limit, and its reasoning can be imperfect. If unavailable, the API shows a fallback with evidence.

**Alerts.** Signals are deduplicated per issue/type/calendar day. An opt-in recipient may receive up to ten pending alerts per delivery pass. Delivery errors are recorded; retry needs an operator intervention to clear `email_error`. To avoid duplicates, records are reserved before invoking the email provider, which can cause missed sends if the process fails between reservation and delivery. Production should add an outbox lease/reconciliation procedure. WhatsApp is not included in Module 1.

**Customer identity.** Emails are normalized and HMAC-SHA256 pseudonymized per product. Raw feedback emails still exist in the original feedback table and remain governed by the product's existing privacy and retention controls. Unlink requests persist an opt-out tombstone. This is an application-level dissociation control, not a complete legal deletion endpoint.

**Resolution impact.** Equal pre/post day windows compare linked feedback counts and negative-label counts anchored at `resolved_at`. These metrics are descriptive and not causal; the after-period may be incomplete. Issue records remain visible if reopened (status set back to `open`).

## Known production hardening / verification work

- Full static typecheck, UI build, database migration dry-run, automated tests, integration and load testing, and security review have **not been performed**.
- Migrate embedding storage to pgvector/ANN search for large datasets and add change-aware backfilling when feedback is edited/reclassified.
- Add robust job/outbox lease recovery and email preferences enforcement at delivery retries.
- Improve clustering calibration with representative multilingual customer samples and evaluate LLM false-positive merges.
- Validate provider model availability, quotas and per-feedback embedding costs.
- Tune identity and data retention controls against real privacy obligations.
- Improve alert user experience, baseline data snapshots, and full issue workflow policies for team-level ownership.

