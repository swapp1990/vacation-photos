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

### Testing App Clip in Simulator
1. Run `pod install` in `ios/` directory (generates workspace)
2. Open `ios/VacationPhotos.xcworkspace`
3. Select `VacationPhotosClip` scheme
4. Edit Scheme → Run → Arguments → Environment Variables, add:
   - `_XCAppClipURL` = `https://appclip.apple.com/id?p=BUNDLE_ID&token=SHARE_ID&location=LOCATION_NAME`
5. Run on simulator (⌘R)

**App Clip URL format:** `https://appclip.apple.com/id?p={bundleId}&token={shareId}&location={locationName}`

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

## Journal

Write entries in `docs/journals/YYYY-MM-DD.md` as a developer journal, not technical documentation. Keep it chronological - what you tried, what failed, what worked. Use short bullet points. Capture the journey including dead ends, not just final solutions. Keep entries concise for quick readability.
