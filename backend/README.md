# Feedback Desk AI - Backend

The backend service for Feedback Desk AI, built with **Node.js**, **Express**, **TypeScript**, and **PostgreSQL**. It provides authentication, product workspace management, feedback storage, deep aspect-based classification, and executive intelligence synthesis.

---

## 🚀 Key Features

- **Public & Authenticated REST API**: Full endpoints for feedback collection, date-grouped listings, analytics, and product management.
- **Deep Aspect-Based Classification**: Multi-aspect categorization, sentiment analysis, and priority triage (`src/classify_impact.ts`).
- **Macro Decision & Impact Correlation Engine**: Computes friction drivers, negative feedback share, and operational decisions (`src/executive_brief.ts`).
- **Secure Authentication**: OTP email verification via Resend, bcrypt password hashing, and JWT bearer tokens.
- **Interactive Swagger Documentation**: Built-in interactive API docs available at `/api-docs`.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 5 with TypeScript
- **Database**: PostgreSQL (pg pool / Supabase)
- **AI Integration**: Google Gemini API (`@google/genai`)
- **Email Delivery**: Resend SDK
- **API Documentation**: Swagger UI & swagger-jsdoc
- **Execution & Transpilation**: `tsx`, `typescript`

---

## 📁 Directory Structure

```
backend/
├── src/
│   ├── server.ts               # Express application entry point & middleware
│   ├── db.ts                   # PostgreSQL pool configuration
│   ├── swagger.ts              # OpenAPI / Swagger specification
│   ├── email.ts                # Resend transactional email helper
│   ├── classify_impact.ts      # Multi-aspect classification logic
│   ├── executive_brief.ts      # Macro correlation & executive brief engine
│   └── routes/
│       ├── auth.ts             # Register, login, OTP verification, /api/auth/me
│       ├── products.ts         # Product workspaces & taxonomies CRUD
│       ├── feedbacks.ts        # Feedback submission, listing, date-groups
│       └── analytics.ts        # Dashboard metrics & executive brief endpoints
├── input_data/                 # Industry master labels and taxonomy definitions
├── script/                     # Database verification & migration scripts
└── test_security.sh            # Security audit utility script
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

| Variable | Description |
| :--- | :--- |
| `PORT` | Port number for Express server (default: `5000`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens |
| `GEMINI_API_KEY` | Google Gemini API key for feedback intelligence |
| `RESEND_API_KEY` | Resend API key for OTP verification emails |
| `RESEND_FROM_EMAIL` | Sender address for outgoing emails |

### 3. Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

API will be accessible at `http://localhost:5000`.  
Swagger documentation is available at `http://localhost:5000/api-docs`.

---

## 📚 API Endpoints Overview

| Method | Path | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | Public |
| `POST` | `/api/auth/verify-otp` | Verify 6-digit OTP code | Public |
| `POST` | `/api/auth/login` | Log in and receive JWT token | Public |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Bearer Auth |
| `GET` | `/api/products` | List user product workspaces | Bearer Auth |
| `POST` | `/api/products` | Create product workspace | Bearer Auth |
| `PUT` | `/api/products/:id` | Update product settings / categories | Bearer Auth |
| `POST` | `/api/feedbacks/submit` | Submit feedback with deep AI analysis | Public |
| `GET` | `/api/feedbacks` | Filtered feedback list | Bearer Auth |
| `GET` | `/api/feedbacks/date-groups` | Collapsible date group counts | Bearer Auth |
| `GET` | `/api/analytics/summary` | Dashboard metric distribution | Bearer Auth |
| `GET` | `/api/analytics/executive-brief` | Executive operational brief | Bearer Auth |