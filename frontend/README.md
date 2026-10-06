# Feedback Desk AI - Frontend

The frontend application for Feedback Desk AI, built with **Next.js 16 (App Router)**, **React 18**, **TypeScript**, and **Tailwind CSS**. It serves as both the client-side user interface and a Backend-For-Frontend (BFF) proxy layer.

---

## 🚀 Features

- **Executive Analytics & Dashboards**: Deterministic metric calculations, sentiment breakdowns, priority triage, and activity trends using Recharts.
- **Feedback Management**: Date-grouped, virtualized feedback feeds with multi-category filters, aspect breakdowns, and root-cause analysis.
- **Public Feedback Portal**: Cryptographically signed feedback submission forms (`/submit-feedback/[productId]/[userId]/[industry]?sig=...`) preventing unauthorized feedback injection.
- **Product Workspaces & Settings**: Product configuration, customizable feedback taxonomy, and instant QR code sharing.
- **Authentication**: Email/Password login, registration with OTP email verification, and session management.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript 5
- **UI Components**: shadcn/ui, Radix UI primitives, Lucide React
- **Styling**: Tailwind CSS, CSS Modules
- **Charts**: Recharts
- **Forms & Validation**: React Hook Form, Zod
- **Testing**: Node.js Test Runner with `tsx`

---

## 📁 Directory Structure

```
frontend/
├── app/
│   ├── api/                     # BFF proxy & validation routes
│   │   ├── analytics/           # Executive brief & summary proxies
│   │   ├── auth/                # Auth endpoints (login, register, OTP)
│   │   ├── feedbacks/           # Feedback list & submit routes
│   │   └── products/            # Product management & signing routes
│   ├── feedback/                # Feedback list & date-group views
│   ├── insights/                # Analytics & executive brief views
│   ├── login/ & signup/         # Auth pages
│   ├── products/                # Product workspaces & QR codes
│   ├── settings/                # Product configuration & taxonomies
│   └── submit-feedback/         # Public signed feedback collection
├── components/                  # UI components, dialogs, layout
├── context/                     # Global application state (AppContext)
├── hooks/                       # Custom React hooks (useToast, etc.)
├── lib/
│   ├── api.ts                   # Centralized API client & error handler
│   ├── crypto.ts                # HMAC signing & timingSafeEqual verification
│   └── normalization.ts         # Type-safe backend response normalization
├── test/                        # Automated unit & regression test suites
└── types/                       # TypeScript interfaces & types
```

---

## ⚡ Getting Started

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | URL of the backend Express API | `http://localhost:5000` |
| `LINK_SECRET` | Secret key for HMAC signing of public links | *(Required in production)* |

### 3. Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Quality Checks

Run the automated regression test suite:
```bash
npm test
```

Run TypeScript type check:
```bash
npx tsc --noEmit
```

Build for production:
```bash
npm run build
```
