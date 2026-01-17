# CloudKit Photo Sharing

## Overview

This document explains how vacation photos are shared between users using Apple's CloudKit service. When you share a vacation with a friend, the photos are uploaded to iCloud and the recipient can view and download them to their own device.

---

## Why CloudKit Was Needed

### The Problem

Users wanted to share their vacation photos with friends and family. The challenge:
- Photos live locally on the user's device
- Friends need to access these photos on their own devices
- No backend server exists to store and serve photos
- Solution must work seamlessly on iOS

### Why CloudKit?

| Option | Pros | Cons |
|--------|------|------|
| **CloudKit** | Free with Apple account, no server to maintain, native iOS integration | iOS only |
| AWS S3 | Cross-platform | Requires server, costs money |
| Firebase Storage | Cross-platform, easy | Costs money at scale |
| Peer-to-peer | No storage needed | Both users must be online |

**CloudKit won because:**
- Users already have iCloud accounts
- 1GB free for public database assets
- No backend server to build or maintain
- Native Swift API integrates well with React Native

---

## How It Works

### Sharing Flow (Sender)

```
┌──────────────────────────────────────────────────────────────────┐
│                         SENDER'S DEVICE                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. User taps "Share" on vacation card                           │
│     └─ Opens ShareModal                                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Enter name (first time only)                                 │
│     └─ Stored locally for future shares                          │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. Photos compressed and uploaded to CloudKit                   │
│     ├─ SharedVacation record (metadata)                          │
│     └─ SharedPhoto records (up to 50 photos)                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. Select contact and send via WhatsApp/Messages                │
│     └─ Share link: https://swapp1990.github.io/share/{shareId}   │
└──────────────────────────────────────────────────────────────────┘
```

### Receiving Flow (Recipient)

```
┌──────────────────────────────────────────────────────────────────┐
│                       RECIPIENT'S DEVICE                         │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. Tap share link                                               │
│     ├─ App installed → Opens SharedVacationViewer                │
│     └─ App not installed → Opens App Clip (instant preview)     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. Fetch vacation from CloudKit                                 │
│     ├─ fetchSharedVacation(shareId) → metadata                   │
│     └─ fetchSharedPhotos(shareId) → photo assets                 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. View photos in grid                                          │
│     ├─ Tap photo → fullscreen view                               │
│     └─ "Save All" → download to Photos library                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## CloudKit Data Model

### Record Types

Two record types are stored in CloudKit's **public database**:

#### SharedVacation (Metadata)

| Field | Type | Description |
|-------|------|-------------|
| `shareId` | String | Unique identifier (UUID) |
| `locationName` | String | "Paris, France" |
| `startDate` | Date | Vacation start date |
| `endDate` | Date | Vacation end date |
| `photoCount` | Int | Number of photos |
| `sharedBy` | String | Sender's name |

#### SharedPhoto (Individual Photo)

| Field | Type | Description |
|-------|------|-------------|
| `shareId` | String | Links to SharedVacation |
| `orderIndex` | Int | Position in gallery (0, 1, 2...) |
| `width` | Int | Photo width in pixels |
| `height` | Int | Photo height in pixels |
| `photoAsset` | CKAsset | The actual image file |

### Record ID Scheme

- **SharedVacation:** `{shareId}` (e.g., `abc123-def456-...`)
- **SharedPhoto:** `{shareId}_{orderIndex}` (e.g., `abc123-def456-..._0`)

---

## What Was Implemented

### 1. Native CloudKit Module

**Why:** React Native doesn't have built-in CloudKit support. A native Swift module bridges the gap.

**What was done:**
- Created `CloudKitManager.swift` with methods for upload/fetch operations
- Created `CloudKitBridge.m` to expose Swift methods to JavaScript
- Expo config plugin copies these files during prebuild

**Files:**
- `native-modules/ios/CloudKitManager.swift` - Native Swift module
- `native-modules/ios/CloudKitBridge.m` - Objective-C bridge
- `plugins/withCloudKit.js` - Expo config plugin

**Key methods:**
```swift
// Upload vacation metadata
uploadSharedVacation(shareId, locationName, startDate, endDate, photoCount, sharedBy)

// Upload a single photo
uploadPhoto(shareId, photoPath, orderIndex, width, height)

// Fetch vacation metadata
fetchSharedVacation(shareId) → {locationName, startDate, endDate, ...}

// Fetch all photos for a vacation
fetchSharedPhotos(shareId) → [{localPath, width, height, orderIndex}, ...]

// Fetch preview photos (first 3, for notification banner)
fetchPreviewPhotos(shareId) → [{localPath, ...}, ...]
```

---

### 2. JavaScript Service Layer

**Why:** Clean API for React components to call without dealing with native module details.

**What was done:**
- Created `cloudKitService.js` as a wrapper around the native module
- Handles date conversions (JS Date ↔ Unix timestamps)
- Generates share links

**Files:**
- `src/services/cloudKitService.js` - JS wrapper for native module

**Example usage:**
```javascript
import { uploadSharedVacation, fetchSharedVacation } from './cloudKitService';

// Upload
await uploadSharedVacation({
  shareId: 'abc123',
  locationName: 'Paris, France',
  startDate: new Date('2024-06-15'),
  endDate: new Date('2024-06-22'),
  photoCount: 45,
  sharedBy: 'John',
});

