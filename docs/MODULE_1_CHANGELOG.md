# Module 1 change inventory

| File | Change |
|---|---|
| `backend/src/db/migrations/017_issue_intelligence.sql` | Issue, feedback-evidence and issue-event persistence |
| `backend/src/intelligence/issues.ts` | Conservative matching, reconciliation, metrics, evidence search and deterministic Q&A |
| `backend/src/routes/intelligence.ts` | Product-authorized issue APIs, status updates, alerts and history |
| `backend/src/server.ts` | Register routes and allow PATCH in CORS |
| `backend/src/jobs/worker.ts` | Non-blocking post-analysis issue reconciliation |
| `frontend/app/api/intelligence/[...path]/route.ts` | Authenticated JSON BFF proxy |
| `frontend/app/issues/page.tsx` | End-to-end issue investigation and action UI |
| `frontend/components/layout/AppNavRail.tsx` | Issues navigation |
| `backend/documentation/API_DOCS.md`, `frontend/docs/API_DOCS.md` | API reference updates |
| `docs/MODULE_1_ISSUE_INTELLIGENCE_IMPLEMENTATION.md` | Architecture, rollout instructions, limitations and validation |
| `README.md` | New capability and documentation link |

## Not implemented in this increment

High-recall embedding-based semantic matching, manual cluster merge/split, generative evidence-grounded chat, push/email alerts, automatically measurable remediation effectiveness, externally verified deployment. These require further engineering and validation. **Do not treat this change as a guarantee that Module 1 is production-complete.**

## Test policy

No tests, typechecking, builds, migrations, server runs or network calls were executed.
