# iOS App Clips with Expo & EAS Build: Complete Tutorial

A comprehensive guide to adding App Clips to your Expo/React Native app, including all the build errors you'll encounter and how to fix them.

---

## Table of Contents

1. [What Are App Clips?](#1-what-are-app-clips)
2. [Architecture Overview](#2-architecture-overview)
3. [Step 1: Choose Your Link Strategy](#3-step-1-choose-your-link-strategy)
4. [Step 2: Create the Expo Config Plugin](#4-step-2-create-the-expo-config-plugin)
5. [Step 3: Write the App Clip Code (SwiftUI)](#5-step-3-write-the-app-clip-code-swiftui)
6. [Step 4: Configure Xcode](#6-step-4-configure-xcode)
7. [Step 5: EAS Build - Errors You Will Encounter](#7-step-5-eas-build---errors-you-will-encounter)
8. [Step 6: Testing Your App Clip](#8-step-6-testing-your-app-clip)
9. [Current Limitations & Future Improvements](#9-current-limitations--future-improvements)
10. [File Reference](#10-file-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What Are App Clips?

App Clips are lightweight versions of iOS apps (under 10MB) that load instantly without requiring installation from the App Store.

### When App Clips Are Triggered

- **QR Codes** - User scans a QR code containing your URL
- **NFC Tags** - User taps an NFC tag
- **Safari Smart App Banners** - User visits your website
- **Links in Messages** - Someone shares a link in iMessage/WhatsApp
- **Maps** - Business locations can trigger App Clips

### Why You Need One

**The Problem:**
```
User A shares a link: vacationphotos://share/abc123
User B (without the app): Link does nothing
User B must: App Store → Search → Install → Reopen link → Finally see content
```

**With App Clip:**
```
User A shares a link: https://appclip.apple.com/id?p=...&token=abc123
User B (without the app): App Clip card appears → Tap → Instantly see preview → Download app
```

App Clips reduce friction from 6 steps to 2 taps.

---

## 2. Architecture Overview

### Current Implementation (Landing Page App Clip)

```
┌─────────────────────────────────────────────────────────────┐
│                  Default App Clip Link                       │
│  https://appclip.apple.com/id?p=bundle.id&token={shareId}   │
│                    &location={locationName}                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Apple's Link Routing        │
              │   (no AASA file needed)       │
              └───────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
   ┌─────────────────┐                ┌─────────────────┐
   │  App Installed  │                │ App Not Installed│
   │                 │                │                 │
   │  Opens full app │                │ Shows App Clip  │
   │  with shareId   │                │ landing page    │
   └─────────────────┘                └─────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ App Clip shows: │
                                      │ - Location name │
                                      │ - Feature list  │
                                      │ - Download btn  │
                                      └─────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ User downloads  │
                                      │ full app from   │
                                      │ App Store       │
                                      └─────────────────┘
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **App Clip** | Lightweight iOS app (<10MB) that loads instantly |
| **Default App Clip Links** | Apple-hosted URLs (`appclip.apple.com`) - no AASA needed |
| **SwiftUI** | Native iOS framework for App Clip UI (keeps size small) |
| **URL Parameters** | Pass data (shareId, location) to App Clip via URL |

### Why We Chose This Architecture

| Decision | Reason |
|----------|--------|
| **SwiftUI instead of React Native** | React Native dependencies make App Clip 40MB+, exceeding 10MB limit |
| **Default App Clip links** | No need to host AASA file, Apple handles everything |
| **Landing page (no CloudKit)** | App Clips can't access CloudKit without complex provisioning; location passed in URL instead |
| **URL parameters for data** | Avoids CloudKit dependency while still showing useful info |

---

## 3. Step 1: Choose Your Link Strategy

### Option A: Default App Clip Links (Recommended)

Apple provides default App Clip links that require no server setup:

```
https://appclip.apple.com/id?p={bundleId}&token={shareId}&location={name}
```

**Pros:**
- No AASA file hosting required
- Apple handles all the infrastructure
- Works automatically after App Store approval

**Cons:**
- iOS 16.4+ required for App Clip card
- iOS 17+ required for WhatsApp/other app invocation
- Less control over URL format

**Implementation in `src/services/cloudKitService.js`:**

```javascript
const APP_CLIP_BUNDLE_ID = 'com.swapp1990.vacationphotos.Clip';

export function generateShareLink(shareId, locationName = '') {
  const encodedLocation = encodeURIComponent(locationName || 'Vacation');
  return `https://appclip.apple.com/id?p=${APP_CLIP_BUNDLE_ID}&token=${shareId}&location=${encodedLocation}`;
}
```

### Option B: Custom Domain Universal Links (Legacy)

If you need to support older iOS versions or want custom URLs:

1. **Create AASA file** at `/.well-known/apple-app-site-association`:

```json
{
  "appclips": {
    "apps": ["TEAMID.com.yourcompany.yourapp.Clip"]
  },
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.yourcompany.yourapp",
        "paths": ["/share/*"]
      },
      {
        "appID": "TEAMID.com.yourcompany.yourapp.Clip",
        "paths": ["/share/*"]
      }
    ]
  }
}
```

2. **Host on your domain** (GitHub Pages works)
3. **Update app.json**:

```json
{
  "expo": {
    "ios": {
      "associatedDomains": [
        "applinks:yourdomain.com",
        "appclips:yourdomain.com"
      ]
    }
  }
}
```

---

## 4. Step 2: Create the Expo Config Plugin

Expo doesn't natively support App Clips. You need a config plugin to generate the App Clip target files.

Create `plugins/withAppClip.js` - this plugin:
- Adds associated domains to entitlements
- Creates App Clip directory structure
- Generates Info.plist with App Clip settings

See the actual implementation in `plugins/withAppClip.js`.

Register in `app.json`:

```json
{
  "expo": {
    "plugins": [
      "./plugins/withAppClip"
    ]
  }
}
```

Run prebuild:

```bash
npx expo prebuild --clean
```

---

## 5. Step 3: Write the App Clip Code (SwiftUI)

### Why SwiftUI Instead of React Native?

**The 10MB Problem:**

When we initially tried building the App Clip with React Native:
- React Native core: ~15MB
- Expo modules: ~10MB
- Hermes engine: ~8MB
- Other dependencies: ~9MB
- **Total: ~42MB** (exceeds 10MB limit by 4x)

**The Solution:** Pure SwiftUI App Clip

SwiftUI is Apple's native UI framework. A SwiftUI app with no external dependencies compiles to ~2-3MB, well under the limit.

### App Clip File Structure

```
ios/VacationPhotosClip/
├── VacationPhotosClipApp.swift    # Main entry point, URL parsing
├── ContentView.swift               # Root view, handles loading state
├── SharedVacationView.swift        # Landing page UI
├── SharedVacationViewModel.swift   # View model
├── Models.swift                    # Data models
├── Info.plist                      # App Clip configuration
├── VacationPhotosClip.entitlements # Capabilities
├── Images.xcassets/                # App icon
└── Preview Content/                # Xcode previews
```

### Main Entry Point (`VacationPhotosClipApp.swift`)

```swift
import SwiftUI

struct ShareURLData {
    let shareId: String
    let locationName: String?
}

@main
struct VacationPhotosClipApp: App {
    @State private var urlData: ShareURLData?

    var body: some Scene {
        WindowGroup {
            ContentView(urlData: $urlData)
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    handleUserActivity(activity)
                }
                .onOpenURL { url in
                    urlData = parseURL(url)
                }
        }
    }

    private func parseURL(_ url: URL) -> ShareURLData? {
        let urlString = url.absoluteString

        // Default App Clip link: appclip.apple.com/id?p=...&token={shareId}&location={name}
        if urlString.contains("appclip.apple.com"),
           let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let token = components.queryItems?.first(where: { $0.name == "token" })?.value {
            let location = components.queryItems?.first(where: { $0.name == "location" })?.value
            return ShareURLData(shareId: token, locationName: location?.removingPercentEncoding)
        }

        // Legacy patterns for backward compatibility...
        return nil
    }
}
```

### Landing Page UI (`SharedVacationView.swift`)

The App Clip shows:
1. Location name (from URL parameter)
2. App icon and branding
3. Feature list
4. "Download" button → App Store

```swift
struct SharedVacationView: View {
    @ObservedObject var viewModel: SharedVacationViewModel

    var body: some View {
        ZStack {
            // Gradient background
            LinearGradient(...)

            VStack(spacing: 24) {
                // App icon
                // Location name (from URL)
                // "Someone shared photos with you!"
                // Feature list
                // Download button → App Store
            }
        }
    }

    private func openAppStore() {
        UIApplication.shared.open(viewModel.appStoreURL)
    }
}
```

---

## 6. Step 4: Configure Xcode

### 6.1 Add App Clip Target (Manual Step)

The config plugin creates the files, but you must add the target in Xcode:

1. Open `ios/VacationPhotos.xcworkspace` in Xcode
2. File → New → Target
3. Choose "App Clip"
4. Configure:
   - Product Name: `VacationPhotosClip`
   - Bundle Identifier: `com.swapp1990.vacationphotos.Clip`
   - Language: **Swift** (not Objective-C)

### 6.2 Configure Entitlements

The App Clip entitlements (`VacationPhotosClip.entitlements`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:swapp1990.github.io</string>
        <string>appclips:swapp1990.github.io</string>
    </array>
    <key>com.apple.developer.parent-application-identifiers</key>
    <array>
        <string>$(AppIdentifierPrefix)com.swapp1990.vacationphotos</string>
    </array>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.swapp1990.vacationphotos</string>
    </array>
</dict>
</plist>
```

**Important:** We intentionally removed iCloud/CloudKit entitlements from the App Clip:

```xml
<!-- REMOVED - causes provisioning profile issues -->
<key>com.apple.developer.icloud-container-identifiers</key>
<key>com.apple.developer.icloud-services</key>
```

**Why:** CloudKit entitlements require a separate provisioning profile that conflicts with the parent app. Since our App Clip is a landing page that doesn't need to fetch data, we pass the location name in the URL instead.

### 6.3 Configure Podfile

**Critical for size:** The App Clip must have NO CocoaPods dependencies:

```ruby
# ios/Podfile

# Main app - full React Native
target 'VacationPhotos' do
  use_expo_modules!
  use_react_native!(...)
end

# App Clip - Pure SwiftUI, NO dependencies
target 'VacationPhotosClip' do
  # Empty! No pods needed.
  # This keeps the App Clip under 10MB.
end
```

---

## 7. Step 5: EAS Build - Errors You Will Encounter

### Error 1: Missing Preview Content Directory

```
error: Build input file cannot be found: '.../VacationPhotosClip/Preview Content'
```

**Fix:**
```bash
mkdir -p ios/VacationPhotosClip/Preview\ Content
touch ios/VacationPhotosClip/Preview\ Content/.gitkeep
```

---

### Error 2: Missing App Icon Asset Catalog

```
error: The app clip does not contain an AppIcon asset catalog
```

**Fix:** Create `ios/VacationPhotosClip/Images.xcassets/AppIcon.appiconset/` with your 1024x1024 icon.

---

### Error 3: iOS Deployment Target Mismatch

```
error: IPHONEOS_DEPLOYMENT_TARGET is set to 14.0, but supported range is 15.1 to 18.2
```

**Fix:** In `project.pbxproj`, set `IPHONEOS_DEPLOYMENT_TARGET = 15.1` for App Clip target.

---

### Error 4: CFBundleVersion Mismatch

```
error: CFBundleVersion in app clip (1) does not match app (9)
```

**Fix:** Sync versions across all files:
- `app.json` → `buildNumber`
- `ios/VacationPhotos/Info.plist` → `CFBundleVersion`
- `ios/VacationPhotosClip/Info.plist` → `CFBundleVersion`
- `project.pbxproj` → `CURRENT_PROJECT_VERSION` for App Clip target

---

### Error 5: App Clip Too Large (Over 10MB)

```
ITMS-90865: App Clip size exceeds limit - 42 MB, limit is 10 MB
```

**Cause:** React Native dependencies in Podfile.

**Fix:** Make App Clip target empty in Podfile (see Section 6.3).

**Result:** 42MB → 2.84MB

---

### Error 6: Missing NSContactsUsageDescription

```
ITMS-90683: Missing Purpose String - NSContactsUsageDescription
```

**Fix:** Add to App Clip's Info.plist:
```xml
<key>NSContactsUsageDescription</key>
<string>This app does not access your contacts.</string>
```

---

## 8. Step 6: Testing Your App Clip

### What Doesn't Work

| Method | Result |
|--------|--------|
| Clicking App Clip URLs | "Not available in your country" until published |
| Scanning QR codes | Opens Safari, no App Clip card |
| Local Experiences | Unreliable, often no "Invoke" button |

### What Actually Works

#### TestFlight Testing (Recommended)

1. **Build and submit:**
   ```bash
   eas build --platform ios
   eas submit --platform ios
   ```

2. **Configure App Clip Invocations in App Store Connect:**
   - Go to TestFlight → Click on build number
   - Scroll to "App Clip Invocations"
   - Click + to add invocation
   - Enter Title and URL (e.g., `https://appclip.apple.com/id?p=com.swapp1990.vacationphotos.Clip&token=test123&location=Test%20Vacation`)
   - Save

3. **Test on iPhone:**
   - Open TestFlight app
   - Tap on your app
   - See App Clip invocations listed
   - Tap to launch and test the App Clip

**Important:** URL-based invocation (clicking links, QR codes) does NOT work until the app is published to the App Store. TestFlight only allows testing via the TestFlight app interface.

---

## 9. Current Limitations & Future Improvements

### Current Limitations

| Limitation | Why It Exists | Impact |
|------------|---------------|--------|
| **No photo preview** | CloudKit requires provisioning that conflicts with parent app | Users see location name only, not actual photos |
| **Landing page only** | React Native makes App Clip too large (42MB vs 10MB limit) | Can't show interactive photo viewer |
| **iOS 16.4+ required** | Default App Clip links are newer Apple feature | Older iOS users won't see App Clip card |
| **iOS 17+ for WhatsApp** | WhatsApp App Clip invocation is iOS 17+ only | Many users on older iOS won't see rich preview |

### Future Improvements

#### 1. Photo Preview in App Clip (Priority: High)

**Goal:** Show 2-3 preview photos in the App Clip landing page.

**Approach:**
- Generate thumbnail URLs at share time
- Pass thumbnail URLs in the App Clip link (URL parameters or base64)
- App Clip fetches and displays thumbnails without CloudKit

**Challenges:**
- URL length limits (~2000 chars)
- Need public image hosting (CloudKit public database or CDN)

#### 2. CloudKit Access in App Clip (Priority: Medium)

**Goal:** Allow App Clip to fetch vacation data from CloudKit.

**Approach:**
- Create separate App Clip provisioning profile with CloudKit entitlements
- Use CloudKit public database (no authentication needed)
- Carefully manage entitlements to avoid conflicts

**Challenges:**
- Complex provisioning setup
- Need to migrate from private to public CloudKit database for shared vacations

#### 3. Web Fallback for Android/Old iOS (Priority: Medium)

**Goal:** Show a web page for users who can't use App Clips.

**Approach:**
- Create `web/share/index.html` fallback page
- Detect platform and iOS version
- Show App Store link and vacation preview

#### 4. React Native App Clip (Priority: Low)

**Goal:** Use React Native in App Clip for code sharing.

**Approach:**
- Wait for Expo/React Native to improve tree-shaking
- Use Hermes bytecode bundling for smaller size
- Only include absolutely essential modules

**Why Low Priority:** SwiftUI landing page works well and is maintainable. React Native complexity isn't worth it for a simple landing page.

---

## 10. File Reference

### Actual Files in This Project

| File | Purpose |
|------|---------|
| `plugins/withAppClip.js` | Expo config plugin |
| `ios/VacationPhotosClip/VacationPhotosClipApp.swift` | Main entry, URL parsing |
| `ios/VacationPhotosClip/ContentView.swift` | Root view |
| `ios/VacationPhotosClip/SharedVacationView.swift` | Landing page UI |
| `ios/VacationPhotosClip/SharedVacationViewModel.swift` | View model |
| `ios/VacationPhotosClip/Models.swift` | Data models |
| `ios/VacationPhotosClip/Info.plist` | App Clip config |
| `ios/VacationPhotosClip/VacationPhotosClip.entitlements` | Capabilities |
| `ios/Podfile` | Must have empty App Clip target |
| `src/services/cloudKitService.js` | Share link generation |

### Key Configuration

**app.json:**
```json
{
  "expo": {
    "ios": {
      "associatedDomains": [
        "applinks:swapp1990.github.io",
        "appclips:swapp1990.github.io"
      ]
    },
    "plugins": ["./plugins/withAppClip"]
  }
}
```

**Share Link Format:**
```
https://appclip.apple.com/id?p=com.swapp1990.vacationphotos.Clip&token={shareId}&location={locationName}
```

---

## 11. Troubleshooting

### "App Clip card doesn't appear when scanning QR code"

This is expected during TestFlight testing. QR codes and links only trigger App Clip cards after the app is published to the App Store. Test via TestFlight app instead.

### "Not available in your country or region" when clicking link

Same issue - URL invocation doesn't work until published. Use TestFlight app to test.

### "App Clip is 40MB+"

Your Podfile is including React Native. Make the App Clip target empty:
```ruby
target 'VacationPhotosClip' do
  # Nothing here
end
```

### "Version mismatch error keeps appearing"

Sync these 4 places:
1. `app.json` → `ios.buildNumber`
2. `ios/VacationPhotos/Info.plist` → `CFBundleVersion`
3. `ios/VacationPhotosClip/Info.plist` → `CFBundleVersion`
4. `project.pbxproj` → `CURRENT_PROJECT_VERSION` for VacationPhotosClip

### "CloudKit provisioning profile error"

Remove CloudKit entitlements from App Clip. Pass data via URL parameters instead.

---

## Summary

Adding App Clips to an Expo app requires:

1. **SwiftUI App Clip** - React Native is too large (42MB vs 10MB limit)
2. **Default App Clip Links** - Use `appclip.apple.com` URLs, no AASA hosting needed
3. **Landing Page Design** - Show info and prompt to download full app
4. **Pass Data in URL** - Location name in URL since CloudKit has provisioning issues
5. **TestFlight Testing** - URL invocation only works after App Store publication

The development experience is frustrating because you cannot test URL invocation without publishing to the App Store. Plan accordingly and test early via TestFlight app.