// Fetch
const vacation = await fetchSharedVacation('abc123');
// → { shareId, locationName, startDate, endDate, photoCount, sharedBy }
```

---

### 3. Photo Upload Service

**Why:** Uploading 50 high-resolution photos requires compression, batching, and progress tracking.

**What was done:**
- Photos compressed to max 2048px, 80% JPEG quality
- Upload in batches of 3 (prevents overwhelming CloudKit)
- Progress callbacks for UI feedback
- Upload caching to avoid re-uploading the same vacation

**Files:**
- `src/services/photoUploadService.js` - Upload logic

**Key features:**

| Feature | Description |
|---------|-------------|
| **Compression** | Resize to 2048px max, 80% JPEG quality |
| **Batching** | Upload 3 photos at a time |
| **Progress** | Callbacks for "uploading 5/50" UI |
| **Caching** | Don't re-upload if already shared |
| **Max limit** | 50 photos per vacation |

**Cache key format:**
```
{location}_{startDate}_{endDate}_{photoCount}
Example: Paris_France_2024-06-15_2024-06-22_45
```

---

### 4. Photo Download Service

**Why:** Recipients need to fetch photos from CloudKit and optionally save to their device.

**What was done:**
- Fetch vacation metadata and photos from CloudKit
- Save individual or all photos to Photos library
- Batch saving with progress tracking

**Files:**
- `src/services/photoDownloadService.js` - Download logic

**Example usage:**
```javascript
import { downloadSharedVacation, saveAllPhotosToDevice } from './photoDownloadService';

// Fetch shared vacation
const result = await downloadSharedVacation('abc123');
// → { vacation: {...}, photos: [{localPath, width, height}, ...] }

// Save all photos to device
await saveAllPhotosToDevice(result.photos, (completed, total) => {
  console.log(`Saved ${completed}/${total}`);
});
```

---

### 5. Share Modal UI

**Why:** Users need a friendly interface to share vacations.

**What was done:**
- Multi-step flow: Name → Upload → Contact → Send
- Photo preview grid during upload confirmation
- Progress indicator during upload
- Contact picker for WhatsApp/Messages

**Files:**
- `src/components/ShareModal.js` - Sharing UI

**Flow screens:**

| Screen | Purpose |
|--------|---------|
| `NAME_INPUT` | Enter your name (first time only) |
| `UPLOAD_CONFIRM` | Preview photos, confirm upload |
| `UPLOADING` | Progress bar during upload |
| `CONTACTS` | Pick a contact to send to |
| `SEND_CONFIRM` | Ready to send via WhatsApp/SMS |

---

### 6. Shared Vacation Viewer

**Why:** Recipients need to view and save shared photos.

**What was done:**
- Photo grid with thumbnail view
- Fullscreen photo viewer on tap
- "Save to Photos" for individual photos
- "Save All" with progress indicator

**Files:**
- `src/components/SharedVacationViewer.js` - Viewing UI

---

### 7. Deep Link Handling

**Why:** Share links need to open the correct vacation.

**What was done:**
- Custom URL scheme: `vacationphotos://share/{shareId}`
- Universal Links: `https://swapp1990.github.io/share/{shareId}`
- App.js parses incoming links and shows SharedVacationViewer

**Files:**
- `App.js` - Deep link handling
- `app.json` - URL scheme configuration

---

### 8. Upload Status Indicator

**Why:** Users should see which vacations are already uploaded to cloud.

**What was done:**
- Cloud status icon on vacation cards (☁️✓ or ☁️⋯)
- Checks upload cache on app load
- Updates after successful upload

**Files:**
- `src/components/ClusterCard.js` - Status indicator
- `App.js` - Upload status checking

---

## File Summary

### Created Files

| File | Purpose |
|------|---------|
| `native-modules/ios/CloudKitManager.swift` | Native CloudKit operations |
| `native-modules/ios/CloudKitBridge.m` | ObjC bridge to React Native |
| `plugins/withCloudKit.js` | Expo config plugin |
| `src/services/cloudKitService.js` | JS wrapper for native module |
| `src/services/photoUploadService.js` | Photo compression and upload |
| `src/services/photoDownloadService.js` | Fetch and save photos |
| `src/components/ShareModal.js` | Sharing UI |
| `src/components/SharedVacationViewer.js` | Viewing shared photos |
| `src/components/SharedVacationsCard.js` | List of shared vacations |
| `src/components/SharedVacationsList.js` | Shared vacations management |

### Modified Files

| File | Changes |
|------|---------|
| `app.json` | Added iCloud entitlements, URL scheme |
| `App.js` | Deep link handling, upload status |
| `src/components/ClusterCard.js` | Cloud status indicator |

---

## Apple Developer Setup

### Required Capabilities

1. **iCloud** with CloudKit enabled
2. **Associated Domains** (for Universal Links)

### CloudKit Container

Container ID: `iCloud.com.swapp1990.vacationphotos`

### Record Types to Create in CloudKit Dashboard

1. **SharedVacation**
   - `shareId` (String, Queryable)
   - `locationName` (String)
   - `startDate` (Date/Time)
   - `endDate` (Date/Time)
   - `photoCount` (Int(64))
   - `sharedBy` (String)

2. **SharedPhoto**
   - `shareId` (String, Queryable, Sortable)
   - `orderIndex` (Int(64), Sortable)
   - `width` (Int(64))
   - `height` (Int(64))
   - `photoAsset` (Asset)

---

## Limitations

| Limitation | Value | Notes |
|------------|-------|-------|
| Max photos per share | 50 | Prevents excessive uploads |
| Photo size | 2048px max | Compressed for upload speed |
| CloudKit quota | 1GB free | Per Apple Developer account |
| Platform | iOS only | CloudKit is Apple-only |

---

## Future Improvements

- **Android support** - Use Firebase Storage as alternative backend
- **Expiring links** - Auto-delete after 30 days
- **Selective sharing** - Pick specific photos instead of all
- **Higher quality option** - Allow full-res upload for Wi-Fi
- **Share history** - View all vacations you've shared
