# Vacation Photos - Backend API Requirements

## Product Info

- **Product ID:** `vacation_photos`
- **Bundle ID:** `com.swapp1990.vacationphotos`
- **Platform:** iOS

---

## API Endpoints

Base URL: `https://api.yourbackend.com/v1/vacation_photos`

---

## 1. Subscriptions

### 1.1 Verify Receipt

```
POST /subscriptions/verify
```

**Request:**
```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "receipt_data": "MIIT...base64_encoded_receipt..."
}
```

**Response:**
```json
{
  "success": true,
  "subscription": {
    "status": "active",
    "product_id": "com.swapp1990.vacationphotos.pro.monthly",
    "expires_at": "2025-02-19T00:00:00Z"
  }
}
```

### 1.2 Check Status

```
GET /subscriptions/status?device_id={device_id}
```

**Response:**
```json
{
  "is_active": true,
  "status": "active",
  "product_id": "com.swapp1990.vacationphotos.pro.monthly",
  "expires_at": "2025-02-19T00:00:00Z"
}
```

### 1.3 Apple Webhook

```
POST /subscriptions/apple-webhook
```

Handle Apple server-to-server notifications.

---

## 2. Image Analysis (Async Agent Jobs)

### 2.1 Analyze Single Image

```
POST /analyze/image
```

**Request:**
```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_data": "base64_encoded_image",
  "analysis_types": ["scene", "food", "landmark", "mood"]
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "job_abc123",
  "status": "processing"
}
```

### 2.2 Analyze Trip (Batch)

```
POST /analyze/trip
```

**Request:**
```json
{
  "device_id": "550e8400-e29b-41d4-a716-446655440000",
  "trip_id": "trip_hawaii_2025",
  "images": [
    {
      "id": "photo_001",
      "image_data": "base64_or_url",
      "timestamp": "2025-01-15T10:30:00Z",
      "location": {"lat": 21.2765, "lng": -157.8283}
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "job_id": "job_xyz789",
  "status": "processing"
}
```

### 2.3 Get Job Status

```
GET /jobs/{job_id}
```

**Response (processing):**
```json
{
  "job_id": "job_abc123",
  "status": "processing",
  "progress": 0.45
}
```

**Response (completed - single image):**
```json
{
  "job_id": "job_abc123",
  "status": "completed",
  "result": {
    "scene": {
      "description": "A sunset over a tropical beach with palm trees",
      "tags": ["beach", "sunset", "tropical", "palm trees", "ocean"]
    },
    "food": null,
    "landmark": {
      "name": "Waikiki Beach",
      "location": "Honolulu, Hawaii, USA"
    },
    "mood": {
      "primary": "peaceful",
      "secondary": "romantic"
    }
  }
}
```

**Response (completed - trip):**
```json
{
  "job_id": "job_xyz789",
  "status": "completed",
  "result": {
    "trip_summary": {
      "destination": "Hawaii, USA",
      "duration": "5 days",
      "total_photos": 127,
      "highlights": ["Beach sunsets", "Snorkeling", "Local cuisine"],
      "food_discovered": ["Poke bowl", "Shave ice", "Loco moco"],
      "landmarks_visited": ["Diamond Head", "Waikiki Beach", "Pearl Harbor"],
      "trip_personality": {
        "foodie": 0.73,
        "adventure": 0.45,
        "culture": 0.82,
        "relaxation": 0.91
      }
    },
    "photos": [
      {
        "id": "photo_001",
        "analysis": { ... }
      }
    ]
  }
}
```

---

## 3. AI Generation (Future - uses analysis results)

These endpoints will use the image analysis data already stored from Phase 1.

### 3.1 Generate Trip Story
```
POST /generate/story
```

### 3.2 Generate Captions
```
POST /generate/captions
```

### 3.3 Generate Postcard
```
POST /generate/postcard
```

### 3.4 Find Forgotten Moments
```
POST /analyze/forgotten-moments
```

*(Detailed specs to be added when implementing)*

---

## MVP Priority

1. `/subscriptions/verify`
2. `/subscriptions/status`
3. `/analyze/image` (async job)
4. `/jobs/{job_id}`
