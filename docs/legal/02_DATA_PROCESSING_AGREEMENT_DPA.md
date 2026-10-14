# Data Processing Agreement (DPA)

**Effective Date:** Concurrently with the Master Services Agreement (MSA).

This Data Processing Agreement ("**DPA**") supplements and forms an integral part of the Master Services Agreement ("**Principal Agreement**" or "**MSA**") entered into by and between **FeedbackDesk Technologies** ("**Processor**" or "**Data Processor**") and the customer entity agreed to the MSA ("**Controller**" or "**Data Fiduciary**").

---

## 1. Scope and Regulatory Compliance

This DPA reflects the parties' agreement regarding the processing of Personal Data in connection with the Services, in compliance with applicable Data Protection Laws, including:
1. **General Data Protection Regulation (EU) 2016/679 ("GDPR")** and the UK GDPR;
2. **Digital Personal Data Protection Act, 2023 (India) ("DPDP Act")**;
3. **California Consumer Privacy Act ("CCPA")** as amended by the California Privacy Rights Act ("CPRA");
4. All other applicable regional data privacy and protection laws.

---

## 2. Roles of the Parties

* **Customer as Controller / Data Fiduciary:** Customer determines the purposes and lawful means of processing Personal Data, issues invitations, and collects feedback from its consumers.
* **FeedbackDesk as Processor:** FeedbackDesk processes Personal Data solely on behalf of, and in accordance with the documented instructions of, Customer.

---

## 3. Scope of Processing & Data Categories

| Attribute | Specification |
| :--- | :--- |
| **Subject Matter** | Provision of customer feedback collection, multi-layer anti-spam verification, and automated AI analysis. |
| **Duration of Processing** | The term of the Principal Agreement plus retention periods mandated by law or authorized deletion request. |
| **Nature & Purpose** | Ingesting consumer review text, generating star ratings, scrubbing PII, categorizing feedback via AI, and presenting analytics to Controller. |
| **Categories of Data Subjects** | End-consumers, shoppers, clients, and Authorized Users of Controller. |
| **Categories of Personal Data** | Optional consumer email address, consumer star rating, qualitative review text, internal cryptographic submission fingerprint, creation/completion timestamps. |
| **Special Category / Sensitive Data** | **Prohibited.** Controller shall not instruct or intentionally elicit health data, biometric data, financial PINs, or racial/ethnic identifiers. Automated PII scrubbing regex filters strip accidental sensitive data prior to LLM inference. |

---

## 4. Obligations of the Processor (FeedbackDesk)

FeedbackDesk covenants and agrees to:
1. **Process on Instructions Only:** Process Personal Data only on documented instructions from Controller, including with respect to data transfers, unless required to do so by applicable law.
2. **Confidentiality:** Ensure that all employees, contractors, and agents authorized to process Personal Data have committed themselves to strict confidentiality.
3. **Security of Processing:** Implement and maintain Technical and Organizational Measures (TOMs) as specified in **Schedule A** to ensure a level of security appropriate to the risk.
4. **Data Minimization & Single-Use Architecture:** Maintain strict single-use link tokenization, avoiding hardware canvas fingerprinting, battery API scraping, or persistent cookie tracking across consumer devices.
5. **Assistance with Data Subject Rights:** Assist Controller by appropriate technical and organizational measures in fulfilling Controller's obligations to respond to requests exercising Data Subject rights (access, erasure, rectification, portability).
6. **Breach Notification:** Notify Controller in writing without undue delay, and in any event within **forty-eight (48) hours**, upon becoming aware of any confirmed Personal Data Breach impacting Customer Data.
7. **Deletion or Return:** Upon termination of the Services, at the choice of Controller, securely delete or return all Personal Data, unless statutory law mandates retention.

---

## 5. Sub-processors

### 5.1 Authorization of Sub-processors
Controller grants general authorization to Processor to engage the sub-processors listed in **Schedule B** to provide infrastructure, hosting, and AI inference services.

### 5.2 Sub-processor Obligations
Processor shall impose data protection terms on any sub-processor that are at least as restrictive as the terms of this DPA. Processor remains fully liable to Controller for the performance of each sub-processor's obligations.

### 5.3 Notification of Changes
Processor shall notify Controller at least thirty (30) days in advance of any intended changes or additions to sub-processors, providing Controller the opportunity to object on reasonable privacy or security grounds.

---

## 6. International Data Transfers

Where processing involves cross-border transfer of Personal Data:
1. **EU/UK Data:** Transfers outside the EEA/UK shall rely on the European Commission's Standard Contractual Clauses (SCCs) (Module 2: Controller to Processor), incorporated herein by reference.
2. **India Data:** Transfers comply with Section 16 of the Digital Personal Data Protection Act, 2023, subject to government-prescribed transfer restrictions.

---

## Schedule A: Technical & Organizational Security Measures (TOMs)

FeedbackDesk maintains the following baseline security controls:

1. **Encryption:**
   - **In Transit:** TLS 1.3 enforced across all public endpoints and internal database connections.
   - **At Rest:** AES-256 encryption across all PostgreSQL data volumes and backups.
2. **Access Control:**
   - Role-Based Access Control (RBAC) enforced across platform tiers (`admin`, `product_manager`, `viewer`).
   - Multi-Factor Authentication (MFA / Email OTP) enforced for administrative access.
3. **Automated PII Sanitization (`sanitizeForAi`):**
   - Pre-inference regex scrubber detects and strips credit card numbers, Social Security Numbers, Aadhaar patterns, private JWT tokens, and phone numbers before dispatching text to AI LLM inference.
4. **Resilience & Backups:**
   - Automated daily encrypted database snapshots retained across geographically isolated zones.
   - 99.9% availability SLA with automated failover and health check probes.
5. **Audit Logging:**
   - Immutable audit trail recording user logins, role changes, link generation, and data exports in `audit_events`.

---

## Schedule B: Authorized Sub-processors

| Sub-processor | Role / Purpose | Processing Location | Data Handled |
| :--- | :--- | :--- | :--- |
| **Google Cloud / Google GenAI** | AI Inference (Gemini 2.5 Flash) for sentiment & category taxonomy | United States / Global | Sanitized feedback text (PII scrubbed) |
| **PostgreSQL Cloud / Render / AWS** | Primary database and application container hosting | Primary Data Center (Frankfurt/Mumbai/US-East) | Encrypted feedback records, users, audit logs |
| **Meta Platforms Ireland (WhatsApp Cloud API)** | Optional outbound WhatsApp invitation delivery | Ireland / US / Regional | Recipient phone number, invitation URL |

---

## Execution & Signatures

| For Controller (Customer) | For Processor (FeedbackDesk Technologies) |
| :--- | :--- |
| **Authorized Signatory:** _______________________ | **Authorized Signatory:** _______________________ |
| **Name:** __________________________________ | **Name:** __________________________________ |
| **Title:** ___________________________________ | **Title:** ___________________________________ |
| **Company:** _______________________________ | **Company:** FeedbackDesk Technologies |
| **Date:** ___________________________________ | **Date:** ___________________________________ |
