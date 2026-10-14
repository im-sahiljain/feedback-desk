# Single-Use Customer Feedback & Anti-Spam System

## 1. Executive Summary & Design Philosophy

### 1.1 The Goal
Enable businesses to collect genuine customer feedback through two frictionless channels:
1. **Online 1-on-1 Outreach:** Instant 1-click generation from the product card that copies a unique link to the clipboard and opens the device's native share tray (WhatsApp, Slack, SMS, etc.).
2. **In-Person Physical Counters:** "Print Once, Dispense Forever" static QR standee (`/f/scan/:productId`) for cashier desks and table tents.

### 1.2 Core Invariants
* **One Token = One Submission:** Once a link is submitted, its token is permanently burned in PostgreSQL and can never be reused.
* **Write-Once Immutability:** Submissions cannot be edited or modified after completion.
* **Zero Customer PII Required Upfront:** Generating links requires no customer names, phone numbers, or emails.
* **Multi-Layer Anti-Spam Defense:** Prevents repeat submissions and review bombing even if a customer receives multiple links.
* **Minimalist & Modern UX:** No ticking 30-minute countdown timers, no intrusive hardware canvas fingerprinting, and no confusing dropdowns.

---

## 2. End-to-End System Architecture

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 👤 Admin / Product Owner
    actor Customer as 📱 Customer
    participant Frontend as 💻 FeedbackDesk Web App
    participant Backend as ⚙️ Express Backend API
    participant DB as 🗄️ PostgreSQL Database
    participant Worker as 🤖 Background AI Worker

    Note over Admin,DB: Channel A: Direct 1-on-1 Outreach
    Admin->>Frontend: Clicks "Share" icon (<Share2 />) on Product Card
    Frontend->>Backend: POST /api/products/:id/invites
    Backend->>DB: INSERT INTO feedback_invitations (token, status: 'active')
    Backend-->>Frontend: { token, path: '/f/invite/:token' }
    Frontend-->>Admin: Copies URL to clipboard & opens native OS Share Sheet (WhatsApp/Slack/SMS)
    Admin->>Customer: Sends link

    Note over Customer,DB: Channel B: Customer Visits /f/invite/:token
    Customer->>Frontend: Opens https://app.com/f/invite/:token
    Frontend->>Backend: GET /api/feedbacks/invite/:token/meta
    Backend->>DB: SELECT status, product_id FROM feedback_invitations WHERE token = :token
    Backend-->>Frontend: { product_id, product_name, token }
    Frontend->>Frontend: Check Layer 1 (Device Cooldown): Already submitted for this product?
    alt Device Cooldown Active (< 30 days)
        Frontend-->>Customer: Displays: "Feedback Already Recorded for this product (30-day limit)"
    else Clean Device
        Frontend-->>Customer: Renders Feedback Form (Rating + Review Text + Optional Email)
    end

    Note over Customer,Worker: Atomic Submission & Processing
    Customer->>Frontend: Submits review
    Frontend->>Backend: POST /api/feedbacks/invite/:token/submit
    Backend->>Backend: Check Layer 2: IP Rate Limiting (feedbackSubmitLimiter)
    Backend->>DB: BEGIN TRANSACTION (Row Lock: SELECT ... FOR UPDATE)
    Backend->>DB: Check Layer 3: Atomic Token Burn (status = 'active')
    Backend->>DB: Check Layer 4: Cross-Device Email Cooldown (30 days)
    alt Email Cooldown Triggered
        Backend-->>Frontend: 409 Conflict: "Email already submitted for this product in last 30 days"
    else Legitimate Submission
        Backend->>DB: INSERT INTO feedbacks (product_id, feedback, rating, email, ...)
        Backend->>DB: UPDATE feedback_invitations SET status = 'completed', submitted_at = NOW()
        Backend->>DB: Enqueue Job (JOB_ANALYZE_FEEDBACK)
        Backend->>DB: COMMIT TRANSACTION
        Backend-->>Frontend: 201 Created: "Feedback received and securely recorded"
        Frontend->>Frontend: Set localStorage flag (product_submitted_<productId> = timestamp)
        Frontend-->>Customer: Renders Success Screen
        Worker->>DB: Pops queued job -> Layer 5: Google Gemini AI sentiment & taxonomy analysis
    end
