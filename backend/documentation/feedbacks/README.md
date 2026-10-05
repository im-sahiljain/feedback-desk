# Feedback API

Base URL: `http://localhost:5000`

## 1. Submit Feedback (Public)
**POST** `/api/feedbacks/submit`

*Note: This endpoint does NOT require Authentication header.*

**Request:**
```bash
curl -X POST http://localhost:5000/api/feedbacks/submit \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "feedback": "The login page is crashing on mobile.",
    "email": "visitor@test.com",
    "rating": 1
  }'
```

**Response:**
```json
{
  "message": "Feedback submitted successfully",
  "id": 10,
  "analysis": {
    "category": { "label": "Bug", "confidence": "98.5%" },
    "sentiment": { "label": "Negative", "confidence": "99.1%" },
    "priority": { "label": "High Priority" }
  }
}
```

## 2. List Feedbacks (Admin)
**GET** `/api/feedbacks`

Fetches feedbacks for a specific product.

**Query Parameters:**
*   `product_id`: ID of the product (Required)

**Request:**
```bash
curl -X GET "http://localhost:5000/api/feedbacks?product_id=1" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## 3. Delete Feedback
**DELETE** `/api/feedbacks/:id`

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/feedbacks/10 \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```
