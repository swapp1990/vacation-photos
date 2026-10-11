/**
 * In-App Review Prompt
 *
 * Native StoreKit sheet only, after a successful share (link created or
 * message sent) or the 2nd open of the same trip. At most once per app
 * version, 90-day cooldown. Never at launch. first_share defers the
 * StoreKit call until ShareModal is gone or the app is active again.
 * Fail-soft.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { track, Events } from './analytics';
import {
  decideRatingPrompt,
  shouldDeferReviewRequest,
  consumePendingReview,
  SHARE_REVIEW_MAX_WAIT_MS,
} from './reviewPromptDecision';

const STATE_KEY = '_review_prompt_state';

let pendingPromptTrigger = null;
let maxWaitTimer = null;
let idleTimer = null;
let appStateSub = null;

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

function getAppState() {
  try {
    const { AppState } = require('react-native');
    return AppState.currentState || 'active';
  } catch (e) {
    return 'active';
  }
}

function clearTimers() {
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer);
    maxWaitTimer = null;
  }
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function ensureAppStateListener() {
  if (appStateSub) return;
  try {
    const { AppState } = require('react-native');
    appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        flushPendingReviewRequest();
      }
    });
  } catch (e) {
    // react-native AppState unavailable
  }
}

async function requestReviewNow(promptTrigger) {
  try {
    await StoreReview.requestReview();
    track(Events.REVIEW_PROMPTED, { trigger: promptTrigger });
    console.log('[ReviewPrompt] Review prompt shown');
  } catch (e) {
    console.warn('[ReviewPrompt] Error:', e);
  }
}

function armPendingReview(promptTrigger) {
  pendingPromptTrigger = promptTrigger;
  ensureAppStateListener();
  if (maxWaitTimer) {
    clearTimeout(maxWaitTimer);
  }
  maxWaitTimer = setTimeout(() => {
    maxWaitTimer = null;
    flushPendingReviewRequest();
  }, SHARE_REVIEW_MAX_WAIT_MS);
}

/**
 * Fire a pending first_share StoreKit request once the share UI is gone
 * or the app is foreground. Idempotent; never throws.
 */
export function flushPendingReviewRequest() {
  try {
    const plan = consumePendingReview({
      pending: !!pendingPromptTrigger,
      appState: getAppState(),
    });
    if (plan.action !== 'flush') return;

    const promptTrigger = pendingPromptTrigger;
    pendingPromptTrigger = null;
    clearTimers();

    idleTimer = setTimeout(() => {
      idleTimer = null;
      if (getAppState() !== 'active') {
        armPendingReview(promptTrigger);
        return;
      }
      requestReviewNow(promptTrigger);
    }, plan.idleDelayMs);
  } catch (e) {
    pendingPromptTrigger = null;
    clearTimers();
    console.warn('[ReviewPrompt] Error:', e);
  }
}

/**
 * Consider showing the native review prompt.
 * @param {'first_share'|'trip_open'|'launch'|'other'} trigger
 * @param {{ tripId?: string, now?: number, appVersion?: string, storeKitAvailable?: boolean }} [extras]
 */
export async function considerRatingPrompt(trigger, extras = {}) {
  try {
    const now = extras.now ?? Date.now();
    const appVersion = extras.appVersion ?? getAppVersion();
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
    });

    console.log(
      '[ReviewPrompt] decision',
      `action=${decision.action}`,
      `trigger=${trigger}`,
      `reason=${decision.reason || 'none'}`,
      `promptTrigger=${decision.promptTrigger || 'none'}`,
      `version=${appVersion}`,
      extras.tripId ? 'trip=set' : 'trip=none'
    );

    if (decision.action === 'prompt') {
      track(Events.RATING_PROMPT_ELIGIBLE, { trigger: decision.promptTrigger });
      await saveState({
        ...decision.nextState,
        lastPromptAt: now,
        lastPromptVersion: appVersion,
      });
      if (shouldDeferReviewRequest(decision.promptTrigger)) {
        // Decision + lastPromptAt are recorded now. StoreKit waits for
        // ShareModal close, AppState active, or SHARE_REVIEW_MAX_WAIT_MS.
        armPendingReview(decision.promptTrigger);
      } else {
        await requestReviewNow(decision.promptTrigger);
      }
    } else {
      await saveState(decision.nextState);
      track(Events.RATING_PROMPT_SKIPPED, { reason: decision.reason });
    }
  } catch (e) {
    console.warn('[ReviewPrompt] Error:', e);
  }
}
