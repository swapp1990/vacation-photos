# Vacation Photos — Sharing Feature Requirements (Non‑Technical)

**Document owner:** Product  
**Audience:** iOS Engineering + Design  
**Purpose:** Define what “Sharing a vacation cluster” must accomplish, independent of implementation (CloudKit vs backend).  
**Last updated:** Jan 15, 2026

---

## 1) Summary

Users can select a **Vacation Cluster** (already grouped in-app) and share it with trip mates **without requiring app accounts/logins**. Recipients receive an invite via **WhatsApp / Messages / Email**, install the app if needed, and then **view the shared vacation**. Optional: recipients can **save photos to their device** and/or **contribute photos back** (future).

---

## 2) Goals

### Primary goals
1. **Frictionless sharing** (no in-app accounts)
2. **High conversion from invite → install → open shared vacation**
3. **High-quality photo viewing** (no “social-media recompression” feel)
4. **Privacy-respecting** sharing (user-controlled)

### Secondary goals
5. **Personalized invites** (note + optional cover/collage preview)
6. **Works well for WhatsApp** (most common channel)
7. **Recipients can save photos to their device** (explicit action)

---

## 3) Definitions

- **Vacation Cluster:** A set of photos/videos grouped as one trip in-app (existing feature).
- **Owner/Sender:** Person who initiates sharing.
- **Recipient:** Person who receives invite and views trip.
- **Invite Link:** A single URL shared via WhatsApp/SMS/email that opens the app (if installed) or a landing page / App Store path (if not).

---

## 4) Core User Stories

### Sender (Owner)
- As a sender, I can share a vacation cluster with trip mates via **WhatsApp, Messages, or Email**.
- As a sender, I can add a **personal note** that appears in the invite message.
- As a sender, I can choose whether the invite includes an **image preview** (cover photo or collage) or not.
- As a sender, I can choose **share quality** (e.g., Original / High Quality / Preview) *if needed for performance/storage*.
- As a sender, I can set recipients as **View-only** (default).
- As a sender, I can stop sharing later (revoke access).

### Recipient
- As a recipient, I can tap the link and:
  - If I have the app: open directly to the shared vacation.
  - If I don’t have the app: be guided to install and then see the shared vacation.
- As a recipient, I can view the vacation photos in high quality inside the app.
- As a recipient, I can **save selected photos/videos** to my device (Photos app) via an explicit action.
- As a recipient, I can forward the same invite link to other trip mates (optional policy decision).

---

## 5) End-to-End Flow Requirements

### 5.1 Sender flow
1. Sender opens a Vacation Cluster
2. Taps **Share**
3. Choose recipients (preferred: Contacts picker; fallback: manual entry)
4. Add optional:
   - Trip title (editable)
   - Personal note (editable)
   - Optional invite preview image toggle (cover/collage)
5. Choose share channel:
   - WhatsApp
   - Messages
   - Email
   - “More…” (system share sheet)
6. App generates invite link and opens chosen channel with prefilled message + link

### 5.2 Recipient flow
1. Recipient taps invite link
2. If installed → app opens to “Accept / View Shared Vacation”
3. If not installed → landing page → App Store → post-install the recipient can access the same vacation (ideal: seamless)
4. Recipient sees shared vacation in-app
5. Recipient can:
   - View photos
   - Save photos/videos to device (explicit)
   - Share link onward (if allowed)

---

## 6) Invite Message Requirements (Personalization)

### Must-have
- Sender name (e.g., “Neha wants to share vacation photos with you”)
- Trip title (or default like “Vacation Photos”)
- Personal note (optional)
- Single invite link

### Nice-to-have
- Short summary line: “3 days • 42 photos • Jan 2–5”
- “Tap to view in app” CTA phrasing
- Localized message templates (later)

---

## 7) WhatsApp Link Preview Requirements (Graphic + Text)

When the invite link is pasted into WhatsApp, it should ideally show a **preview card** containing:
- Title (personalized)
- Description (personal note)
- Image preview (cover photo or collage), **opt-in** by sender

**Privacy requirement:** If preview includes real trip photos, user must explicitly opt in and understand that the preview image may be fetched by WhatsApp/link preview systems.

