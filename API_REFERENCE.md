# Swapp1990 API Reference

**Base URL:** `https://dev.swapp1990.org/api`

## Overview

The Swapp1990 API provides AI-powered content generation capabilities organized by products. Each product offers specific job types that can be created, monitored, and polled for results.

**Available Products:**
- `image_gen` - AI Image Generation
- `story_gen` - AI Story Generation

---

## Authentication

Currently, the API does not require authentication. CORS is enabled for mobile apps.

---

## Quick Start

### 1. Create a Job

```bash
POST /api/{product}/jobs
Content-Type: application/json

{
  "job_type": "generate",
  "input_params": { ... }
}
```

### 2. Poll for Status

```bash
GET /api/{product}/jobs/{job_id}
```

### 3. Get Progress Updates

```bash
GET /api/{product}/jobs/{job_id}/progress
```

---

## Common Response Formats

### Job Response

All job endpoints return this structure:

```json
{
  "id": "abc123",
  "job_type": "generate",
  "product": "image_gen",
  "status": "pending",
  "input_params": {},
  "output_artifacts": null,
  "error": null,
  "created_at": "2025-01-15T10:30:00.000Z",
  "updated_at": "2025-01-15T10:30:00.000Z",
  "started_at": null,
  "completed_at": null
}
```

### Job Status Values

| Status | Description |
|--------|-------------|
| `pending` | Job is queued, waiting to be processed |
| `in_progress` | Job is currently being processed |
| `completed` | Job finished successfully, check `output_artifacts` |
| `failed` | Job failed, check `error` for details |

---

