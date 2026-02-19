# Claude Agent Instructions

## Build & Development Workflow

### IMPORTANT: This project uses Expo Go + EAS Build
- **Development**: Use Expo Go app (no local Xcode builds needed)
- **Production builds**: Use `eas build --platform ios --local` (local builds)
- **ALWAYS** use `--local` flag for EAS builds - don't use cloud builds unless explicitly asked
- **DO NOT** run `pod install` locally - not needed
- **DO NOT** suggest Xcode upgrades for building - use EAS Build instead

### Version Management (App Clip)
The app has an App Clip target that must have matching version numbers. Before building:

```bash
# Check if versions are aligned
node scripts/check-versions.js

# Fix mismatches automatically
node scripts/check-versions.js --fix
```

**When bumping versions:**
1. Update `buildNumber` in `app.json`
2. Run `node scripts/check-versions.js --fix` to sync App Clip
3. Commit changes
4. Run `eas build --platform ios --auto-submit`

**DO NOT** rely on EAS auto-increment - it's disabled because it causes App Clip version mismatches.

### Testing App Clip in Simulator (RECOMMENDED: Command Line)

The most reliable way to test the App Clip is via command line (avoids Xcode UI issues):

```bash
# 1. Install pods (one-time setup)
cd ios && pod install && cd ..

# 2. Build App Clip for simulator
xcodebuild -workspace ios/VacationPhotos.xcworkspace \
  -scheme VacationPhotosClip \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -derivedDataPath ios/build build

# 3. Boot simulator and install
xcrun simctl boot "iPhone 17 Pro"
xcrun simctl install "iPhone 17 Pro" ios/build/Build/Products/Debug-iphonesimulator/VacationPhotosClip.app

# 4. Launch App Clip
xcrun simctl launch "iPhone 17 Pro" com.swapp1990.vacationphotos.Clip
```

**Mock data:** The App Clip automatically uses mock Unsplash photos when running in the simulator (no CloudKit access needed).

### What NOT to do for App Clip Testing

- **DO NOT** rely on TestFlight "Open" button - it may use the production App Clip, not your TestFlight build
- **DO NOT** try Safari/Messages links for testing - unreliable for development builds
- **DO NOT** expect Settings → Developer → App Clip Testing to work consistently
- **DO NOT** try to navigate Xcode 26's new UI for scheme editing - use command line instead

### TestFlight App Clip Testing (if needed)

If you must test via TestFlight:
1. Build and submit: `eas build --platform ios --local --auto-submit`
2. In App Store Connect, add an App Clip Invocation URL for the build
3. On device, open TestFlight → Vacation Photos → scroll to "App Clips" section → tap "Test"
4. **DO NOT** use the main "Open" button - it uses the App Store version

**App Clip URL format:** `https://swapp1990.github.io/share/{shareId}`

## iOS Development Best Practices

### SwiftUI Type-Checking (CRITICAL)
- **NEVER** create deeply nested SwiftUI views in a single computed property
- **ALWAYS** break complex views into smaller sub-properties/methods
- The Swift compiler will fail with "unable to type-check this expression" if a view body is too complex
- GeometryReader, ForEach with enumerated(), and AsyncImage are especially prone to this
- Extract TabView contents, overlay controls, and nested closures into separate computed properties

```swift
// BAD - compiler will fail
var body: some View {
    GeometryReader { geo in
        ZStack {
            TabView { ForEach(...) { AsyncImage { ... } } }
            VStack { Button { ... } }
        }
    }
}

// GOOD - broken into sub-properties
var body: some View {
    ZStack {
        tabViewContent
        controlsOverlay
    }
}
private var tabViewContent: some View { ... }
private var controlsOverlay: some View { ... }
```

### Safe Area Handling (CRITICAL)
- **ALWAYS** wrap screens with `SafeAreaProvider` and `SafeAreaView` from `react-native-safe-area-context`
- **NEVER** use absolute positioning with fixed `top` values for UI elements near screen edges
- For overlays on fullscreen content, use `SafeAreaView` with `edges={['top']}` to respect notch/dynamic island
- Use the `Screen` component from `src/components/Screen.js` for all new screens

### Screen Component Usage
```jsx
// Standard screen
<Screen title="Title" subtitle="Subtitle">{content}</Screen>

// Screen with logo
<Screen logo subtitle="info">{content}</Screen>

// Modal screen
<Screen.Modal title="Title" onClose={handler}>{content}</Screen.Modal>

// Splash/loading screen
<Screen.Splash loadingText="Loading..." />
```

### Styles
- Import theme constants from `src/styles/theme.js`
- Use `colors`, `spacing`, `typography`, `borderRadius`, `shadows` for consistency
- Create new style files in `src/styles/` for new features

### Project Structure
```
src/
├── components/     # Reusable components (Screen, Button, etc.)
└── styles/         # Theme and style files
```

### Do NOT
- Use hardcoded colors - use `colors` from theme
- Use hardcoded spacing - use `spacing` from theme
- Create inline StyleSheet in component files - create separate style files
- Use `position: absolute` with `top: 20` near screen edges - use SafeAreaView

## Experiment Logging (Impressions Agency Client)

This app is a client of Impressions Agency. Any change that could affect App Store metrics (features, ASO metadata, marketing) **MUST** be logged via the changelog API so we can correlate metric movements to actions.

```bash
# Log a change
curl -X POST https://moltbot.swapp1990.org/api/changelog \
  -H 'Content-Type: application/json' \
  -d '{"product":"vacationphotos","date":"2026-02-19","change":"Description of what changed","channel":"aso","batch":"v1.1.8"}'
```

**Channels:** `aso` (metadata, keywords, screenshots), `product` (features, version releases), `marketing` (social posts, Reddit, TikTok)

**When to log:**
- At version submission time — one entry per change in the batch
- When ASO metadata is updated in App Store Connect (no version needed for promo text)
- When external marketing goes live (posts, campaigns)

**Check metrics:** `GET https://moltbot.swapp1990.org/api/impressions/north-star?product=vacationphotos`
**View changelog:** `GET https://moltbot.swapp1990.org/api/changelog?product=vacationphotos`
**Agency docs:** `/Users/swapnilsawant/projects/impressions-agency/products/VacationPhotos/`

## Journal

Write entries in `docs/journals/YYYY-MM-DD.md` as a developer journal, not technical documentation. Keep it chronological - what you tried, what failed, what worked. Use short bullet points. Capture the journey including dead ends, not just final solutions. Keep entries concise for quick readability.
