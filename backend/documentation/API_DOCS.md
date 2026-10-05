# Feedback Desk API Documentation

**Base URL**: `http://localhost:5000`

---

## 1. Authentication

### Register
**POST** `/api/auth/register`
Creates a new admin account and returns a session token.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": { "id": 1, "email": "..." },
  "token": "eyJhbGciOiJIUz..."
}
```

### Login
**POST** `/api/auth/login`
Returns a session token for existing users.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

---

## 2. Products (Workspaces)

### Get Industry List
**GET** `/api/products/industries`
**Headers:** `Authorization: Bearer <TOKEN>`
Returns a list of available industries for the dropdown.

**Response:**
```json
["Technology", "Healthcare", "Infrastructure", "Education", "Retail", "Hospitality"]
```

### Get Industry Labels
**GET** `/api/products/labels`
**Headers:** `Authorization: Bearer <TOKEN>`
Returns the specific feedback labels for a selected industry.

**Query Params:** `?industry=Technology`

**Response:**
```json
["Bug Report", "Feature Request", "UI Issue", ...]
```

### Create Product
**POST** `/api/products`
**Headers:** `Authorization: Bearer <TOKEN>`

**Body:**
```json
{
  "name": "My SaaS Product",
  "industry": "Technology",
  "description": "A project management tool",
  "categories": ["Bug Report", "Feature Request", "UI Issue"]
}
```
*Note: `categories` must contain between 1 and 5 items.*

### List Products
**GET** `/api/products`
**Headers:** `Authorization: Bearer <TOKEN>`

**Response:**
```json
[
  {
    "id": 1,
    "name": "My SaaS Product",
    "industry": "Technology",
    "description": "...",
    "settings": { "categories": [...] }
  }
]
```

---

## 3. Feedback (Public & Private)

### Submit Feedback (Public)
**POST** `/api/feedbacks/submit`
Used by the end-user widget to submit feedback. **No Token Required.**

**Body:**
```json
{
  "product_id": 1,
  "feedback": "The login button is broken on Safari.",
  "email": "visitor@gmail.com",
  "rating": 1
}
```

**Response (201):**
```json
{
  "message": "Feedback submitted successfully",
  "analysis": {
    "category": { "label": "Bug Report", "confidence": "0.98" },
    "sentiment": { "label": "Negative", "confidence": "0.99" },
    "priority": { "label": "High", "confidence": "0.95" }
  }
}
```

### List Feedback (Admin)
**GET** `/api/feedbacks`
**Headers:** `Authorization: Bearer <TOKEN>`
**Query Params:** `?product_id=1`

**Response:**
```json
[
  {
    "id": 10,
    "feedback": "The login button is broken...",
    "email": "visitor@gmail.com",
    "status": "Classified",
    "sentiment": { ... },
    "category": { ... },
    "created_at": "2026-01-25T12:00:00Z"
  }
]
```

### Delete Feedback
**DELETE** `/api/feedbacks/:id`
**Headers:** `Authorization: Bearer <TOKEN>`

---

## 4. Analytics

### Dashboard Summary
**GET** `/api/analytics/summary`
**Headers:** `Authorization: Bearer <TOKEN>`
**Query Params:** `?product_id=1`

**Response:**
```json
{
  "total_feedback": 150,
  "high_priority_count": 12,
  "sentiment_distribution": [
    { "label": "Negative", "count": 20 },
    { "label": "Positive", "count": 100 },
    { "label": "Neutral", "count": 30 }
  ]
}
```