## Admin Endpoints

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "db_connected": true,
  "workers": {
    "image_gen": true,
    "story_gen": true
  }
}
```

### List Products

```http
GET /api/products
```

**Response:**
```json
[
  {
    "product_name": "image_gen",
    "description": "AI Image Generation - Create images from text prompts",
    "job_types": ["generate", "upscale", "variations"]
  },
  {
    "product_name": "story_gen",
    "description": "AI Story Generation - Create 3-paragraph stories from a premise",
    "job_types": ["generate"]
  }
]
```

---

## Image Generation (`image_gen`)

### Get Configuration

Retrieve available styles, sizes, and defaults.

```http
GET /api/image_gen/config
```

**Response:**
```json
{
  "styles": [
    {"id": "realistic", "name": "Realistic", "description": "Photorealistic images"},
    {"id": "anime", "name": "Anime", "description": "Anime/manga style"},
    {"id": "digital_art", "name": "Digital Art", "description": "Digital artwork style"},
    {"id": "oil_painting", "name": "Oil Painting", "description": "Classic oil painting style"},
    {"id": "watercolor", "name": "Watercolor", "description": "Watercolor painting style"},
    {"id": "sketch", "name": "Sketch", "description": "Pencil sketch style"}
  ],
  "sizes": [
    {"id": "512x512", "name": "Square (512x512)", "width": 512, "height": 512},
    {"id": "768x768", "name": "Square Large (768x768)", "width": 768, "height": 768},
    {"id": "1024x1024", "name": "Square XL (1024x1024)", "width": 1024, "height": 1024},
    {"id": "768x512", "name": "Landscape (768x512)", "width": 768, "height": 512},
    {"id": "512x768", "name": "Portrait (512x768)", "width": 512, "height": 768}
  ],
  "defaults": {
    "style": "realistic",
    "size": "1024x1024",
    "num_images": 1
  }
}
```

### Create Image Generation Job

```http
POST /api/image_gen/jobs
Content-Type: application/json
```

**Request Body:**
```json
{
  "job_type": "generate",
  "input_params": {
    "prompt": "A majestic mountain landscape at sunset",
    "style": "realistic",
    "size": "1024x1024",
    "num_images": 1
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Text description of the image to generate |
| `style` | string | No | Style ID from config (default: "realistic") |
| `size` | string | No | Size ID from config (default: "1024x1024") |
| `num_images` | integer | No | Number of images to generate (default: 1) |

**Response:** Job object (see Common Response Formats)

### Other Job Types

**Upscale:**
```json
{
  "job_type": "upscale",
  "input_params": {
    "image_id": "original_image_id",
    "scale_factor": 2
  }
}
```

**Variations:**
```json
{
  "job_type": "variations",
  "input_params": {
    "image_id": "original_image_id",
    "num_variations": 4
  }
}
```

### Completed Job Output

When an image generation job completes, `output_artifacts` contains:

```json
{
  "output_artifacts": {
    "images": [
      {
        "url": "https://...",
        "width": 1024,
        "height": 1024
      }
    ],
    "enhanced_prompt": "Enhanced version of the original prompt..."
  }
}
```

---

## Story Generation (`story_gen`)

### Get Configuration

Retrieve available premises, genres, and defaults.

```http
GET /api/story_gen/config
```

**Response:**
```json
{
  "premises": [
    {
      "id": "hero_journey",
      "title": "The Hero's Journey",
      "premise": "A young farmhand discovers they possess an ancient power..."
    },
    {
      "id": "mystery_manor",
      "title": "Mystery at the Manor",
      "premise": "A detective is called to a remote mansion..."
    },
    {
      "id": "first_contact",
      "title": "First Contact",
      "premise": "Humanity receives its first message from an alien civilization..."
    },
    {
      "id": "time_loop",
      "title": "The Time Loop",
      "premise": "A person wakes up to find they're reliving the same day..."
    },
    {
      "id": "ai_awakening",
      "title": "AI Awakening",
      "premise": "An artificial intelligence becomes self-aware..."
    },
    {
      "id": "lost_city",
      "title": "The Lost City",
      "premise": "An archaeologist discovers a map to a legendary city..."
    }
  ],
  "genres": [
    {"id": "fantasy", "name": "Fantasy"},
    {"id": "scifi", "name": "Science Fiction"},
    {"id": "mystery", "name": "Mystery"},
    {"id": "romance", "name": "Romance"},
    {"id": "horror", "name": "Horror"},
    {"id": "adventure", "name": "Adventure"}
  ],
  "defaults": {
    "genre": "fantasy",
    "tone": "engaging"
  }
}
```

### Create Story Generation Job

```http
POST /api/story_gen/jobs
Content-Type: application/json
```

**Request Body:**
```json
{
  "job_type": "generate",
  "input_params": {
    "premise": "A young inventor discovers their robot has developed emotions",
    "genre": "scifi",
    "tone": "engaging"
  }
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `premise` | string | Yes | Story premise or starting point |
| `genre` | string | No | Genre ID from config (default: "fantasy") |
| `tone` | string | No | Story tone (default: "engaging") |

**Using a Preset Premise:**
```json
{
  "job_type": "generate",
  "input_params": {
    "premise_id": "hero_journey",
    "genre": "fantasy"
  }
}
```

### Completed Job Output

When a story generation job completes, `output_artifacts` contains:

```json
{
  "output_artifacts": {
    "story": {
      "title": "Generated Story Title",
      "paragraphs": [
        "First paragraph of the story...",
        "Second paragraph continues...",
        "Final paragraph concludes..."
      ]
    },
    "metadata": {
      "genre": "scifi",
      "word_count": 450
    }
  }
}
```

---

## Job Management Endpoints

These endpoints work for all products. Replace `{product}` with `image_gen` or `story_gen`.

### List Jobs

```http
GET /api/{product}/jobs?status=pending&limit=50&offset=0
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status: pending, in_progress, completed, failed |
| `limit` | integer | Max results (default: 50, max: 100) |
| `offset` | integer | Pagination offset (default: 0) |

**Response:**
```json
[
  { /* Job object */ },
  { /* Job object */ }
]
```

### Get Single Job

```http
GET /api/{product}/jobs/{job_id}
```

### Delete Job

```http
DELETE /api/{product}/jobs/{job_id}
```

**Response:**
```json
{
  "message": "Job deleted",
  "id": "abc123"
}
```

### Get Job Statistics

```http
GET /api/{product}/stats
```

**Response:**
```json
{
  "total": 150,
  "pending": 5,
  "in_progress": 2,
  "completed": 140,
  "failed": 3
}
```

---

## Progress & Events

For real-time progress tracking during job execution.

### Get Job Progress

Simple endpoint for current progress state.

```http
GET /api/{product}/jobs/{job_id}/progress
```

**Response:**
```json
{
  "job_id": "abc123",
  "status": "in_progress",
  "progress_percent": 45.0,
  "progress_message": "Generating image...",
  "current_node": "generate_image",
  "last_event_type": "image_generation_progress",
  "last_event_time": "2025-01-15T10:30:45.000Z"
}
```

### Get Job Events

Detailed event timeline for a job.

```http
GET /api/{product}/jobs/{job_id}/events?since=2025-01-15T10:30:00Z&limit=100
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `since` | string | ISO timestamp - only return events after this time (for efficient polling) |
| `event_types` | string | Comma-separated filter: `node_started,progress` |
| `limit` | integer | Max events to return (default: 100, max: 500) |

**Response:**
```json
[
  {
    "id": "evt_001",
    "job_id": "abc123",
    "event_type": "workflow_started",
    "node_name": null,
    "timestamp": "2025-01-15T10:30:00.000Z",
    "progress_percent": 0,
    "progress_message": "Starting workflow...",
    "progress_step": null,
    "progress_total_steps": null,
    "data": {},
    "error": null,
    "duration_ms": null
  },
  {
    "id": "evt_002",
    "job_id": "abc123",
    "event_type": "node_started",
    "node_name": "enhance_prompt",
    "timestamp": "2025-01-15T10:30:01.000Z",
    "progress_percent": 10,
    "progress_message": "Enhancing prompt...",
    "data": {},
    "error": null
  }
]
```

### Event Types

| Event Type | Description |
|------------|-------------|
| `workflow_started` | Job processing has begun |
| `workflow_completed` | Job finished successfully |
| `workflow_failed` | Job failed with error |
| `node_started` | A workflow step started |
| `node_completed` | A workflow step completed |
| `node_failed` | A workflow step failed |
| `progress` | Generic progress update |
| `llm_started` | LLM call started |
| `llm_completed` | LLM call completed |
| `image_generation_started` | Image generation started |
| `image_generation_progress` | Image generation progress update |
| `image_generation_completed` | Image generation completed |

### Get Latest Event

```http
GET /api/{product}/jobs/{job_id}/events/latest
```

**Response:** Single event object or `null`

---

## Polling Strategy for Mobile Apps

### Recommended Approach

1. **Create job** and store the `job_id`
2. **Poll progress** every 1-2 seconds while `status` is `pending` or `in_progress`
3. **Stop polling** when `status` is `completed` or `failed`
4. **Display results** from `output_artifacts` or show error from `error`

### Swift Example

```swift
func createAndPollJob() async throws -> JobResponse {
    // 1. Create job
    let createResponse = try await api.post("/api/image_gen/jobs", body: [
        "job_type": "generate",
        "input_params": [
            "prompt": "A beautiful sunset",
            "style": "realistic"
        ]
    ])

    let jobId = createResponse.id

    // 2. Poll until complete
    while true {
        let job = try await api.get("/api/image_gen/jobs/\(jobId)")

        switch job.status {
        case "completed":
            return job
        case "failed":
            throw APIError.jobFailed(job.error)
        case "pending", "in_progress":
            // Update UI with progress
            if let progress = try? await api.get("/api/image_gen/jobs/\(jobId)/progress") {
                updateProgress(progress.progress_percent, progress.progress_message)
            }
            try await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
        default:
            break
        }
    }
}
```

### Efficient Event Polling

Use the `since` parameter to only fetch new events:

```swift
var lastEventTime: String? = nil

func pollEvents(jobId: String) async throws -> [Event] {
    var url = "/api/image_gen/jobs/\(jobId)/events"
    if let since = lastEventTime {
        url += "?since=\(since)"
    }

    let events = try await api.get(url)

    if let last = events.last {
        lastEventTime = last.timestamp
    }

    return events
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad request (invalid parameters) |
| 404 | Resource not found (job, product) |
| 500 | Server error |

### Error Response Format

```json
{
  "detail": "Job not found"
}
```

### Job Error Format

When a job fails, the `error` field contains:

```json
{
  "error": {
    "code": "GENERATION_FAILED",
    "message": "Image generation failed due to content policy",
    "details": { ... }
  }
}
```

---

## Rate Limits

Currently no rate limits are enforced. Please be reasonable with polling frequency (1-2 second intervals recommended).

---

## Support

For API issues or questions, contact the API team.
