# Analytics API

Base URL: `http://localhost:5000`

## 1. Get Dashboard Summary
**GET** `/api/analytics/summary`

Fetches high-level metrics for the dashboard.

**Query Parameters:**
*   `workspace_id`: ID of the workspace (Required)

**Request:**
```bash
curl -X GET "http://localhost:5000/api/analytics/summary?workspace_id=1" \
  -H "Authorization: Bearer <YOUR_TOKEN>"
```

**Response:**
```json
{
  "total_feedback": 150,
  "high_priority_count": 12,
  "sentiment_distribution": [
    { "label": "Positive", "count": 100 },
    { "label": "Negative", "count": 20 },
    { "label": "Neutral", "count": 30 }
  ],
  "top_categories": [
    { "label": "Feature Request", "count": 50 },
    { "label": "Bug", "count": 40 }
  ]
}
```
