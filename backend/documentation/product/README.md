# Product API

Base URL: `http://localhost:5000`

## 1. Get Industries
**GET** `/api/products/industries`

Returns the list of available industries.

**Request:**
```bash
curl -X GET http://localhost:5000/api/products/industries \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Response:**
```json
["Technology", "Healthcare", "Infrastructure", "Education", "Retail", "Hospitality"]
```

## 2. Get Labels
**GET** `/api/products/labels`

Returns labels for a specific industry.

**Request:**
```bash
curl -X GET "http://localhost:5000/api/products/labels?industry=Technology" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Response:**
```json
["Bug Report", "Feature Request", "UI Issue", "Performance", ...]
```

## 3. Create Product
**POST** `/api/products`

Note: You must select between 1 and 5 categories.

**Request:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Awesome App",
    "industry": "Technology",
    "description": "A SaaS platform for developers",
    "categories": ["Bug Report", "Feature Request", "UI Issue"]
  }'
```

**Response:**
```json
{
  "id": 1,
  "user_id": 1,
  "name": "My Awesome App",
  "settings": null,
  "created_at": "2026-01-25T12:05:00.000Z"
}
```

## 4. List Products
**GET** `/api/products`

**Request:**
```bash
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

## 5. Update Product
**PUT** `/api/products/:id`

**Request:**
```bash
curl -X PUT http://localhost:5000/api/products/1 \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Awesome App (Renamed)"
  }'
```

## 6. Delete Product
**DELETE** `/api/products/:id`

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/products/1 \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```
