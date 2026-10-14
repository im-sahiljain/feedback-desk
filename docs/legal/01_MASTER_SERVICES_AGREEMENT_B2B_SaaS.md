# Master Services Agreement (B2B SaaS)

**Last Updated:** October 2026  
**Effective Date:** Upon execution of an Order Form or acceptance of Terms of Service.

This Master Services Agreement ("**Agreement**" or "**MSA**") is entered into by and between:

1. **FeedbackDesk Technologies** ("**Provider**", "**FeedbackDesk**", "**We**", or "**Us**"), providing AI-powered feedback collection, analytics, and single-use review infrastructure; and
2. The legal entity or individual identified in an accompanying Order Form, registration form, or enterprise contract ("**Customer**", "**Client**", or "**You**").

---

## 1. Definitions

* **"Affiliate"** means any entity that directly or indirectly controls, is controlled by, or is under common control with a party.
* **"Authorized User"** means an employee, agent, contractor, or representative of Customer who is granted access to the FeedbackDesk Platform under Customer's account.
* **"Customer Data"** means all electronic data, feedback text, ratings, files, or information submitted by or on behalf of Customer or Customer's end-consumers through the Services.
* **"Data Protection Addendum (DPA)"** means the Data Processing Addendum attached hereto or accessible at [02_DATA_PROCESSING_AGREEMENT_DPA.md](./02_DATA_PROCESSING_AGREEMENT_DPA.md), incorporated by reference.
* **"Documentation"** means the technical and operational documentation, API guides, user manuals, and specifications made available by Provider.
* **"Order Form"** means an ordering document, web checkout order, or Statement of Work (SOW) executed between Provider and Customer referencing this Agreement.
* **"Platform" or "Services"** means FeedbackDesk's proprietary cloud-hosted software application, APIs, physical Counter QR dispensers, single-use token infrastructure, AI taxonomy engines, and analytics dashboards.

---

## 2. Provision of Services & License

### 2.1 Software-as-a-Service License
Subject to the terms and conditions of this Agreement and payment of applicable fees, Provider grants Customer a non-exclusive, non-transferable, non-sublicensable, worldwide right and license during the Subscription Term to:
1. Access and use the Platform for internal business purposes;
2. Generate and distribute single-use feedback invitations, Counter QR standees, and review links to Customer's bona fide end-consumers;
3. Access and export AI-generated sentiment analytics, summaries, and executive briefs.

### 2.2 Access Credentials & Security
Customer is responsible for safeguarding Authorized User login credentials (passwords, OTPs, session tokens). Customer shall promptly notify Provider in writing upon becoming aware of any unauthorized access to its account.

### 2.3 Service Level Agreement (SLA)
Provider warrants that the Platform will maintain an uptime of not less than **99.9%** during each calendar month, excluding scheduled maintenance announced with at least 48 hours' prior notice.

---

## 3. Customer Obligations & Acceptable Use Policy

### 3.1 Legitimate Reviews & Anti-Fabrication Warranty
Customer expressly covenants, warrants, and agrees that:
1. **Authenticity:** Customer shall only collect feedback from genuine, bona fide consumers who have interacted with, purchased from, or transacted with Customer.
2. **No Review Manipulation or Fabrication:** Customer shall **NOT** use the Platform to fabricate reviews, purchase artificial ratings, suppress negative reviews in violation of law (review gating), or deceive regulatory bodies or the public.
3. **Regulatory Compliance:** Customer is solely responsible for ensuring its review solicitation practices comply with applicable laws, including the **US FTC Rule on Fake Reviews and Testimonials (16 CFR Part 465)**, **EU Omnibus Directive (Directive 2019/2161)**, and **Bureau of Indian Standards (IS 19000:2022 on Online Consumer Reviews)**.

### 3.2 Consent for Communications (WhatsApp / SMS / Email)
If Customer utilizes FeedbackDesk's automated outreach capabilities (e.g., WhatsApp Cloud API, SMS, or Email outreach):
1. Customer warrants that it has secured all necessary prior consents and opt-ins required by telecommunications laws (e.g., TRAI regulations in India, TCPA in the US, ePrivacy in the EU).
2. Customer shall honor all opt-out or "STOP" requests immediately.

### 3.3 Restrictions
Customer shall not:
* Reverse engineer, decompile, or attempt to extract source code from the Platform;
* Use the Platform to transmit malware, malicious scripts, or unlawful content;
* Bypass rate limits, token burn mechanics, or security firewalls;
* Resell, white-label, or rent access to the Platform without prior written authorization.

---

## 4. Artificial Intelligence & Analytics Disclaimer

### 4.1 Generative AI & Natural Language Processing
The Platform incorporates third-party artificial intelligence engines (including Google Gemini 2.5 Flash) to categorize reviews, calculate sentiment scores, and generate automated executive briefs.

### 4.2 Assistive & Advisory Nature
Customer acknowledges and agrees that:
1. AI outputs are probabilistic and assistive in nature. Provider does not guarantee 100% accuracy in classification, translation, or sentiment scores.
2. AI summaries and executive briefs do **not** constitute legal, financial, or operational advice. Customer retains ultimate decision-making authority for actions taken in response to feedback.
3. PII is sanitized prior to LLM processing in accordance with the DPA.