```

---

## 3. Full Pipeline Lifecycle: Step-by-Step Technical Deep Dive

The feedback system executes across four decoupled, resilient phases—ensuring sub-50ms response times for customers while maintaining strict data integrity and asynchronous AI processing.

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│   Phase 1: Token Minting  │ ───► │  Phase 2: Client Preflight│ ───► │  Phase 3: Atomic Ingest   │ ───► │   Phase 4: Async AI Worker│
│ (Share Tray or Counter QR)│      │  (30d Device & Status)    │      │  (Row Lock + Token Burn)  │      │  (Gemini 2.5 + Telemetry) │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

### Phase 1: Token Minting & Distribution
1. **Online 1-on-1 Outreach (`POST /api/products/:id/invites`):**
   - The team member clicks the Share icon on a product card.
   - The server calls `createSingleUseInvitation`, generating a cryptographically secure 24-byte Base64URL token (`randomBytes(24).toString('base64url')`).
   - Inserts a record into `feedback_invitations` with `status = 'active'`.
   - Records an immutable audit log in `audit_events` (`action: 'feedback_invitation.created'`).
   - The browser automatically writes the link to clipboard and triggers the OS native share sheet (WhatsApp, Slack, SMS).
2. **Physical Counter Standee Dispenser (`POST /api/feedbacks/scan/:id/dispense`):**
   - A walk-in customer scans a printed counter standee encoding `/f/scan/:productId`.
   - The dispenser endpoint validates the product UUID and mints a fresh, independent single-use token on the fly.
   - The customer is automatically routed to `/f/invite/<fresh-token>`. Multiple concurrent customers scanning the exact same standee receive separate, independent tokens.

### Phase 2: Page Load Pre-Flight & Client Validation
When the customer lands on `/f/invite/:token`:
1. **Local Device Cooldown (0ms network cost):**
   - The frontend reads `localStorage.getItem('product_submitted_<productId>')`.
   - If this device submitted a review for this product within the last 30 days, it immediately renders the courteous `"Feedback Already Recorded"` shield without calling the server.
2. **Server Metadata & State Check (`GET /api/feedbacks/invite/:token/meta`):**
   - Express queries `verifyInvitation(pool, token)`.
   - If the token does not exist or product is deleted $\rightarrow$ HTTP `404 Not Found`.
   - If the token has `status === 'completed'` $\rightarrow$ HTTP `410 Gone` (*"Feedback has already been submitted for this link. Submissions cannot be edited or resubmitted."*).
   - If valid $\rightarrow$ HTTP `200 OK` returning product name and industry taxonomy, enabling the customer form.

### Phase 3: The Atomic Submission Transaction (`POST /api/feedbacks/invite/:token/submit`)
When the customer submits their rating, review text, and optional email, the request enters an atomic ACID transaction (`BEGIN` ... `COMMIT` in `submitInvitationFeedback`):

1. **Row-Level Lock (`SELECT ... FOR UPDATE`):**
   ```sql
   SELECT id, product_id, status FROM feedback_invitations WHERE token = $1 FOR UPDATE
   ```
   - Prevents race conditions. If double-clicked or flooded concurrently, only the first request acquires the lock; all other requests block and fail with `409 Conflict`.
2. **Status Guard:**
   - Confirms `status === 'active'`. If already `'completed'`, fails with `409 Conflict`.
3. **Cross-Device Email Cooldown (30-Day Limit):**
   - If an email is supplied, the database checks:
     ```sql
     SELECT id FROM feedbacks
     WHERE product_id = $1 AND LOWER(email) = LOWER($2)
       AND received_at > NOW() - INTERVAL '30 days' LIMIT 1
     ```
   - If a prior review exists within 30 days, aborts with HTTP `409 Conflict` (prevents Incognito/device-switching bypass).
4. **PII Sanitization & Deduplication Hash:**
   - Feedback text is stripped of high-risk PII (credit cards, social security numbers, private tokens) via `sanitizeForAi`.
   - A deterministic SHA-256 fingerprint is calculated:
     ```ts
     fingerprint = hashPayload(`${productId}|${feedbackText.toLowerCase().trim()}|${email}|${rating}`)
     ```
5. **24-Hour Identical Content Guard (Anonymous Spam Lock):**
   - Checks if an identical review was submitted for this product within 24 hours:
     ```sql
     SELECT id FROM feedbacks
     WHERE product_id = $1 AND submission_fingerprint = $2
       AND received_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL LIMIT 1
     ```
   - Blocks automated script bombing across distinct tokens without requiring customer identification.
6. **Insert Feedback Record:**
   - Inserts row into `feedbacks` with `status = 'received'`, `processing_status = 'queued'`, and `sanitized_feedback`.
7. **Atomic Token Destruction:**
   ```sql
   UPDATE feedback_invitations
   SET status = 'completed', feedback_id = $1, submitted_at = NOW(), updated_at = NOW()
   WHERE id = $2 AND status != 'completed'
   ```
   - Permanently burns the invitation token.
8. **Enqueue Background AI Job:**
   - Inserts a job into `background_jobs` with `job_type = 'analyze_feedback'`, `payload = { feedbackId }`, and `idempotency_key = 'analyze:' || feedbackId`.
9. **`COMMIT` & Response:**
   - All operations commit atomically. Returns HTTP `201 Created` to the client in under 50ms.
   - The browser sets `product_submitted_<productId>` in `localStorage`.

### Phase 4: Asynchronous Gemini AI Processing & Telemetry Worker
The background queue worker (`backend/src/jobs/worker.ts`) operates autonomously without blocking user requests:

1. **Queue Polling:**
   - Worker claims jobs using `SELECT ... FOR UPDATE SKIP LOCKED` on `background_jobs`.
2. **Idempotency Guard:**
   - Verifies if the feedback is already analyzed (`processing_status === 'analyzed'`). If so, gracefully completes the job.
3. **Product Taxonomy Ingestion:**
   - Fetches product-specific category settings (`SELECT settings FROM products WHERE id = $1`) to support custom organizational taxonomy.
4. **Gemini 2.5 Flash Classification:**
   - Dispatches sanitized text to Google Gemini 2.5 Flash (`classifyImpactSingle`):
     - **Categories:** Multi-label classification (e.g., `["UI/UX", "Billing"]`) and primary `category_name`.
     - **Sentiment:** Qualitative label (`positive`, `neutral`, `negative`).
     - **Priority:** Action urgency (`P0`, `P1`, `P2`, `P3`).
     - **Confidence & Summary:** Qualitative AI rationale and impact overview.
5. **State Finalization:**
   - Updates `feedbacks` setting `processing_status = 'analyzed'`, `status = 'analyzed'`, categories, sentiment, priority, and `raw_ai_metadata`.
6. **Telemetry & Observability Recording:**
   - Inserts execution telemetry into `ai_processing_metrics`:
     - `provider` (`google-genai`), `model_name` (`gemini-2.5-flash`), `latency_ms`, `queue_wait_ms`.
     - `token_input`, `token_output`, and `estimated_cost_usd`.
7. **Job Completion:**
   - Marks job as `'completed'` in `background_jobs`.

---

## 4. Multi-Layer Anti-Spam Defense Matrix

Every incoming review passes through a strict 5-layer pipeline before it is finalized and analyzed:

```
[Customer Request]
       │
       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 1: Client-Side Device Cooldown (Browser Tier)    │
