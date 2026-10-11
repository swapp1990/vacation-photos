/**
 * In-App Review Prompt
 *
 * Native StoreKit sheet only, after a successful share (link created or
 * message sent) or the 2nd open of the same trip. Requires 2 distinct
 * local calendar days of use, at most once per app version, 90-day
 * cooldown. Never at launch. Fail-soft.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { track, Events } from './analytics';
import { decideRatingPrompt, localCalendarDay } from './reviewPromptDecision';

const STATE_KEY = '_review_prompt_state';

function getAppVersion() {
  try {
    const Constants = require('expo-constants').default;
    const v = Constants.expoConfig?.version || Constants.nativeAppVersion;
    if (v) return String(v);
  } catch (e) {
    // expo-constants unavailable in tests
  }
  try {
    return require('../../app.json').expo.version;
  } catch (e) {
    return 'unknown';
  }
}

async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

async function saveState(state) {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {
    // Fail-soft: missing persistence must not crash the app
  }
}

/**
 * Consider showing the native review prompt.
 * @param {'share_success'|'trip_open'|'launch'|'other'} trigger
 * @param {{ tripId?: string, now?: number, appVersion?: string, storeKitAvailable?: boolean, calendarDay?: string }} [extras]
 */
export async function considerRatingPrompt(trigger, extras = {}) {
  try {
    const now = extras.now ?? Date.now();
    const appVersion = extras.appVersion ?? getAppVersion();
    const calendarDay = extras.calendarDay ?? localCalendarDay(now);
    const storeKitAvailable =
      extras.storeKitAvailable ?? (await StoreReview.isAvailableAsync());
    const state = await loadState();

    const decision = decideRatingPrompt({
      state,
      trigger,
      tripId: extras.tripId,
      now,
      appVersion,
      storeKitAvailable,
      calendarDay,
    });

    console.log(
      '[ReviewPrompt] decision',
      `action=${decision.action}`,
      `trigger=${trigger}`,
      `reason=${decision.reason || 'none'}`,
      `days=${decision.nextState.distinctDays.length}`,
      `version=${appVersion}`,
      extras.tripId ? 'trip=set' : 'trip=none'
    );

    if (decision.action === 'prompt') {
      track(Events.RATING_PROMPT_ELIGIBLE);
      await StoreReview.requestReview();
      await saveState({
        ...decision.nextState,
        lastPromptAt: now,
        lastPromptVersion: appVersion,
      });
      track(Events.REVIEW_PROMPTED);
      console.log('[ReviewPrompt] Review prompt shown');
    } else {
      await saveState(decision.nextState);
      track(Events.RATING_PROMPT_SKIPPED, { reason: decision.reason });
    }
  } catch (e) {
    console.warn('[ReviewPrompt] Error:', e);
  }
}