---

## 5. Intellectual Property Rights

### 5.1 FeedbackDesk Intellectual Property
Provider retains all right, title, and interest (including all patents, copyrights, trade secrets, trademarks, algorithms, and software code) in and to the Platform, Documentation, APIs, and underlying technology.

### 5.2 Customer Data Ownership
Customer retains all right, title, and interest in and to Customer Data. Customer grants Provider a limited, royalty-free license to host, copy, process, sanitize, and analyze Customer Data solely as necessary to provide the Services to Customer.

### 5.3 Aggregated & De-Identified Telemetry
Provider may aggregate, anonymize, and de-identify system performance telemetry (e.g., latency, token throughput, aggregate error rates) for benchmarking and infrastructure improvement, provided no Customer Data or individual identifying information is disclosed.

---

## 6. Fees, Billing & Taxes

1. **Fees:** Customer agrees to pay the fees set forth in the applicable Order Form or plan tier. All fees are quoted in the designated currency and are non-refundable except as expressly provided herein.
2. **Invoicing & Payment:** Subscription fees are billed in advance on a recurring monthly or annual basis. Overdue amounts accrue interest at 1.5% per month or the maximum rate permitted by law.
3. **Taxes:** All fees are exclusive of applicable taxes (GST, VAT, sales tax). Customer is responsible for all statutory taxes applicable to transactions in its jurisdiction.

---

## 7. Data Protection, Privacy & Security

1. **Compliance with Laws:** Both parties agree to comply with applicable data protection legislation, including the **General Data Protection Regulation (GDPR)**, the **India Digital Personal Data Protection Act, 2023 (DPDP Act)**, and the **California Consumer Privacy Act (CCPA)**.
2. **Data Roles:** For the purposes of processing consumer feedback, Customer is the **Data Controller / Data Fiduciary** and Provider is the **Data Processor / Data Intermediary**.
3. **Security Standards:** Provider implements Technical and Organizational Measures (TOMs) including TLS 1.3 encryption in transit, AES-256 encryption at rest, role-based access control (RBAC), and automated PII scrubbing.

---

## 8. Confidentiality

"**Confidential Information**" means all non-public information disclosed by one party to the other that is designated as confidential or reasonably understood to be confidential. Each party agrees to hold the other's Confidential Information in strict confidence, protect it with at least reasonable care, and disclose it only to employees or contractors with a need to know.

---

## 9. Term, Termination & Suspension

1. **Term:** This Agreement commences on the Effective Date and continues until all Order Forms or subscriptions have expired or been terminated.
2. **Termination for Cause:** Either party may terminate this Agreement immediately upon written notice if the other party materially breaches this Agreement and fails to cure such breach within thirty (30) days of written notice.
3. **Immediate Suspension for Abuse:** Provider reserves the right to suspend Customer's access immediately if Customer engages in fraudulent review fabrication, automated review attacks, or non-payment exceeding fifteen (15) days.
4. **Data Portability Upon Termination:** Upon written request within thirty (30) days of termination, Provider shall provide an export of Customer's feedback data in standard JSON or CSV format, after which Provider shall securely delete Customer Data in accordance with its retention schedule.

---

## 10. Warranties & Limitation of Liability

### 10.1 Disclaimer
EXCEPT AS EXPRESSLY SET FORTH HEREIN, THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE". PROVIDER DISCLAIMS ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.

### 10.2 Limitation of Liability
TO THE MAXIMUM EXTENT PERMITTED BY LAW:
1. NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, OR PUNITIVE DAMAGES, LOSS OF PROFITS, OR LOSS OF BUSINESS OPPORTUNITY.
2. EACH PARTY'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO THIS AGREEMENT SHALL BE CAPPED AT THE TOTAL FEES PAID OR PAYABLE BY CUSTOMER UNDER THIS AGREEMENT IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.

---

## 11. Governing Law & Dispute Resolution

1. **Governing Law:** This Agreement shall be governed by and construed in accordance with the laws of India (or the jurisdiction specified in the Order Form), without regard to conflict of law principles.
2. **Dispute Resolution:** In the event of any dispute, the parties shall first attempt informal dispute resolution in good faith for thirty (30) days. Any unresolved dispute shall be submitted to binding arbitration under the Arbitration and Conciliation Act, 1996, conducted in English by a sole arbitrator.

---

## 12. Signatures & Acceptance

By signing below or executing an accompanying Order Form, the authorized representatives of the parties accept and agree to be bound by this Agreement.

| For: **FeedbackDesk Technologies** | For: **Customer** |
| :--- | :--- |
| **Signature:** _____________________________ | **Signature:** _____________________________ |
| **Name:** ________________________________ | **Name:** ________________________________ |
| **Title:** _________________________________ | **Title:** _________________________________ |
| **Company:** FeedbackDesk Technologies | **Company Name:** _________________________ |
| **Date:** _________________________________ | **Date:** _________________________________ |