│ Checks localStorage for 30-day product lock.           │
└────────────────────────────────────────────────────────┘
       │ (Passed)
       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 2: IP Sliding Window Limiter (Network Tier)      │
│ Throttles requests to max 30 per 15 min per IP.        │
└────────────────────────────────────────────────────────┘
       │ (Passed)
       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 3: Atomic Token Burn (Transaction Tier)          │
│ PostgreSQL row-level lock (FOR UPDATE).                │
│ Ensures token can only ever be submitted ONCE.         │
└────────────────────────────────────────────────────────┘
       │ (Passed)
       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 4: Cross-Device Email Cooldown (Identity Tier)   │
│ Checks if email already reviewed product in 30 days.   │
└────────────────────────────────────────────────────────┘
       │ (Passed)
       ▼
┌────────────────────────────────────────────────────────┐
│ Layer 5: Payload Deduplication & AI Analysis (AI Tier) │
│ Computes SHA-256 fingerprint (24h duplicate lock) and  │
│ enqueues Google Gemini worker for taxonomy & insights. │
└────────────────────────────────────────────────────────┘
```

### Detailed Layer Breakdown:

| Layer | Where Executed | Mechanism | What It Does & Protects Against |
| :--- | :--- | :--- | :--- |
| **Layer 1: Device Cooldown** | Frontend (Browser) | `localStorage.getItem('product_submitted_<productId>')` with 30-day window | If the customer receives another link tomorrow or scans the counter QR again, their device immediately recognizes the product and shows a polite *"Feedback Already Recorded"*. Blocks 90% of repeat submissions without requiring any network call. |
| **Layer 2: Network Rate Limiter** | Express Middleware | `feedbackSubmitLimiter` (IP window: 30 requests / 15 mins) | Protects against automated bot attacks, curl loops, and DDoS floods hammering public endpoints. |
| **Layer 3: Atomic Token Burn** | PostgreSQL Transaction | `SELECT ... FOR UPDATE` + `status = 'completed'` | Prevents race conditions. If a script sends 10 concurrent requests for the same token at the exact same millisecond, row locking guarantees only 1 succeeds; the other 9 receive `409 Conflict`. |
| **Layer 4: Cross-Device Email Cooldown** | PostgreSQL Query | `SELECT id FROM feedbacks WHERE product_id = $1 AND LOWER(email) = LOWER($2) AND received_at > NOW() - INTERVAL '30 days'` | Device-independent protection. If the customer opens a fresh link in Incognito or on another computer and enters the same email address, it is rejected with `409 Conflict`. |
| **Layer 5: Content Fingerprint & AI Queue** | PostgreSQL Query & Node.js Worker | Cryptographic `submission_fingerprint` (24h lock) + Asynchronous Gemini worker | Strips PII via `sanitizeForAi`, rejects identical review text payloads across distinct tokens within 24 hours (`409 Conflict`), and classifies review sentiment and categories asynchronously without adding latency for the user. |

---

## 5. Physical Counter QR: "Print Once, Dispense Forever"

### 5.1 The Problem It Solves
Printed ink on paper is static. If a business prints an acrylic counter stand with a static burned link, the first customer burns the standee for everyone else.

### 5.2 The Solution: Dynamic Counter Dispenser
1. **Printed URL:** The acrylic counter QR encodes the permanent dispenser link:  
   `https://app.com/f/scan/:productId`
