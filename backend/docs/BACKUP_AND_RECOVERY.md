# Backup and Recovery

## What must be backed up

| Asset | Required | Notes |
|-------|----------|-------|
| PostgreSQL database | **Yes** | Source of truth for users, orgs, products, feedback, AI analyses, jobs, audit events, public destinations |
| Application secrets | **No (not in DB backups)** | Store in a secrets manager (Vault, AWS Secrets Manager, Doppler, etc.). Never commit `.env` |
| Object storage / uploads | N/A | Current release does not store binary uploads |
| Redis | N/A | Job queue is Postgres-backed |

## Recommended PostgreSQL backup practice

1. **Frequency:** Continuous WAL archiving (PITR) plus a daily full logical or snapshot backup.
2. **Retention:** Keep at least 7 daily + 4 weekly + 3 monthly copies for SaaS customer data.
3. **Encryption:** Encrypt backups at rest (provider-managed or client-side). Encrypt in transit (TLS).
4. **Access:** Restrict restore credentials to on-call / platform roles only.
5. **Testing:** Perform a restore drill at least quarterly into a non-production environment and verify:
   - migrations table is intact
   - a sample organization can sign in
   - public feedback destination still resolves
   - queued jobs can be resumed

## Logical backup example (provider-agnostic)

```bash
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl -f feedback_desk_$(date -u +%Y%m%dT%H%M%SZ).dump
```

Restore:

```bash
pg_restore --clean --if-exists --no-owner --no-acl -d "$DATABASE_URL" feedback_desk_YYYYMMDD.dump
```

After restore:

```bash
cd backend && npm run migrate
```

## Background jobs after restore

Jobs live in `background_jobs`. After restore:

- Jobs in `processing` with stale `locked_at` may need to be reset to `queued` / `retrying`.
- Feedback rows with `processing_status = analyzing` should be moved back to `queued` and re-enqueued if needed.
- Do **not** invent AI results; reprocess from stored original feedback text.

Example recovery SQL (run only during incident recovery):

```sql
UPDATE background_jobs
SET status = 'queued', locked_by = NULL, locked_at = NULL, available_at = now()
WHERE status = 'processing' AND locked_at < now() - interval '30 minutes';

UPDATE feedbacks
SET processing_status = 'queued', status = 'queued', queued_at = now()
WHERE processing_status = 'analyzing' AND analyzing_at < now() - interval '30 minutes';
```

## Secrets are NOT stored in backups/config files

- `.env` is gitignored and must not appear in Docker images or release archives.
- Rotate `JWT_SECRET`, `OTP_HMAC_SECRET`, `LINK_SECRET`, AI keys, and email keys independently of DB restores.
- Rotating `JWT_SECRET` invalidates access tokens (users refresh or re-login).
- Rotating `LINK_SECRET` invalidates **legacy** signed URLs; opaque `/f/{token}` destinations are DB-backed and unaffected.
- Rotating `OTP_HMAC_SECRET` invalidates outstanding OTP challenges (users request a new code).

## Data retention / deletion

- Products and feedback support soft-delete (`deleted_at`) for operational recovery.
- Organization deletion should be initiated by an owner and cascades membership, products, destinations, and related rows per FK rules.
- Audit events may be retained longer for security investigations; purge policies should be defined per compliance needs.
- Document customer deletion requests as organization-scoped hard delete after soft-delete confirmation window.
