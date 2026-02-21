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
  APP_CLIP_OPENED: 'vp_app_clip_opened',
  SHARED_ALBUM_OPENED: 'vp_shared_album_opened',
  LOAD_MORE: 'vp_load_more',
  SHARE_MESSAGE_SENT: 'vp_share_message_sent',
  SHARE_LINK_COPIED: 'vp_share_link_copied',
  ERROR: 'vp_error',
};