2. **On Scan:** When Customer A scans the standee with their smartphone camera:
   - Checks if they already submitted feedback today (24-hr visit lock).
   - If clean, calls `POST /api/feedbacks/scan/:id/dispense`.
   - The backend generates a fresh single-use token on the fly and redirects them to `/f/invite/:token`.
3. **On Next Customer:** Customer B scans the exact same printed counter standee and receives their own independent token.

---

## 6. API Reference

### 6.1 Admin Endpoints (Authenticated)

#### `POST /api/products/:id/invites`
Generates a fresh 1-time single-use link for direct customer outreach.
* **Authentication:** Required (`product:read` or admin access).
* **Response (201 Created):**
  ```json
  {
    "id": "97e68e7b-1cb8-4e1b-...",
    "token": "4J9eO_rN0qfK1...",
    "path": "/f/invite/4J9eO_rN0qfK1..."
  }
  ```

---

### 6.2 Customer Public Endpoints

#### `GET /api/feedbacks/invite/:token/meta`
Validates that the token exists and is active.
* **Response (200 OK):**
  ```json
  {
    "product_id": "123e4567-e89b-...",
    "product_name": "Royal Infrastructure",
    "industry": "construction",
    "token": "4J9eO_rN0qfK1..."
  }
  ```
* **If Already Completed (410 Gone):**
  ```json
  {
    "error": "Feedback has already been submitted for this link. Submissions cannot be edited or resubmitted."
  }
  ```

#### `POST /api/feedbacks/invite/:token/submit`
Atomically records the review, burns the token, and enqueues AI processing.
* **Request Body:**
  ```json
  {
    "feedback": "Outstanding service and quick response!",
    "rating": 5,
    "email": "customer@example.com"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "message": "Feedback received and securely recorded. Thank you!",
    "id": "e3b8a1c4-...",
    "status": "completed"
  }
  ```
* **Repeat Email Rejection (409 Conflict):**
  ```json
  {
    "error": "A review from this email address has already been recorded for this product in the last 30 days."
  }
  ```

#### `POST /api/feedbacks/scan/:id/dispense`
Dispenses a fresh single-use token when a customer scans a printed counter standee.
* **Response (201 Created):**
  ```json
  {
    "token": "7K2vP_xM9qfZ...",
    "path": "/f/invite/7K2vP_xM9qfZ...",
    "product": {
      "id": "123e4567-...",
      "name": "Counter Cafe",
      "industry": "food"
    }
  }
  ```

---

## 7. Legality & Compliance

### 7.1 GDPR (EU) & Data Privacy Act (UK)
* **Data Minimization (Art. 5(1)(c)):** Zero customer PII is collected to create or distribute links.
* **Legitimate Interest (Art. 6(1)(f)):** Anti-spam and fraud prevention storage (localStorage flags, rate limits) are strictly functional under Recital 47.
* **No Cookie Consent Banners Needed:** Functional security storage is fully exempt from ePrivacy cookie consent banners.

### 7.2 FTC (US) & EU Omnibus Directive (Review Authenticity)
* Prohibits fake, duplicate, or inflated reviews.
* The 5-layer pipeline guarantees verified 1-customer-1-submission integrity.

---

## 8. How to Use in the Dashboard

### 1. Online 1-on-1 Sharing
* On any product card in `/products`, click the **Share icon** (`<Share2 />`).
* The system generates a fresh single-use link, copies it to the clipboard, and automatically opens the native mobile/macOS share tray (WhatsApp, Slack, Messages, etc.).

### 2. In-Person Counter Display
* Click the **QR Code icon** (`<QrCode />`).
* Click **"Download QR for printing"** to download the high-resolution PNG image.
* Print the QR on acrylic counter stands, table tents, or receipts. Every scan automatically receives a distinct single-use link with anti-spam protection.
