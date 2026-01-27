# Shared Vacation Back Button & Viewed State

## Description

Add a back button to the SharedVacationViewer that navigates to home (or onboarding if not completed). Implement "viewed" state tracking so that when a user opens a shared vacation from the list, it moves to a "past vacations" section. The notification card should only show unviewed vacations.

## Tasks

1. **useSharedVacations.js** - Add viewed state tracking
   - Add `viewedAt` timestamp field to shared vacation objects
   - Create `markVacationAsViewed(shareId)` function that sets `viewedAt` to current date and persists to AsyncStorage
   - Compute `pendingVacations` (vacations without viewedAt) and `pastVacations` (vacations with viewedAt)
   - Export both arrays from the hook

2. **SharedVacationViewer.js** - Add back button
   - Add a back button in the header that calls the existing `onClose` prop
   - Ensure back button is visible in all states: loading, error, and loaded
   - Style consistently with SharedVacationsList back button

3. **SharedVacationsList.js** - Split into pending/past sections
   - Change props from `sharedVacations` to `pendingVacations` and `pastVacations`
   - Add `onMarkAsViewed` callback prop
   - Display pending vacations in the main list
   - Add collapsible "See past vacations (X)" link at bottom when past vacations exist
   - When user taps a vacation, call `onMarkAsViewed(shareId)` before opening the viewer

4. **SharedVacationsCard.js** - Show only pending vacations
   - Rename prop from `sharedVacations` to `pendingVacations`
   - Card automatically hides when `pendingVacations` is empty

5. **App.js** - Wire up the new flow
   - Destructure `pendingVacations`, `pastVacations`, and `markVacationAsViewed` from hook
   - Pass `pendingVacations` to SharedVacationsCard
   - Pass both arrays and `markVacationAsViewed` to SharedVacationsList
   - Update `handleSharedVacationsCardPress` to use `pendingVacations` and mark as viewed when opening directly

## Success Criteria

- [ ] Back button visible on SharedVacationViewer in all states (loading, error, loaded)
- [ ] Tapping back button from SharedVacationViewer goes to home page
- [ ] If user has not completed onboarding, tapping back shows onboarding screen
- [ ] Opening a vacation from SharedVacationsList marks it as viewed
- [ ] Viewed vacations appear in collapsible "See past vacations" section
- [ ] Unviewed vacations remain in main list
- [ ] SharedVacationsCard only shows count/previews of unviewed vacations
- [ ] SharedVacationsCard is hidden when all vacations are viewed
- [ ] If 2 vacations shared and 1 viewed, card still shows for the remaining 1
- [ ] Viewed state persists after app restart
- [ ] People icon in header visible when any shared vacations exist
- [ ] Badge on icon shows count of unviewed vacations (hidden when 0)
- [ ] Tapping icon opens SharedVacationsList to access past vacations
