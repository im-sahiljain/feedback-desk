# Module 1 — Issue Intelligence Extension

## Scope

This extension builds on the existing feedback ingestion, Gemini classification, dashboards and executive briefs. It introduces **persistent issue records**, evidence links, time-window issue signals, issue-specific investigation, ownership, due dates and resolution notes, a transparent evidence-Q&A endpoint, and an in-app alerts feed.

**Honest capability boundary:** The clustering and Q&A implementations use transparent token/Jaccard and keyword retrieval, respectively. They are NOT embedding-based semantic clustering or generative conversational answers. Root-cause validation, third-party alert delivery, automated outcome attribution and human-in-the-loop cluster merge/split remain follow-on work. Do not market these as already completed. No runtime verification has been performed.

## Database migration

`backend/src/db/migrations/017_issue_intelligence.sql` adds:

- `intelligence_issues`: one unique fingerprint per product, status, owner, due date, resolution notes, first/last seen.
- `intelligence_issue_evidence`: unique feedback-to-issue relationship, cascades on deletion.
- `intelligence_issue_events`: timestamped user changes for accountability.

The project migration runner applies it in filename order. **Before deployment, back up your database and apply migration in staging.** SQL migration was not executed for this delivery.

## Backend integration

- `backend/src/intelligence/issues.ts`: product-scoped matching, idempotent backfill, time-window metrics, cited evidence retrieval, deterministic Q&A.
- `backend/src/routes/intelligence.ts`: authenticated, product-authorized API handlers; write access is prohibited for demo accounts.
- `backend/src/server.ts`: route registration and PATCH CORS support.
- `backend/src/jobs/worker.ts`: best-effort reconciliation after successful AI feedback analysis. Clustering failure does not fail an already-successful analysis job.

Reconciliation uses a PostgreSQL transaction and a product-keyed advisory lock. New feedback is assigned to one issue or becomes an issue. It processes up to 50 unmatched feedback records per newly analyzed record and 300 per manual reconcile request. Continue calling `POST /api/intelligence/reconcile` while `remaining=true` for backfills.

### API reference

All endpoints require bearer authentication. All require `product_id` query parameter with UUID and product ownership. POST and PATCH require JSON.

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/api/intelligence/issues?product_id=...&days=30` | days 7–365 | `issues[]`, `count` |
| POST | `/api/intelligence/reconcile?product_id=...` | empty | `processed`, `linked`, `remaining` |
| GET | `/api/intelligence/issues/:id/evidence?product_id=...` | — | `evidence[]` up to 150 |
| GET | `/api/intelligence/issues/:id/history?product_id=...` | — | `events[]` up to 100 |
| PATCH | `/api/intelligence/issues/:id?product_id=...` | `status`, `assignee`, `due_at`, `resolution_notes` | `issue` |
| POST | `/api/intelligence/ask?product_id=...` | `{ "question": "What is increasing?", "days": 30 }` | `answer`, `evidence[]`, `limitations`, `method` |
| GET | `/api/intelligence/alerts?product_id=...&days=30` | days 7–365 | `alerts[]`, `delivery` |

Statuses: `open`, `investigating`, `planned`, `resolved`, `dismissed`. Due date should be an ISO timestamp. Deletion is not offered; resolution and dismissal preserve evidence and history.

## Frontend integration

`frontend/app/issues/page.tsx`: responsive issue list, current-vs-prior volume, severity and trend badges, in-app attention signals, evidence Q&A, feedback source links, status controls, owner, deadline, notes and activity history. Accessible via **Issues** in `AppNavRail`.

`frontend/app/api/intelligence/[...path]/route.ts`: Next.js authenticated BFF proxy, with method/path allowlist, payload cap and existing cookie refresh behavior. Browser requests do not expose access tokens.

## Computation and confidence caveats

- Token Jaccard >=0.52 and matching category: one conservative lexical cluster. Paraphrases can be missed, category mistakes can split a true issue, and imperfect text matches can over-merge.
- `emerging`: at least 3 submissions in the selected window and more than 1.5× preceding-window count. Low sample sizes can be noisy; counts are not adjusted for overall feedback volume.
- `severity`: high if any linked feedback has High/Critical priority, medium if any negative sentiment, low otherwise. It represents evidence ranking, not proven business impact.
- The Q&A module is an explicitly labeled **deterministic evidence search**, with result IDs and no fabricated sources. It does not infer verified causes.
- Alerts are currently in-app pull-based; no background email, WhatsApp or push notifications exist.
- Reconciliation does not yet reassess already-linked items when AI classifications change. Deleting feedback automatically removes its link; stale empty issue records may remain.

## Deployment / operations

1. Review environment configuration, database backups and permissions; never commit real secrets.
2. Deploy backend and apply schema migration 017 using the existing migration workflow (outside this delivery).
3. Deploy frontend, ensuring the BFF backend URL is correct.
4. Open `/issues`, select a product and perform the initial reconcile until `remaining=false`.
5. Confirm alerts, evidence links, issue edits and processing-worker behavior in a **staging environment** prior to release.
6. Inspect queue metrics and worker logs for `Issue intelligence reconciliation delayed` warnings.
7. Plan future embedding-based deduplication, human merge/split, advanced QA, external alerting and resolution-effect measurement.

## Validation status

**Not executed** in accordance with the user's earlier instruction: no unit tests, integration tests, typecheck, build, migrations, server startup or DB requests. Changes require engineer review, staging checks and deployment approval.
