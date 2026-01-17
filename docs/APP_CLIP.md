# App Clip Implementation

## Overview

This document explains the iOS App Clip feature for Vacation Photos, which allows friends to instantly view shared vacation photos without installing the full app.

---

## Why App Clip Was Needed

### The Problem

When a user shares their vacation photos with a friend, they send a link like:
```
vacationphotos://share/abc123
```

**What happens if the friend doesn't have the app installed?**

Previously: Nothing. The link wouldn't work, and the friend would need to:
1. Go to the App Store
2. Search for "Vacation Photos"
3. Install the app
4. Open the app
5. Somehow get back to that share link
6. Finally see the photos

This creates friction and often results in friends never seeing the shared photos.

### The Solution

With App Clip, when a friend taps a share link:
1. **Instant preview** - Photos appear within seconds (no install required)
2. **"Get Full App" prompt** - One tap to install
3. **Seamless handoff** - After installing, the shared vacation is already loaded

---

## Technical Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Universal Link                          │
│         https://swapp1990.github.io/share/{shareId}         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Apple's Link Routing        │
              │   (checks AASA file)          │
              └───────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
   ┌─────────────────┐                ┌─────────────────┐
   │   App Installed │                │ App Not Installed│
   │                 │                │                 │
   │  Opens full app │                │ Opens App Clip  │
   │  with shareId   │                │ (instant)       │
   └─────────────────┘                └─────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ View Photos     │
                                      │ "Get Full App"  │
                                      └─────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ App Group       │
                                      │ Stores shareId  │
                                      └─────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ Full App Opens  │
                                      │ Shows vacation  │
                                      │ immediately     │
                                      └─────────────────┘
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **App Clip** | Lightweight iOS app (<10MB) that loads instantly |
| **Universal Links** | HTTPS links that iOS routes to apps |
| **App Groups** | Shared storage between App Clip and full app |
| **AASA File** | JSON file that tells Apple which links your app handles |

---

## What Was Implemented

### 1. Universal Links Configuration

**Why:** Custom URL schemes (`vacationphotos://`) don't work for users without the app. Universal Links (`https://`) work for everyone.

**What was done:**
- Changed share links from `vacationphotos://share/{id}` to `https://swapp1990.github.io/share/{id}`
- Added `associatedDomains` to `app.json` so iOS knows to open our app for these links
- Created `apple-app-site-association` file for GitHub Pages hosting

**Files:**
- `app.json` - Added associated domains
- `src/services/cloudKitService.js` - Updated `generateShareLink()` function
- `web/.well-known/apple-app-site-association` - Domain verification file

---

### 2. Expo Config Plugin for App Clip

**Why:** Expo doesn't have built-in App Clip support. A config plugin extends the iOS build process.

**What was done:**
- Created plugin that generates App Clip files during `expo prebuild`
- Plugin creates entitlements, Info.plist, and Objective-C source files
- Adds App Group capability to main app for data sharing

**Files:**
- `plugins/withAppClip.js` - Main config plugin

**Note:** The Xcode npm package doesn't support adding App Clip targets programmatically. The plugin creates all necessary files, but the target must be added manually in Xcode.

---

### 3. App Clip Code

**Why:** App Clip needs its own simplified codebase that fits under 10MB.

**What was done:**
- Created minimal React Native app for App Clip
- Parses `shareId` from the Universal Link URL
- Fetches vacation data from CloudKit
- Displays photos in a simple grid
- Shows "Get Full App" banner

**Files:**
- `AppClip/index.js` - Entry point (registers the App Clip component)
- `AppClip/App.js` - Main component (handles URL parsing)
- `AppClip/SharedVacationClipViewer.js` - Photo viewer UI

**Size constraints:**
- Included: Photo grid, CloudKit fetch, basic styles
- Excluded: Face detection, upload service, contacts, onboarding

---

### 4. App Group Storage (Data Handoff)

**Why:** When user installs the full app from App Clip, they should see the shared vacation immediately.

