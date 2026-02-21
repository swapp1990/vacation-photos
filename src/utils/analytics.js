/**
 * Vacation Photos Analytics Wrapper
 *
 * Re-exports SwapAnalytics SDK with VP-specific event names.
 * Usage:
 *   import { initAnalytics, track, trackNorthStar, Events } from './utils/analytics';
 *   initAnalytics();
 *   track(Events.APP_OPENED);
 */

import { initAnalytics as _init, track as _track, trackNorthStar as _trackNorthStar } from './telemetry-client';

export function initAnalytics() {
  return _init('vacationphotos');
}

export const track = _track;

export function trackNorthStar(metadata = {}) {
  _track('vp_vacation_shared', {
    ...metadata,
    is_north_star: 'true',
  });
}

export const Events = {
  APP_OPENED: 'app_opened',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  TRIP_VIEWED: 'vp_trip_viewed',
  VACATION_SHARED: 'vp_vacation_shared',
  PHOTO_SAVED: 'vp_photo_saved',
  SHARE_RECEIVED: 'vp_share_received',
  REVIEW_PROMPTED: 'vp_review_prompted',
};
