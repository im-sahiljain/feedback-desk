# API Implementation Plan for Feedback Desk

## Goal Description

The goal is to design a comprehensive backend API to support the features of the **Feedback Desk** application. The current backend only supports a single `/api/classify` endpoint. We need to expand this to support authentication, workspace management, public feedback submission, and detailed analytics.

---

## Table of Contents

* [Proposed API Structure](#proposed-api-structure)

  * [1. Authentication](#1-authentication)
  * [2. Workspaces (Products)](#2-workspaces-products)
  * [3. Feedback Management](#3-feedback-management)
  * [4. Analytics & Insights](#4-analytics--insights)
  * [5. Existing Integration](#5-existing-integration)
* [Data Model Updates (PostgreSQL)](#data-model-updates-postgresql)

  * [Table: users](#table-users-new)
  * [Table: workspaces](#table-workspaces-new)
  * [Table: feedbacks](#table-feedbacks-updated)
* [Verification Plan](#verification-plan)
* [Comment](#comment)

---

## Proposed API Structure

### 1. Authentication

* `POST /api/auth/register` — Register a new user (Admin)
* `POST /api/auth/login` — Login with email/password
* `GET /api/auth/me` — Get current user profile

---

### 2. Workspaces (Products)

Each user can manage multiple products (Workspaces).

* `GET /api/workspaces` — List all workspaces for the logged-in user
* `POST /api/workspaces` — Create a new workspace (Product)
* `GET /api/workspaces/:id` — Get details of a specific workspace
* `PUT /api/workspaces/:id` — Update workspace settings (e.g., categories, AI prompts)
* `DELETE /api/workspaces/:id` — Delete a workspace

---

### 3. Feedback Management

#### Submit Feedback (Public)

* `POST /api/feedbacks/submit`

**Request Body:**

```json
{
  "workspace_id": "string",
  "text": "string",
  "email": "string",
  "rating": 1
}
```

**Note:**
This should trigger the AI classification asynchronously or synchronously depending on load.

#### Admin Endpoints

* `GET /api/feedbacks` — List feedbacks for a workspace (Admin only)
  **Query Params:** `workspace_id`, `search`, `sentiment`, `priority`, `category`

* `GET /api/feedbacks/:id` — Get single feedback details with analysis

* `PUT /api/feedbacks/:id` — Update feedback status (e.g., `"In Progress"`, `"Resolved"`)

* `DELETE /api/feedbacks/:id` — Delete feedback

---

### 4. Analytics & Insights

* `GET /api/analytics/summary` — Get high-level metrics:

  * Total Feedback Count
  * Sentiment Score
  * High Priority Count
    **Query Params:** `workspace_id`

* `GET /api/analytics/trends` — Get feedback volume and sentiment over time
  **Query Params:** `workspace_id`, `range` (`7d`, `30d`)

---

### 5. Existing Integration

Refactor:

* `/api/classify` → `/api/internal/classify`
  **OR**
* Integrate logic directly into `POST /api/feedbacks/submit`

The existing logic:

* Uses `classifyImpactSingle`
* Saves results to the `feedbacks` table

Planned table changes:

* Add `workspace_id`
* Add `status`
* Add `user_email`
* Add `rating`

---

## Data Model Updates (PostgreSQL)

### Table: `users` (New)

**Fields:**

* `id` (PK)
* `email`
* `password_hash`
* `name`
* `created_at`

**Relationships:**

* One User → Many Workspaces

---

### Table: `workspaces` (New)

**Fields:**

* `id` (PK)
* `user_id` (FK)
* `name`
* `description`
* `settings` (JSON — categories, prompts)
* `created_at`

**Relationships:**

* One Workspace → One User
* One Workspace → Many Feedbacks

---

### Table: `feedbacks` (Updated)

**Existing Fields:**

* `id`
* `feedback`
* `labels`
* `category`
* `sentiment`
* `priority`
* `impact`
* `scope`

**Add:**

* `workspace_id` (FK)
* `status` (default: `"New"`)
* `email` (User contact)
* `rating` (1–5)
* `created_at`

---

## Verification Plan

### Manual Verification

#### Authentication

* Test registration and login using **Postman** or `curl`

#### Workspaces

* Create a workspace
* Verify it appears in the workspace list

#### Feedback Flow

1. Submit feedback via `POST /api/feedbacks/submit`
2. Verify AI classification runs and populates the database (category, sentiment, etc.)
3. Verify feedback appears in `GET /api/feedbacks`

#### Analytics

* Submit multiple feedbacks
* Check if `GET /api/analytics/summary` returns correct aggregates

---

## Comment

**Shortcut:** `Ctrl + Alt + M`