**What was done:**
- Created native Swift module for App Group shared storage
- When user taps "Get Full App", the `shareId` is saved to App Group
- Full app checks App Group on launch and loads the vacation if present

**Files:**
- `native-modules/ios/AppGroupStorage.swift` - Native module
- `native-modules/ios/AppGroupStorageBridge.m` - Objective-C bridge
- `src/utils/appGroupStorage.js` - JavaScript wrapper
- `plugins/withCloudKit.js` - Updated to copy native files

**Flow:**
```
App Clip                          Full App
────────                          ────────
User taps "Get Full App"    →
Saves shareId to App Group  →     Checks App Group on launch
                            →     Finds shareId
                            →     Shows SharedVacationViewer
                            →     Clears App Group
                            →     Prompts to continue onboarding
```

---

### 5. Full App Integration

**Why:** Full app needs to detect when user came from App Clip.

**What was done:**
- Added check for pending share on app launch
- If found, immediately shows the shared vacation
- After viewing, prompts user to explore their own photos

**Files:**
- `App.js` - Added `useEffect` to check App Group on mount

---

### 6. Web Fallback Pages

**Why:** If Universal Links fail or user is on Android, they need somewhere to go.

**What was done:**
- Created landing pages for GitHub Pages
- Shows vacation preview with smart app banner
- Links to App Store

**Files:**
- `web/index.html` - Main landing page
- `web/share/index.html` - Share-specific page

---

## File Summary

### Created Files

| File | Purpose |
|------|---------|
| `plugins/withAppClip.js` | Expo config plugin for App Clip |
| `AppClip/index.js` | App Clip entry point |
| `AppClip/App.js` | URL parsing and routing |
| `AppClip/SharedVacationClipViewer.js` | Photo viewer UI |
| `src/utils/appGroupStorage.js` | JS wrapper for shared storage |
| `native-modules/ios/AppGroupStorage.swift` | Native storage module |
| `native-modules/ios/AppGroupStorageBridge.m` | ObjC bridge |
| `web/.well-known/apple-app-site-association` | Universal Links config |
| `web/index.html` | Web fallback landing |
| `web/share/index.html` | Share page fallback |

### Modified Files

| File | Changes |
|------|---------|
| `app.json` | Added associated domains, App Group, plugin |
| `App.js` | Check for pending App Clip share on launch |
| `src/services/cloudKitService.js` | Universal Link generation |
| `plugins/withCloudKit.js` | Copy AppGroupStorage native files |

---

## Setup Checklist

### GitHub Pages

1. Push `web/` folder contents to `swapp1990.github.io` repository
2. Replace `TEAM_ID` in AASA file with actual Apple Team ID
3. Verify AASA is accessible at `https://swapp1990.github.io/.well-known/apple-app-site-association`

### Apple Developer Portal

1. Register App Clip bundle ID: `com.swapp1990.vacationphotos.Clip`
2. Create App Group: `group.com.swapp1990.vacationphotos`
3. Enable Associated Domains for main app and App Clip

### Xcode (after `npx expo prebuild`)

1. Open `ios/VacationPhotos.xcworkspace`
2. File → New → Target → App Clip
3. Product Name: `VacationPhotosClip`
4. Bundle ID: `com.swapp1990.vacationphotos.Clip`
5. Delete auto-generated SwiftUI files
6. Add existing files from `ios/VacationPhotosClip/`
7. Signing & Capabilities:
   - Add App Group: `group.com.swapp1990.vacationphotos`
   - Add Associated Domains: `applinks:swapp1990.github.io`, `appclips:swapp1990.github.io`

### Testing

1. Build and archive with App Clip
2. Upload to TestFlight
3. Test Universal Link on device without app installed
4. Verify App Clip loads and shows photos
5. Install full app from App Clip
6. Verify shared vacation appears immediately

---

## Future Improvements (Phase 2)

- **Firebase Dynamic Links** - Better analytics and cross-platform support
- **Android Instant Apps** - Similar experience for Android users
- **App Clip Card** - Custom appearance in Messages and Safari
- **Location-based triggers** - NFC tags or QR codes at vacation spots