**Fallback:** If opt-in is off, preview image is an app-branded graphic (no personal photos).

---

## 8) Access & Permissions Requirements (User-facing behavior)

### Photo access (Sender)
- Sender must grant photo access to share photos from their library.
- If access is limited, app should allow “Select more photos” / handle partial sharing gracefully.

### iCloud requirement (Implementation-dependent)
- If the chosen implementation requires iCloud (e.g., CloudKit), app must:
  - Detect when iCloud is unavailable
  - Show clear guidance on enabling/signing in
  - Provide a fallback (e.g., share fewer photos / alternate method) if possible

### Saving to device (Recipient)
- Saving photos/videos to Photos library must require explicit user action and the appropriate permission prompt.

---

## 9) Content & Quality Requirements

### Viewing quality
- In-app viewing should be “high quality” (fast enough, sharp, zoomable).

### Sharing quality options (product behavior)
Define one of these product stances:
- **A) Always high quality** (app picks the best balance)
- **B) User-selectable**: Original / High Quality / Preview
- **C) Smart**: “Original when possible; otherwise High Quality”

### Large files / videos
- If videos or Live Photos are included, the system must handle cases where originals are too large:
  - Automatically fall back to high quality, or
  - Warn sender and let them choose, or
  - Exclude unsupported files with a clear message

---

## 10) Controls and Safety

### Owner controls
- “Manage shared vacation”
  - View who has access
  - Revoke access
  - Stop sharing entirely

### Abuse prevention (basic)
- Limit the number of invites sent per day per user/device (simple guardrail)
- Require user confirmation before sending to many recipients

---

## 11) Non-Functional Requirements

### Performance
- Sharing should not feel “stuck”: show progress (preparing, uploading, creating invite)
- Avoid blocking the UI; allow background-safe behavior where possible

### Reliability
- If something fails, show actionable messages:
  - “Couldn’t create invite link”
  - “Upload failed—tap to retry”
  - “Recipient can’t access—sharing was revoked”

### Privacy
- Default to minimal exposure:
  - No public web gallery by default
  - Invite preview with real photos is opt-in only
- Clear messaging: “Only people with this link can access” (or stricter, depending on implementation)

---

## 12) Success Metrics (Define for launch)

- **Invite sent → link opened rate**
- **Link opened → app install rate** (new users)
- **Install → shared vacation viewed rate**
- **# of recipients per vacation shared**
- **Secondary:** # of saves to Photos, repeat shares within 7 days

---

## 13) UX/UI Requirements Checklist

### Required screens/components
- Share entry point on Vacation Cluster screen
- Add recipients:
  - Contacts picker
  - Manual entry
- Compose invite:
  - Note
  - Cover/collage preview toggle
- Progress UI during “preparing share”
- Recipient “Accept / View” screen
- Shared vacation viewer
- Save-to-device action (single + multi-select)
- Manage sharing screen (owner)

---

## 14) Open Decisions for Engineering to Choose “Best Path”

Engineering should propose implementation options and recommend one based on:
1. **No-login requirement**
2. WhatsApp-friendly invite links + preview cards
3. High quality content delivery
4. Recipient install & deep link reliability
5. Storage/quotas/cost constraints

Typical options (examples, not mandates):
- Apple-native sharing approach (iCloud-based)
- Backend-based sharing (token links + storage)
- Hybrid (iCloud for some, backend for previews/deferred deep links)

---

## 15) Out of Scope (for v1 unless explicitly chosen)

- Full web gallery experience
- Cross-platform (Android) support
- Complex roles/permissions (commenter/editor)
- Multi-album “family space”
- Advanced analytics dashboard

---

## 16) Acceptance Criteria (v1)

A v1 is “done” when:
1. Sender can share a Vacation Cluster via WhatsApp and Messages using a link
2. Recipient can open the link and view the shared vacation in-app
3. Recipient can save individual photos to their device
4. Sender can revoke access / stop sharing
5. Invite supports a personal note, and the note appears in the message and/or preview
6. WhatsApp preview shows reasonable title/description; image preview is opt-in
