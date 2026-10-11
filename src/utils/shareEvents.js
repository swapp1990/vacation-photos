/**
 * Pure share-event helper. `trackFn` is injected so Node tests do not
 * load analytics.js (telemetry-client / Expo / AsyncStorage).
 *
 * Runtime: analytics.trackVacationShared(photos) calls this with `track`.
 */
export function trackVacationShared(photos, trackFn) {
  trackFn('vp_vacation_shared', {
    photos,
    is_north_star: 'true',
  });
}
