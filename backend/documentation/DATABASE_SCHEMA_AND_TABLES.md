# FeedbackDesk Database Schema & Tables Architecture

This document describes the active PostgreSQL database tables in FeedbackDesk, why and when they were created, how the application uses them, what data they store, and which legacy tables were removed.

---

## 1. Active Tables Overview (11 Tables)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FeedbackDesk Database                           │
└────────────────────────────────────────────────────────────────────────┘
    │
    ├── 1. Identity & Auth Tier
    │   ├── users                  (Platform accounts & owners)
    │   ├── auth_otp_challenges    (Passwordless email login OTPs)
    │   └── auth_sessions          (Persistent refresh tokens & sessions)
    │
    ├── 2. Business & Intake Tier
    │   ├── products               (Tracked products & AI taxonomy)
    │   ├── feedback_invitations   (Single-use share links & Counter QR)
    │   └── feedbacks              (Customer reviews & AI classifications)
    │
    ├── 3. Asynchronous AI Worker Tier
    │   ├── background_jobs        (Durable task queue with row-level locks)
    │   ├── ai_processing_metrics  (Gemini latency, token usage & cost)
    │   └── executive_briefs       (Cached AI executive digest summaries)
    │
    └── 4. Governance & Tooling Tier
        ├── audit_events           (Security and administrative audit trail)
        └── schema_migrations      (Migration version tracker)
```

---

## 2. Detailed Table Specification

| # | Table Name | Created In / When | Why It Was Created | How It Is Used in the Product | What It Stores |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **`users`** | Migration `001` (Baseline) | Root identity for admins and product owners. | Authenticates users into the management console; establishes ownership of products. | User UUID, email address, password hash (optional for passwordless), email verification status, account status (`active`), and timestamps. |
| **2** | **`auth_otp_challenges`** | Migration `001` (Baseline) | Secure passwordless email login authentication. | When a user enters their email to log in, a cryptographically secure 6-digit OTP is hashed and saved here. Validates codes with a 10-minute expiry and 5-attempt brute-force protection. | Challenge UUID, target email, bcrypt OTP hash, attempt count, expiry timestamp, and request IP. |
| **3** | **`auth_sessions`** | Migration `001` (Baseline) | Maintain persistent, revocable login sessions. | Issues and rotates secure HTTP-only refresh tokens so admins remain logged in securely across browser restarts and device changes. | Session UUID, user ID, SHA-256 refresh token hash, user agent, IP address, expiration date, and revocation timestamp. |
| **4** | **`products`** | Migration `001` (Baseline) | Core business entity being reviewed. | Organizes reviews by product/service; powers dashboard analytics, AI prompt parameters, and Counter QR standees. | Product UUID, owner user ID, product name, industry taxonomy, description, custom settings JSON, and soft delete timestamp. |
| **5** | **`feedback_invitations`** | Migrations `011` & `012` | Single-use 1-on-1 links & Counter QR dispenser. | Created when an admin clicks **Share** (`<Share2 />`) or when a customer scans a **Counter QR Standee** (`/f/scan/:id`). Burns on submit. | Unique 24-byte unguessable token, product UUID, status (`'active'`, `'completed'`), submitted timestamp, and linked feedback UUID. |
| **6** | **`feedbacks`** | Migration `001` (extended in `004`, `011`) | Core customer feedback and review repository. | Stores customer reviews, ratings, and Google Gemini AI classifications (sentiment, categories, priorities, urgency, action items). | Feedback UUID, product UUID, review text, 1–5 star rating, customer email (optional), sentiment label, priority label, AI categories array, and metadata. |
| **7** | **`background_jobs`** | Migration `004` (Jobs Lifecycle) | Decouple heavy Google Gemini AI processing from customer HTTP requests. | Worker processes queue jobs using row locking (`FOR UPDATE SKIP LOCKED`). Automatically retries failed jobs up to 5 times. | Job UUID, job type (`JOB_ANALYZE_FEEDBACK`), status (`queued`, `processing`, `completed`, `failed`), payload JSON, retry count, and lock timestamps. |
| **8** | **`ai_processing_metrics`** | Migration `004` (Jobs Lifecycle) | Operator observability, Gemini latency, token tracking, and cost control. | Written after every AI analysis run to track prompt versions, execution latency, and token consumption costs. | Metric UUID, feedback UUID, model name (`gemini-2.5-flash`), latency in ms, prompt version, input/output token counts, and cost in USD. |
| **9** | **`executive_briefs`** | Migration `001` (extended in `007`) | High-level AI summary reports for leadership. | Caches precomputed 7-day, 30-day, and 90-day executive summaries so opening the analytics dashboard is instantaneous. | Brief UUID, product UUID, time period (`7d`, `30d`, `90d`, `all`), structured JSON brief (strengths, pain points, recommendations), and metrics. |
| **10** | **`audit_events`** | Migration `005` (Audit Retention) | Security and regulatory audit trail. | Automatically records administrative actions (e.g. product created, feedback deleted, invite generated, login). | Event UUID, actor user ID, action name, resource type, resource ID, IP address, user agent, and contextual JSON metadata. |
| **11** | **`schema_migrations`** | Migration Runner (`migrate.ts`) | Version control for database schema. | Ensures migrations execute strictly once, in chronological order, idempotently across local and production environments. | Migration ID filename (e.g., `001_baseline_schema`, `013_drop_legacy_public_destinations`) and execution timestamp. |

---

## 3. Removed / Deprecated Tables

The following tables were evaluated, found to be obsolete, and **permanently dropped** in Migration `013`:

* **`public_feedback_destinations`** *(DROPPED in Migration `013`)*:
  * *Original Purpose:* Generic multi-use public links (`/f/:token`).
  * *Reason for Removal:* User explicitly eliminated generic multi-use public links in favor of single-use 1-on-1 links (`feedback_invitations`) and dynamic counter QR dispensers.
* **`public_submit_fingerprints`** *(DROPPED in Migration `013`)*:
  * *Original Purpose:* IP rate-limiting tracker for generic public links.
  * *Reason for Removal:* Replaced by the 5-layer anti-spam pipeline (Layer 1 browser-level 30-day cooldown + Layer 4 database-level email cooldown).
* **`feedbacks.public_destination_id`** *(DROPPED in Migration `013`)*:
  * *Reason for Removal:* Foreign key reference to the dropped `public_feedback_destinations` table.

---

## 4. Streamlined `feedbacks` Table (Migrations `014` & `015`)

In Migrations `014` and `015`, duplicate telemetry, unused retry keys, and legacy columns were permanently dropped from `feedbacks` to produce a lean, normalized schema:
* **Dropped in Migration `014`:** `model_provider`, `model_name`, `prompt_version`, `schema_version`, `processing_latency_ms`, `provider_request_id`, `labels`, and `processed_at`.
* **Dropped in Migration `015`:**
  * `idempotency_key`: Redundant because single-use invitation tokens naturally enforce write-once idempotency (Layer 3 atomic token burn).
  * `analysis_version`: Redundant on `feedbacks` because prompt versions and analysis pipelines are canonically tracked in **`ai_processing_metrics`** and in `raw_ai_metadata`.
* **Where Telemetry Is Stored Now:**
  * Engineering telemetry (model provider, model name, inference latency, prompt versions, tokens, and cost) is canonically tracked in **`ai_processing_metrics`**.
  * Complete raw AI inference output (including summary, aspects, root causes, and action items) is stored in **`feedbacks.raw_ai_metadata`** (`jsonb`).


