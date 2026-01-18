# Claude Agent Instructions

## Build & Development Workflow

### IMPORTANT: This project uses Expo Go + EAS Build
- **Development**: Use Expo Go app (no local Xcode builds needed)
- **Production builds**: Use `eas build --platform ios` (cloud builds)
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

## iOS Development Best Practices

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
