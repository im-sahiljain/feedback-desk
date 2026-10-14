# Business Onboarding, KYC & Legal Compliance Guide

**Purpose:** Comprehensive operational guide defining:
1. The documents required **FROM** client businesses before onboarding;
2. The documents issued **BY** FeedbackDesk requiring business signature and approval;
3. Step-by-step validation procedures and legal compliance standards.

---

## 1. Executive Matrix: Document Exchange

```
┌────────────────────────────────────────────────────────┐
│               FROM FEEDBACKDESK TO CLIENT              │
│            (Client Must Approve & Execute)             │
├────────────────────────────────────────────────────────┤
│ 1. Master Services Agreement (MSA)                     │
│ 2. Data Processing Agreement (DPA - GDPR & DPDP)       │
│ 3. Commercial Order Form / SOW (Pricing, Seats, Terms) │
│ 4. WhatsApp / Outbound Messaging Addendum (Optional)   │
└────────────────────────────────────────────────────────┘
                           ▲
                           │ Legal & Compliance Exchange
                           ▼
┌────────────────────────────────────────────────────────┐
│                FROM CLIENT TO FEEDBACKDESK             │
│            (Client Must Submit for KYC Check)          │
├────────────────────────────────────────────────────────┤
│ 1. Business Legal Registration (GST / CIN / License)   │
│ 2. Authorized Signatory Proof (Board Resolution / ID)  │
│ 3. Domain & Brand Ownership Verification               │
│ 4. Customer Messaging Consent Declaration (for WA/SMS) │
└────────────────────────────────────────────────────────┘
```

---

## 2. Documents Required FROM the Business (KYC & Due Diligence)

To prevent liability, ensure review authenticity, and avoid onboarding fraudulent review syndicates or shell companies, collect the following from each prospective business client:

### 2.1 Business Registration & Identity Proof (KYC)
| Jurisdiction | Required Documents | What It Proves |
| :--- | :--- | :--- |
| **India** | • Certificate of Incorporation (CIN) or LLP Agreement<br>• GSTIN Registration Certificate<br>• Business PAN Card<br>• Trade License or Shop & Establishment Certificate (for physical retail/restaurants) | Legitimate operational business registered under law. |
| **United States** | • Certificate of Formation / Articles of Incorporation<br>• Federal Employer Identification Number (EIN) confirmation letter (IRS)<br>• State Business License | Verified US business entity. |
| **UK / Europe** | • Companies House Certificate of Incorporation (UK)<br>• VAT Registration Number<br>• Extract from the Commercial Register (Kbis / Handelsregister) | Legitimate European enterprise. |

### 2.2 Proof of Authorized Signatory
* **What is required:** Board Resolution, Power of Attorney (PoA), or Official Letter of Authorization on corporate letterhead signed by a Director/Partner.
* **Why it matters:** Ensures the person executing the contract (Director, VP, General Manager) has valid legal capacity to bind the corporation to payment, indemnification, and data processing liabilities.

### 2.3 Brand & Domain Ownership Proof
* Verification via corporate email domain (e.g., `manager@brandname.com`, not generic `@gmail.com` without identity verification).
* Trademark registration or letter of brand authorization if collecting reviews on behalf of multiple franchise locations.

### 2.4 Customer Consent & Messaging Compliance Declaration
If the client intends to connect WhatsApp, SMS, or automated billing hooks to dispatch feedback links:
* **Written Warranty:** Client must sign a declaration confirming that:
  > *"All customer telephone numbers and contact details provided to the platform have been acquired with valid opt-in consent in accordance with applicable telecommunications regulations (TRAI DND guidelines, TCPA, and WhatsApp Business Terms of Service)."*

---

## 3. Documents Issued BY FeedbackDesk (Requiring Business Signature)

These documents are prepared by FeedbackDesk and must be formally executed by the client business:

### 3.1 Master Services Agreement (MSA)
* **File:** [`01_MASTER_SERVICES_AGREEMENT_B2B_SaaS.md`](./01_MASTER_SERVICES_AGREEMENT_B2B_SaaS.md)
* **Status:** **MANDATORY.**
* **Execution:** E-signature (DocuSign, PandaDoc) or click-through agreement upon enterprise account creation.
* **Key Terms:** SaaS license, 99.9% uptime SLA, anti-fabrication warranty, payment terms, limitation of liability, and IP protection.

