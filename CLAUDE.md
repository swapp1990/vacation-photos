# Claude Agent Instructions

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
