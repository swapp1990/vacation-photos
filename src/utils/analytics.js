/**
 * Vacation Photos Analytics Wrapper
 *
 * Re-exports SwapAnalytics SDK with VP-specific event names.
 * Usage:
 *   import { initAnalytics, track, trackNorthStar, Events } from './utils/analytics';
 *   initAnalytics();
 *   track(Events.APP_OPENED);
 */

import { initAnalytics as _init, track as _track, getInstalledAt } from './telemetry-client';
import { hashShareId } from './hashShareId';
import { localCalendarDay } from './reviewPromptDecision';

const PII_KEYS = new Set([
  'location',
  'locationName',
  'sharedBy',
  'shareId',
  'share_id',
  'shared_by',
  'name',
  'place',
  'placeName',
  'displayName',
]);

const FIRST_TRIP_KEY = '_sa_first_trip_shown';
const PERMISSION_KEY = '_sa_permission_result_sent';

function stripPii(metadata) {
  if (!metadata || typeof metadata !== 'object') return {};
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (PII_KEYS.has(key)) continue;
    if (value === undefined) continue;
    clean[key] = value;
  }
  return clean;
}

export function initAnalytics() {
  return _init('vacationphotos');
}

export function track(eventName, metadata = {}) {
  _track(eventName, stripPii(metadata));
}

export function trackNorthStar(metadata = {}) {
  track('vp_vacation_shared', {
    ...metadata,
    is_north_star: 'true',
  });
}

/** Successful share: one vp_vacation_shared with is_north_star. */
export function trackVacationShared(photos) {
  trackNorthStar({ photos });
}

export { hashShareId };

function parseLocalDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function sessionDayBucket(daysSinceInstall) {
  if (daysSinceInstall <= 0) return 'D0';
  if (daysSinceInstall === 1) return 'D1';
  if (daysSinceInstall <= 7) return 'D7';
  return 'D30';
}

function daysSinceInstall(installedAt, now) {
  const from = parseLocalDay(localCalendarDay(installedAt));
  const to = parseLocalDay(localCalendarDay(now));
  return Math.round((to - from) / 86400000);
}

let sessionStartSent = false;

export async function trackSessionStart() {
  if (sessionStartSent) return;
  sessionStartSent = true;
  try {
    const installedAt = await getInstalledAt();
    const now = Date.now();
    const bucket = sessionDayBucket(daysSinceInstall(installedAt, now));
    track(Events.SESSION_START, { day_bucket: bucket });
  } catch (e) {
    console.warn('[Analytics] session_start failed', e);
  }
}

export async function trackFirstTripShown(tripsCount) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const sent = await AsyncStorage.getItem(FIRST_TRIP_KEY);
    if (sent) return;
    const installedAt = await getInstalledAt();
    const seconds = Math.max(0, Math.round((Date.now() - Number(installedAt)) / 1000));
    track(Events.FIRST_TRIP_SHOWN, {
      seconds_to_first_trip: seconds,
      trips_count: tripsCount,
    });
    await AsyncStorage.setItem(FIRST_TRIP_KEY, '1');
  } catch (e) {
    console.warn('[Analytics] first_trip_shown failed', e);
  }
}

export async function trackPermissionResult(mediaStatus) {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const sent = await AsyncStorage.getItem(PERMISSION_KEY);
    if (sent) return;
    let result = 'denied';
    if (mediaStatus === 'granted') result = 'granted';
    else if (mediaStatus === 'limited') result = 'limited';
    track(Events.PERMISSION_RESULT, { result });
    await AsyncStorage.setItem(PERMISSION_KEY, result);
  } catch (e) {
    console.warn('[Analytics] permission_result failed', e);
  }
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
  PERMISSION_RESULT: 'vp_permission_result',
  FIRST_TRIP_SHOWN: 'vp_first_trip_shown',
  SESSION_START: 'vp_session_start',
  RATING_PROMPT_ELIGIBLE: 'vp_rating_prompt_eligible',
  RATING_PROMPT_SKIPPED: 'vp_rating_prompt_skipped',
};
