# FeedbackDesk Privacy Policy

**Effective Date:** October 2026  
**Last Updated:** October 2026

FeedbackDesk Technologies ("**FeedbackDesk**", "**We**", "**Us**", or "**Our**") operates the FeedbackDesk customer intelligence platform. This Privacy Policy describes how we collect, use, store, and protect information when:
1. Business clients and their staff ("**Business Users**") create accounts and manage products on our platform; and
2. End consumers ("**Reviewers**" or "**Consumers**") submit feedback and ratings through single-use invitation links (`/f/invite/:token`) or physical Counter QR standees (`/f/scan/:productId`).

---

## 1. Information We Collect

### 1.1 From Business Users (Account Holders)
* **Account Identifiers:** Name, business email address, organization/company name.
* **Authentication Data:** Encrypted passwords, one-time passcode (OTP) challenge records, session tokens.
* **Audit & Telemetry:** IP address, user agent, browser headers, and administrative actions (link creation, role updates, data exports).

### 1.2 From End Consumers (Feedback Submissions)
We adhere strictly to the principle of **Data Minimization (GDPR Art. 5(1)(c) and India DPDP Act Sec. 6)**:
* **Feedback Content:** Qualitative text written in the review box, optional star rating (1 to 5).
* **Optional Email:** Provided voluntarily by the consumer for follow-up or verification.
* **Functional Anti-Spam Tokens:**
  * Single-use cryptographic token (`token`) issued for the visit.
  * Internal SHA-256 content deduplication hash (`submission_fingerprint`) used exclusively to prevent duplicate review spam within a 24-hour window.
  * Browser local device flag (`localStorage` entry `product_submitted_<productId>`) storing submission timestamp to prevent accidental repeat submissions for 30 days.
* **What We DO NOT Collect:**
  * ❌ NO hardware device fingerprinting (no Canvas, WebGL, or AudioContext scraping).
  * ❌ NO battery status or sensor tracking.
  * ❌ NO cross-site advertising cookies or third-party tracking pixels.

---

## 2. How We Use Information & Legal Basis

| Data Use Purpose | Categories of Data | Legal Basis (GDPR / DPDP) |
| :--- | :--- | :--- |
| **Delivering Feedback to the Business** | Review text, star rating, optional email | Legitimate Interests / Performance of Contract |
| **Preventing Fake Reviews & Spam** | Single-use token, 24h content fingerprint, 30d device flag | Legitimate Interests (Fraud Prevention & Integrity) |
| **AI Categorization & Taxonomy** | Sanitized feedback text (PII scrubbed) | Legitimate Interests (Service enhancement) |
| **Administrative Access & Security** | Business User email, OTPs, audit logs | Contract Performance & Legal Compliance |

---

## 3. Automated PII Sanitization & AI Processing

Before any consumer feedback text is analyzed by our artificial intelligence pipeline (Google Gemini 2.5 Flash):
1. **Automated Redaction:** The feedback text passes through an automated sanitization filter (`sanitizeForAi`) that redacts credit card numbers, payment card PANs, Aadhaar/SSN patterns, private API keys, and phone numbers.
2. **Confidential AI Inference:** Data processed by Gemini via Google GenAI enterprise endpoints is not used to train public machine learning foundation models.

---

## 4. Cookies & Local Storage

* **Exempt from Cookie Banners:** FeedbackDesk does not employ third-party advertising or marketing tracking cookies.
* **Functional Local Storage:** We use HTML5 `localStorage` purely for anti-spam security (enforcing a 30-day device cooldown per product). Under the EU ePrivacy Directive (Directive 2002/58/EC Art. 5(3)) and global privacy standards, strictly functional security identifiers are exempt from consent banner requirements.

---

## 5. Data Retention & Deletion

* **Feedback Records:** Retained for the duration of the subscribing Business User's contract. Soft-deleted immediately upon user request and permanently purged during automated database retention cycles.
* **Audit Logs:** Security audit records in `audit_events` are retained for up to twelve (12) months for fraud detection, access verification, and compliance auditing.

---

## 6. Your Rights (Data Subject Rights)

Depending on your jurisdiction (under GDPR, UK GDPR, California CCPA/CPRA, or India DPDP Act 2023), you have the right to:
1. **Access:** Request a copy of personal information held about you.
2. **Rectification:** Request correction of inaccurate information.
3. **Erasure ("Right to be Forgotten"):** Request deletion of your feedback submission or account.
4. **Objection & Restriction:** Object to processing based on legitimate interests.
5. **Grievance Redressal (India DPDP Act):** Contact our designated Grievance Officer regarding data protection concerns.

To exercise any of these rights, email us at: `privacy@feedbackdesk.com`.

---

## 7. Contact & Grievance Officer

**FeedbackDesk Technologies**  
Attn: Data Protection & Grievance Officer  
Email: `privacy@feedbackdesk.com` / `dpo@feedbackdesk.com`
