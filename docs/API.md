# Sokogate AI - API Documentation

Base URL: `http://localhost:4000/api` (development)

## Authentication

Most admin endpoints require JWT authentication via cookies (set by @auth/core). Protected routes check for a valid session and verify the user email is in `ADMIN_EMAILS`.

Client should include credentials: `credentials: 'include'` for fetch.

---

## Endpoints

### Chat Endpoint

#### `POST /api/chat`

Initiates or continues a conversation with the AI sales agent.

**Request Body:**
```json
{
  "messages": [
    { "role": "user", "content": "I need electronics in bulk" }
  ],
  "visitorId": "vis_abc123xyz" // optional, auto-generated if omitted
}
```

**Response (200 OK):**
```json
{
  "content": "I can help with electronics! What specific items...",
  "leadCaptured": false,
  "stage": "greeting",
  "progress": {
    "stages": [...],
    "currentIndex": 0,
    "progress": 20
  }
}
```

**Lead Captured Response:**
```json
{
  "content": "...Your request is ready...",
  "leadCaptured": true,
  "leadName": "John Doe",
  "email": "john@example.com",
  "whatsapp": "+254700123456",
  "score": "High",
  "category": "Electronics",
  "isHighValue": true,
  "leadId": 123,
  "stage": "qualified",
  "progress": { ... }
}
```

**Rate Limiting:** 30 requests per minute per visitorId, 60 per minute per IP.

---

### Leads

#### `GET /api/leads?limit=100&offset=0&status=New&score=High`

Fetch leads with pagination and optional filters.

**Query Parameters:**
- `limit` (default: 100, max: 1000)
- `offset` (default: 0)
- `status` (optional): New, Qualified, Closed
- `score` (optional): High, Medium, Low

**Response:**
```json
{
  "leads": [ ... ],
  "pagination": {
    "total": 342,
    "limit": 100,
    "offset": 0,
    "page": 1,
    "totalPages": 4
  }
}
```

#### `POST /api/leads` (Admin only)

Create a lead manually.

**Request Body:** See schema in `schema.sql` (leads table).

**Response:** Lead object.

#### `PATCH /api/leads`

Update lead fields. Only one field per request.

**Request Body:**
```json
{
  "id": 123,
  "status": "Qualified"
}
```

**Response:** Updated lead object.

---

### Knowledge Base (Admin)

#### `GET /api/knowledge?category=Electronics&limit=20&active=true`

Public read access to knowledge base.

#### `POST /api/knowledge` (Admin only)

Create or update knowledge entry.

**Request Body:**
```json
{
  "id": 123, // optional; if provided, UPDATE, else INSERT
  "category": "Electronics",
  "question": "What is the MOQ?",
  "answer": "Minimum order quantity varies by supplier...",
  "tags": ["moq", "order", "quantity"],
  "priority": 10,
  "is_active": true,
  "updated_by": "admin@example.com"
}
```

#### `DELETE /api/knowledge?id=123` (Admin only)

Delete knowledge entry.

---

### Settings

#### `GET /api/settings`

Fetch current business settings.

**Response:**
```json
{
  "id": 1,
  "business_name": "Sokogate",
  "business_description": "Africa's premier B2B...",
  "ai_goal": "Capture leads...",
  "primary_color": "#1E3A8A",
  "secondary_color": "#EF4444",
  "created_at": "2026-05-01T00:00:00Z",
  "updated_at": "2026-05-10T12:00:00Z"
}
```

#### `POST /api/settings` (Admin only)

Update settings. Creates new row (latest is always used).

---

### Data Import (Admin)

All import endpoints require admin authentication.

#### `POST /api/leads/import`

Upload CSV file with leads.

**Request:** `multipart/form-data` with `file` field.

**Response:**
```json
{
  "success": true,
  "message": "Import complete: 150 leads imported, 2 errors",
  "total": 152,
  "successCount": 150,
  "errorCount": 2,
  "errors": ["Row 5: Invalid email format - ..."]
}
```

---

## Data Schemas

### Lead
```sql
id SERIAL
name VARCHAR(200)
email VARCHAR(200)
phone VARCHAR(50)
whatsapp VARCHAR(50)
message TEXT
score VARCHAR(10) -- 'High','Medium','Low'
intent_summary TEXT
category VARCHAR(100)
keyword_score VARCHAR(10)
source VARCHAR(20) -- 'chat', 'manual', etc.
conversation_stage VARCHAR(50)
handoff_requested BOOLEAN
status VARCHAR(20) -- 'New','Qualified','Closed'
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
```

---

## Error Responses

All errors follow envelope:

```json
{
  "success": false,
  "error": "Error message",
  "details": { /* optional validation errors */ }
}
```

**Status Codes:**
- `400` - Validation error
- `401` - Unauthorized
- `403` - Forbidden (not admin)
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Server error

Rate limited responses include headers:
```
Retry-After: 60
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1715462400
```

---

## Health Check

`GET /api/health` (to be implemented)

Expected: `{ status: "ok", timestamp: "..." }`

---

*For internal developer use only. Not for public consumption without authentication.*
