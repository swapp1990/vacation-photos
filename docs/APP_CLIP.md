# iOS App Clips with Expo & EAS Build: Complete Tutorial

A comprehensive guide to adding App Clips to your Expo/React Native app, including all the build errors you'll encounter and how to fix them.

---

## Table of Contents

1. [What Are App Clips?](#1-what-are-app-clips)
2. [Architecture Overview](#2-architecture-overview)
3. [Step 1: Universal Links Setup](#3-step-1-universal-links-setup)
4. [Step 2: Create the Expo Config Plugin](#4-step-2-create-the-expo-config-plugin)
5. [Step 3: Write the App Clip Code](#5-step-3-write-the-app-clip-code)
6. [Step 4: Manual Xcode Configuration](#6-step-4-manual-xcode-configuration)
7. [Step 5: EAS Build - Errors You Will Encounter](#7-step-5-eas-build---errors-you-will-encounter)
8. [Step 6: Testing Your App Clip](#8-step-6-testing-your-app-clip)
9. [Data Handoff: App Clip to Full App](#9-data-handoff-app-clip-to-full-app)
10. [File Reference](#10-file-reference)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. What Are App Clips?

App Clips are lightweight versions of iOS apps (under 10MB) that load instantly without requiring installation from the App Store.

### When App Clips Are Triggered

- **QR Codes** - User scans a QR code containing your URL
- **NFC Tags** - User taps an NFC tag
- **Safari Smart App Banners** - User visits your website
- **Links in Messages** - Someone shares a link in iMessage
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
User A shares a link: https://yourdomain.com/share/abc123
User B (without the app): App Clip card appears → Tap → Instantly see content
```

App Clips reduce friction from 6 steps to 2 taps.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Universal Link                          │
│            https://yourdomain.com/share/{id}                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Apple's Link Routing        │
              │   (validates AASA file)       │
              └───────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
            ▼                                   ▼
   ┌─────────────────┐                ┌─────────────────┐
   │  App Installed  │                │ App Not Installed│
   │                 │                │                 │
   │  Opens full app │                │ Shows App Clip  │
   │  directly       │                │ card instantly  │
   └─────────────────┘                └─────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ User taps card  │
                                      │ App Clip loads  │
                                      └─────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ "Get Full App"  │
                                      │ → App Group     │
                                      │ stores context  │
                                      └─────────────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │ Full app opens  │
                                      │ with context    │
                                      │ preserved       │
                                      └─────────────────┘
```

### Key Technologies

| Technology | Purpose |
|------------|---------|
| **App Clip** | Lightweight iOS app (<10MB) that loads instantly |
| **Universal Links** | HTTPS URLs that iOS routes to your app |
| **App Groups** | Shared storage between App Clip and full app |
| **AASA File** | JSON file telling Apple which URLs your app handles |

---

## 3. Step 1: Universal Links Setup

Custom URL schemes (`myapp://`) don't work for users without the app. You need Universal Links (`https://`).

### 3.1 Choose Your Domain

You need a domain you control. Options:
- Your own domain (e.g., `myapp.com`)
- GitHub Pages (e.g., `username.github.io`) - free and easy

### 3.2 Create the AASA File

Create `/.well-known/apple-app-site-association` (no file extension):

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

Replace `TEAMID` with your Apple Developer Team ID (found in Apple Developer Portal).

### 3.3 Host the AASA File

**Requirements:**
- Must be served over HTTPS
- Must be at `/.well-known/apple-app-site-association`
- Content-Type should be `application/json`
- No redirects allowed

**For GitHub Pages:**
1. Create repository `username.github.io`
2. Create `.well-known/apple-app-site-association` file
3. Create `.nojekyll` file (so GitHub doesn't ignore the `.well-known` folder)

### 3.4 Update app.json

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

Expo doesn't natively support App Clips. You need a config plugin.

### 4.1 Create the Plugin File

Create `plugins/withAppClip.js`:

```javascript
const { withXcodeProject, withDangerousMod, withEntitlementsPlist } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const APP_CLIP_TARGET_NAME = 'YourAppClip';
const APP_CLIP_BUNDLE_ID = 'com.yourcompany.yourapp.Clip';
const APP_GROUP_ID = 'group.com.yourcompany.yourapp';
const ASSOCIATED_DOMAIN = 'yourdomain.com';

// Add Associated Domains to main app
function withAssociatedDomains(config) {
  return withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.associated-domains'] = [
      `applinks:${ASSOCIATED_DOMAIN}`,
      `appclips:${ASSOCIATED_DOMAIN}`,
    ];
    config.modResults['com.apple.security.application-groups'] = [APP_GROUP_ID];
    return config;
  });
}

// Create App Clip files
function withAppClipFiles(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosPath = path.join(config.modRequest.projectRoot, 'ios');
      const appClipPath = path.join(iosPath, APP_CLIP_TARGET_NAME);

      if (!fs.existsSync(appClipPath)) {
        fs.mkdirSync(appClipPath, { recursive: true });
      }

      // Create entitlements
      const entitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:${ASSOCIATED_DOMAIN}</string>
        <string>appclips:${ASSOCIATED_DOMAIN}</string>
    </array>
    <key>com.apple.developer.parent-application-identifiers</key>
    <array>
        <string>$(AppIdentifierPrefix)com.yourcompany.yourapp</string>
    </array>
    <key>com.apple.security.application-groups</key>
    <array>
        <string>${APP_GROUP_ID}</string>
    </array>
</dict>
</plist>`;
      fs.writeFileSync(path.join(appClipPath, `${APP_CLIP_TARGET_NAME}.entitlements`), entitlements);

      // Create Info.plist
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDisplayName</key>
    <string>Your App</string>
    <key>NSAppClip</key>
    <dict>
        <key>NSAppClipRequestEphemeralUserNotification</key>
        <false/>
        <key>NSAppClipRequestLocationConfirmation</key>
        <false/>
    </dict>
    <key>UILaunchStoryboardName</key>
    <string>SplashScreen</string>
</dict>
</plist>`;
      fs.writeFileSync(path.join(appClipPath, 'Info.plist'), infoPlist);

      // Create AppDelegate files (Objective-C for React Native)
      // ... (see full implementation in plugins/withAppClip.js)

      return config;
    },
  ]);
}

function withAppClip(config) {
  config = withAssociatedDomains(config);
  config = withAppClipFiles(config);
  return config;
}

module.exports = withAppClip;
```

### 4.2 Register the Plugin

In `app.json`:

```json
{
  "expo": {
    "plugins": [
      "./plugins/withAppClip"
    ]
  }
}
```

### 4.3 Run Prebuild

```bash
npx expo prebuild --clean
```

This generates the iOS native project with your App Clip files.

---

## 5. Step 3: Write the App Clip Code

App Clips must be under 10MB. Create a minimal version of your app.

### 5.1 Create Entry Point

Create `AppClip/index.js`:

```javascript
import { AppRegistry } from 'react-native';
import App from './App';

AppRegistry.registerComponent('YourAppClip', () => App);
```

### 5.2 Create App Component

Create `AppClip/App.js`:

```javascript
import React, { useEffect, useState } from 'react';
import { View, Text, Linking } from 'react-native';

export default function App() {
  const [shareId, setShareId] = useState(null);

  useEffect(() => {
    // Get the URL that launched the App Clip
    Linking.getInitialURL().then(url => {
      if (url) {
        // Parse shareId from URL: https://domain.com/share/{shareId}
        const match = url.match(/\/share\/([^/?]+)/);
        if (match) setShareId(match[1]);
      }
    });
  }, []);

  if (!shareId) {
    return <View><Text>Loading...</Text></View>;
  }

  return <YourMinimalViewer shareId={shareId} />;
}
```

### 5.3 Size Optimization

**Include only essentials:**
- Core UI components
- Network fetching
- Basic styling

**Exclude heavy dependencies:**
- Analytics SDKs
- Crash reporting
- Unused features
- Large image libraries

---

## 6. Step 4: Manual Xcode Configuration

**Important:** The `xcode` npm package doesn't support adding App Clip targets programmatically. You must do this manually.

### 6.1 Add App Clip Target

1. Open `ios/YourApp.xcworkspace` in Xcode
2. File → New → Target
3. Choose "App Clip"
4. Configure:
   - Product Name: `YourAppClip`
   - Bundle Identifier: `com.yourcompany.yourapp.Clip`
   - Language: Objective-C (for React Native compatibility)

### 6.2 Replace Generated Files

Xcode generates SwiftUI template files. Replace them:

1. Delete all auto-generated `.swift` files
2. Add existing files from `ios/YourAppClip/` directory:
   - `AppClipAppDelegate.h`
   - `AppClipAppDelegate.m`
   - `main.m`
   - `Info.plist`
   - `YourAppClip.entitlements`

### 6.3 Configure Signing & Capabilities

Select the App Clip target, then:

1. **Signing:** Enable "Automatically manage signing"
2. **+ Capability → App Groups:** Add `group.com.yourcompany.yourapp`
3. **+ Capability → Associated Domains:** Add:
   - `applinks:yourdomain.com`
   - `appclips:yourdomain.com`

### 6.4 Configure Build Settings

In Build Settings for the App Clip target:

| Setting | Value |
|---------|-------|
| `IPHONEOS_DEPLOYMENT_TARGET` | `15.1` (or match your main app) |
| `PRODUCT_BUNDLE_IDENTIFIER` | `com.yourcompany.yourapp.Clip` |
| `CODE_SIGN_ENTITLEMENTS` | `YourAppClip/YourAppClip.entitlements` |

---

## 7. Step 5: EAS Build - Errors You Will Encounter

When building with EAS Build, you will encounter several errors. Here's each one and how to fix it.

### Error 1: Missing Preview Content Directory

```
error: Build input file cannot be found:
'.../YourAppClip/Preview Content'
```

**Cause:** Xcode expects a Preview Content directory for SwiftUI previews.

**Fix:**
```bash
mkdir -p ios/YourAppClip/Preview\ Content
touch ios/YourAppClip/Preview\ Content/.gitkeep
git add ios/YourAppClip/Preview\ Content/.gitkeep
git commit -m "Add App Clip Preview Content directory"
```

---

### Error 2: Missing App Icon Asset Catalog

```
error: The app clip 'YourAppClip' does not contain an AppIcon asset catalog
```

**Cause:** App Clips need their own app icon.

**Fix:**

1. Create the directory structure:
```bash
mkdir -p ios/YourAppClip/Images.xcassets/AppIcon.appiconset
```

2. Create `ios/YourAppClip/Images.xcassets/Contents.json`:
```json
{
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

3. Create `ios/YourAppClip/Images.xcassets/AppIcon.appiconset/Contents.json`:
```json
{
  "images": [
    {
      "filename": "app-icon-1024.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
```

4. Copy your 1024x1024 PNG icon to `ios/YourAppClip/Images.xcassets/AppIcon.appiconset/app-icon-1024.png`

5. **Critical:** Add the asset catalog to the Xcode project. In `project.pbxproj`, add `Images.xcassets` to the App Clip target's resources build phase.

---

### Error 3: iOS Deployment Target Mismatch

```
error: The iOS deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set to 14.0,
but the range of supported deployment target versions is 15.1 to 18.2.99
```

**Cause:** App Clip target has a lower iOS version than dependencies require.

**Fix:** In `ios/YourApp.xcodeproj/project.pbxproj`, find the App Clip build configurations and update:

```
IPHONEOS_DEPLOYMENT_TARGET = 15.1;
```

This must be updated in **both Debug and Release** configurations for the App Clip target.

---

### Error 4: CFBundleVersion Mismatch (The Tricky One)

```
error: The value of CFBundleVersion in your app clip's Info.plist (1) does
not match the value in your app's Info.plist (11). These values must match.
```

**Cause:** Apple requires the App Clip version to exactly match the parent app. EAS Build auto-increments the main app but not the App Clip.

**Why it's tricky:** If your project has `GENERATE_INFOPLIST_FILE = YES`, Xcode ignores the Info.plist file for version numbers and uses build settings instead.

**Fix:**

1. **Check if GENERATE_INFOPLIST_FILE is YES** in your App Clip's build settings. If it is, you must set versions in build settings, not Info.plist.

2. **Update project.pbxproj** for the App Clip target (both Debug and Release):
```
CURRENT_PROJECT_VERSION = 2;  // Match your main app's build number
MARKETING_VERSION = 1.1.0;    // Match your main app's version
```

3. **Change eas.json to use local versioning:**
```json
{
  "cli": {
    "version": ">= 3.0.0",
    "appVersionSource": "local"
  }
}
```

4. **Commit your changes!** EAS Build uploads your git repository, not local files:
```bash
git add -A
git commit -m "Fix App Clip version settings"
```

---

### Error 5: Changes Not Being Applied

**Symptom:** You made fixes but EAS Build shows the same error.

**Cause:** You forgot to commit. EAS Build clones your git repository.

**Fix:**
```bash
git status  # Check what's uncommitted
git add -A
git commit -m "Fix App Clip build configuration"
git push    # If using remote builds
```

---

### Error 6: App Clip Too Large (Over 10MB)

```
ITMS-90865: App Clip size exceeds limit - The App Clip 'YourAppClip' is 42 MB,
but the limit is 10 MB for the thinned variant.
```

**Cause:** Your Podfile is including React Native dependencies for the App Clip target.

**Why this happens:** If your Podfile has the App Clip target configured like the main app (with `use_expo_modules!`, `use_react_native!`, etc.), CocoaPods installs all React Native dependencies, making the App Clip 40MB+.

**Fix:** Make your App Clip pure SwiftUI with NO pods:

```ruby
# In ios/Podfile

# Main app target with all React Native dependencies
target 'VacationPhotos' do
  use_expo_modules!
  # ... all the React Native config
end

# App Clip target - Pure SwiftUI, no React Native dependencies
# This keeps the App Clip under the 10MB size limit
target 'VacationPhotosClip' do
  # No pods needed - App Clip is pure SwiftUI
  # It only shows a landing page and links to the App Store
end
```

**Result:** App Clip goes from ~42MB to ~2-3MB.

**Important:** This means your App Clip cannot use React Native. You must write it in pure SwiftUI or UIKit. For most use cases (showing a preview and prompting to download the full app), SwiftUI is sufficient and keeps the size well under 10MB.

---

## 8. Step 6: Testing Your App Clip

**Critical Limitation:** You cannot fully test App Clips with development builds.

### Why Development Builds Don't Work

1. **EAS Build only builds the main app target** - The App Clip target is not included in development builds
2. **App Clips require Apple's infrastructure** - QR codes and links only trigger App Clips after Apple validates your setup
3. **Local Experiences is unreliable** - iOS's developer testing feature doesn't work consistently

### What Doesn't Work

| Method | Result |
|--------|--------|
| Scanning QR code with Camera | Opens URL in Safari instead of App Clip |
| Pasting URL in Safari | Shows 404 or webpage, no App Clip card |
| Local Experiences in Developer Settings | No "Invoke" button, feature is incomplete |

### What Actually Works

#### Option A: TestFlight (Recommended)

This is the only way to test the real App Clip experience:

1. **Build for production:**
   ```bash
   eas build --platform ios --profile production
   ```

2. **Submit to App Store Connect:**
   ```bash
   eas submit --platform ios --latest
   ```

3. **Configure App Clip Invocations in App Store Connect:**
   - Go to your app → TestFlight tab
   - Click on the build number (e.g., "1.1.0 (9)")
   - Scroll to **App Clip Invocations** section
   - Click the **+** button to add an invocation
   - Enter:
     - **Title:** A descriptive name (e.g., "Test Vacation")
     - **URL:** Your App Clip URL (e.g., `https://appclip.apple.com/id?p=com.yourcompany.yourapp.Clip&token=test123`)
   - Click **Save**

4. **Test on your iPhone via TestFlight app:**

   **Important:** URL-based invocation (clicking links) does NOT work until your app is published to the App Store. Instead:

   - Open the **TestFlight app** on your iPhone
   - Tap on your app (e.g., "Vacation Photos")
   - You'll see the App Clip invocations you configured
   - Tap on an invocation to launch and test the App Clip

   **What won't work in TestFlight:**
   - Clicking App Clip URLs gives "not available in your country or region"
   - QR codes won't trigger App Clip cards
   - Links in Messages won't show App Clip previews

   These features only work after the app is published to the App Store.

#### Option B: Direct Xcode Installation

For testing App Clip UI only (not invocation):

1. Open `ios/YourApp.xcworkspace` in Xcode
2. Select the `YourAppClip` scheme (not main app)
3. Select your physical iPhone as destination
4. Build and Run (Cmd+R)

**Limitations:**
- Cannot test QR code invocation
- Cannot test link routing
- Cannot test App Clip card appearance
- Only tests the UI once App Clip is already open

---

## 9. Data Handoff: App Clip to Full App

When users install the full app from an App Clip, they expect continuity. Use App Groups.

### 9.1 Create Native Module

Create `native-modules/ios/AppGroupStorage.swift`:

```swift
import Foundation

@objc(AppGroupStorage)
class AppGroupStorage: NSObject {

  private let suiteName = "group.com.yourcompany.yourapp"

  @objc func saveShareId(_ shareId: String) {
    let defaults = UserDefaults(suiteName: suiteName)
    defaults?.set(shareId, forKey: "pendingShareId")
  }

  @objc func getShareId(_ callback: @escaping RCTResponseSenderBlock) {
    let defaults = UserDefaults(suiteName: suiteName)
    let shareId = defaults?.string(forKey: "pendingShareId")
    callback([shareId ?? NSNull()])
  }

  @objc func clearShareId() {
    let defaults = UserDefaults(suiteName: suiteName)
    defaults?.removeObject(forKey: "pendingShareId")
  }
}
```

### 9.2 Create Bridge

Create `native-modules/ios/AppGroupStorageBridge.m`:

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(AppGroupStorage, NSObject)

RCT_EXTERN_METHOD(saveShareId:(NSString *)shareId)
RCT_EXTERN_METHOD(getShareId:(RCTResponseSenderBlock)callback)
RCT_EXTERN_METHOD(clearShareId)

@end
```

### 9.3 Use in JavaScript

```javascript
import { NativeModules } from 'react-native';
const { AppGroupStorage } = NativeModules;

// In App Clip - when user taps "Get Full App"
AppGroupStorage.saveShareId(currentShareId);

// In Full App - on launch
AppGroupStorage.getShareId((shareId) => {
  if (shareId) {
    // Show the shared content immediately
    navigateToSharedContent(shareId);
    AppGroupStorage.clearShareId();
  }
});
```

---

## 10. File Reference

### Files to Create

| File | Purpose |
|------|---------|
| `plugins/withAppClip.js` | Expo config plugin |
| `AppClip/index.js` | App Clip entry point |
| `AppClip/App.js` | App Clip main component |
| `ios/YourAppClip/Preview Content/.gitkeep` | Xcode requirement |
| `ios/YourAppClip/Images.xcassets/` | App icon for App Clip |
| `web/.well-known/apple-app-site-association` | AASA file |
| `native-modules/ios/AppGroupStorage.swift` | Data handoff |

### Files to Modify

| File | Changes |
|------|---------|
| `app.json` | Add associatedDomains, plugins |
| `eas.json` | Set `appVersionSource: "local"` |
| `ios/project.pbxproj` | Fix deployment target, versions |

### Build Settings Checklist for App Clip Target

```
CURRENT_PROJECT_VERSION = <must match main app>
MARKETING_VERSION = <must match main app>
IPHONEOS_DEPLOYMENT_TARGET = 15.1
PRODUCT_BUNDLE_IDENTIFIER = com.yourcompany.yourapp.Clip
GENERATE_INFOPLIST_FILE = YES
CODE_SIGN_ENTITLEMENTS = YourAppClip/YourAppClip.entitlements
DEVELOPMENT_ASSET_PATHS = "YourAppClip/Preview Content"
```

---

## 11. Troubleshooting

### "App Clip card doesn't appear when scanning QR code"

App Clips only work through Apple's infrastructure. You must:
1. Submit to App Store Connect
2. Configure App Clip Experience
3. Wait for Apple to cache your AASA file
4. Test via TestFlight

### "Version mismatch error keeps appearing"

Check if `GENERATE_INFOPLIST_FILE = YES` in your build settings. If so:
- Version numbers in Info.plist are **ignored**
- You must set `CURRENT_PROJECT_VERSION` in build settings
- Ensure both Debug and Release configurations are updated

### "Changes don't seem to take effect in EAS Build"

EAS Build uploads your **git repository**, not local files:
```bash
git status              # See uncommitted changes
git add -A && git commit -m "Fix"
```

### "Local Experiences doesn't have an Invoke button"

This feature is inconsistent across iOS versions. The only reliable testing method is TestFlight.

### "App Clip works on TestFlight but not production"

Ensure your AASA file is:
1. Accessible at `https://yourdomain.com/.well-known/apple-app-site-association`
2. Served with correct Content-Type (`application/json`)
3. Not behind any redirects
4. Contains correct Team ID and bundle IDs

---

## Summary

Adding App Clips to an Expo app requires:

1. **Universal Links** - AASA file on your domain
2. **Config Plugin** - Generate App Clip files during prebuild
3. **Manual Xcode Setup** - Add target and capabilities
4. **Build Fixes** - Preview Content, App Icon, iOS version, bundle version
5. **TestFlight** - The only way to actually test App Clip invocation

The development experience is frustrating because you cannot test App Clip invocation without going through App Store Connect. Plan accordingly and test early via TestFlight.
