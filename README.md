# Feedback Desk AI

Feedback Desk AI is a full-stack customer feedback management and intelligence platform. It enables businesses to collect, organize, triage, and analyze multi-channel customer feedback across multiple products and industries with deterministic analytics and AI-driven classification.

---

## 🏗️ Architecture Overview

The repository is structured as a full-stack monorepo:

```
feedback-desk/
├── frontend/             # Next.js 16 + React 18 + TypeScript + Tailwind CSS
│   ├── app/              # App router pages & API routes (BFF)
│   ├── components/       # Reusable UI components & dialogs (shadcn/ui)
│   ├── context/          # Global application state (AppContext)
│   ├── lib/              # Crypto (HMAC), normalization, API client
│   └── test/             # Automated unit & integration regression tests
├── backend/              # Node.js + Express + TypeScript + PostgreSQL
│   ├── src/              # Express routes, database pools, classification
│   ├── input_data/       # Industry taxonomies and master labels
│   └── script/           # Migration and benchmark utilities
└── .gitignore            # Root gitignore protecting all environment files
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript 5
- **UI & Components**: Tailwind CSS, shadcn/ui, Radix UI primitives
- **Data Visualization**: Recharts
- **Icons**: Lucide React
- **Forms & Validation**: React Hook Form, Zod

### Backend
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js 20+
- **Database**: PostgreSQL (Supabase / local Postgres pool)
- **AI & Classification**: Google Gemini API (`@google/genai`) & Aspect Triage
- **Documentation**: Swagger UI (`/api-docs`)

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v20+ recommended
- **PostgreSQL**: PostgreSQL 14+ (local Docker Compose or managed Postgres/Supabase)

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Set DATABASE_URL, JWT_SECRET, OTP_HMAC_SECRET, LINK_SECRET (32+ chars in production)
npm install
npm run migrate
npm run dev
```

API: `http://localhost:5000` · Health: `/health` · Ready: `/ready`

Optional Docker (API + Postgres):

```bash
cd backend
export JWT_SECRET=... OTP_HMAC_SECRET=... LINK_SECRET=...
docker compose up --build
```

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Set BACKEND_API_URL=http://localhost:5000 and LINK_SECRET (match backend)
npm install
npm run dev
```

Public feedback links use opaque paths: `/f/{token}` (long-lived, revocable).

Legacy signed URLs under `/submit-feedback/...` remain supported.

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Validation

```bash
# Backend
cd backend
npm run typecheck && npm test && npm run test:integration && npm run build

# Frontend
cd frontend
npm run typecheck && npm test && npm run build
```

CI runs the same checks via `.github/workflows/ci.yml` against an empty Postgres service.

---

## 🔒 Security highlights

- OTP identity is bound to the challenge destination (never a client-supplied email alone)
- No hardcoded secret fallbacks; startup fails closed without required secrets
- Organization tenancy + RBAC enforced on the backend
- Opaque, revocable public feedback destinations (`/f/{token}`); legacy HMAC links still accepted
- Feedback ingestion is independent of AI (Postgres durable job queue + worker)
- Root causes are hypotheses; no fabricated ROI/churn claims; PII minimized before AI calls
- See [Backup & Recovery](backend/docs/BACKUP_AND_RECOVERY.md)

---

## 📖 Documentation

- [Frontend README](frontend/README.md)
- [Backend README](backend/README.md)
- [Backup & Recovery](backend/docs/BACKUP_AND_RECOVERY.md)

---

## ⚠️ Private License Notice

Copyright (c) 2026 Sahil Jain. All rights reserved.

This repository is available for **portfolio and evaluation purposes only**.

🚫 **Restrictions:**
- You are NOT permitted to use this code in personal or commercial projects.
- You are NOT permitted to deploy this project publicly or commercially.
- You are NOT permitted to copy, modify, merge, or distribute any part of this repository.

See the full [LICENSE](LICENSE) file for details. For licensing inquiries, contact the repository owner.