### 3.2 Data Processing Agreement (DPA)
* **File:** [`02_DATA_PROCESSING_AGREEMENT_DPA.md`](./02_DATA_PROCESSING_AGREEMENT_DPA.md)
* **Status:** **MANDATORY** under GDPR Art. 28, India DPDP Act 2023, and CCPA.
* **Key Terms:** Establishes Customer as Data Controller / Fiduciary and FeedbackDesk as Data Processor; outlines sub-processors (Google GenAI, Render/PostgreSQL); specifies Technical and Organizational Security Measures (TOMs) and 48-hour breach notification.

### 3.3 Commercial Order Form / Statement of Work (SOW)
* **Status:** **MANDATORY.**
* **Details:**
  * Selected Subscription Plan (e.g., Growth / Enterprise);
  * Number of Products / Physical Locations;
  * Number of Counter QR Standee Licenses;
  * Included Monthly Active Review Quota & AI Inference Tokens;
  * Billing Frequency (Monthly / Annual) & Payment Terms (Net 30).

### 3.4 WhatsApp Outbound Messaging Addendum (If Activated)
* **Status:** Required if sending links via Meta WhatsApp Cloud API.
* **Key Terms:** Governs compliance with Meta Business Solution terms, template message approvals, rate caps, and customer opt-out processing.

---

## 4. How Signatures & Approvals Should Be Processed

For maximum legal enforceability in corporate litigation and audits:

### Option A: Digital E-Signature Platforms (Recommended for Enterprise / Mid-Market)
Use an e-signature platform compliant with the **ESIGN Act (US)**, **eIDAS (EU)**, and **Section 10A of the Information Technology Act, 2000 (India)**:
* Supported platforms: **DocuSign**, **Adobe Sign**, **PandaDoc**, or **Zoho Sign**.
* Each signed agreement automatically generates a cryptographically signed Completion Certificate capturing:
  * Signer Name & Corporate Title;
  * Email & IP Address;
  * Signature Timestamp and Hash.

### Option B: In-App Click-Through Acceptance (For Self-Serve SaaS Signups)
For businesses signing up online without bespoke sales negotiation:
* During registration or product onboarding, present an active checkbox:
  > ☑ *"I am an authorized representative of [Company Name] and agree to the [FeedbackDesk Master Services Agreement], [Data Processing Addendum], and [Privacy Policy]."*
* System must record: `user_id`, `accepted_at: TIMESTAMPTZ`, `ip_address`, and `agreement_version` in `audit_events`.

---

## 5. Regulatory Compliance Checklist for the Platform

To ensure the product complies with all domestic and international legal guidelines:

| Regulation | Jurisdiction | Product Requirement | How FeedbackDesk Complies |
| :--- | :--- | :--- | :--- |
| **DPDP Act (2023)** | India | Data Fiduciary duties, notice, grievance redressal, purpose limitation. | Single-use links, minimal data collection, PII scrubbing before AI, designated Grievance Officer. |
| **IS 19000:2022** | India (BIS) | Standard for Online Consumer Reviews: transparency, authenticity, prohibition of fake reviews. | Single-use token burn, 24-hr identical payload lock, 30-day device cooldown, no review gating. |
| **FTC 16 CFR Part 465** | United States | Final Rule on Fake Reviews: strict prohibition against fabricating reviews or suppressing negative reviews. | All reviews (positive or negative) are recorded immutably; businesses cannot alter customer feedback text. |
| **GDPR (Art. 28)** | European Union | Mandatory Controller-to-Processor contract, sub-processor disclosure, breach notification. | Complete DPA executed with all clients; automated PII redaction; TLS 1.3 + AES-256 encryption. |
| **ePrivacy Directive** | European Union | Cookie consent exemptions for functional tracking. | No ad tracking pixels; strictly functional `localStorage` security cooldowns exempt from banner popups. |
