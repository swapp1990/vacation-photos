/**
 * Pure rating-prompt decision. Inject clock, version, StoreKit flag, and
 * persisted state so this can be unit-tested without React Native.
 *
 * Skip-reason priority: unavailable, cooldown, version_gate, no_trigger.
 * Launch / other triggers never prompt (no_trigger).
 * first_share StoreKit request is deferred until the share UI is gone.
 */

export const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
export const SHARE_REVIEW_IDLE_DELAY_MS = 800;
export const SHARE_REVIEW_MAX_WAIT_MS = 4000;

export function localCalendarDay(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * first_share waits for ShareModal / Messages to leave the screen.
 * second_open fires immediately (trip detail is already the app UI).
 */
export function shouldDeferReviewRequest(promptTrigger) {
  return promptTrigger === 'first_share';
}

/**
 * Consume a pending first_share StoreKit request.
 * Keep waiting while the app is backgrounded (WhatsApp / Messages).
 *
 * @param {{ pending: boolean, appState?: string }} params
 * @returns {{ action: 'noop'|'wait'|'flush', idleDelayMs: number }}
 */
export function consumePendingReview({ pending, appState } = {}) {
  if (!pending) {
    return { action: 'noop', idleDelayMs: 0 };
  }
  if (appState && appState !== 'active') {
    return { action: 'wait', idleDelayMs: 0 };
  }
  return { action: 'flush', idleDelayMs: SHARE_REVIEW_IDLE_DELAY_MS };
}

/**
 * @param {object} params
 * @param {object} params.state
 * @param {string} params.trigger  first_share | trip_open | launch | other
 * @param {string} [params.tripId]
 * @param {number} params.now
 * @param {string} params.appVersion
 * @param {boolean} params.storeKitAvailable
 */
export function decideRatingPrompt({
  state = {},
  trigger,
  tripId,
  now,
  appVersion,
  storeKitAvailable,
} = {}) {
  const tripOpenCounts = { ...(state.tripOpenCounts || {}) };
  if (trigger === 'trip_open' && tripId) {
    tripOpenCounts[tripId] = (tripOpenCounts[tripId] || 0) + 1;
  }

  // Old distinctDays keys are ignored; do not copy them forward.
  const nextState = {
    lastPromptAt: state.lastPromptAt || null,
    lastPromptVersion: state.lastPromptVersion || null,
    tripOpenCounts,
  };

  const skip = (reason) => ({
    action: 'skip',
    reason,
    nextState,
    promptTrigger: null,
  });

  if (trigger === 'launch' || trigger === 'other' || !trigger) {
    return skip('no_trigger');
  }

  if (!storeKitAvailable) {
    return skip('unavailable');
  }

  if (state.lastPromptAt && now - Number(state.lastPromptAt) < COOLDOWN_MS) {
    return skip('cooldown');
  }

  if (state.lastPromptVersion && state.lastPromptVersion === appVersion) {
    return skip('version_gate');
  }

  let promptTrigger = null;
  if (trigger === 'first_share') {
    promptTrigger = 'first_share';
  } else if (trigger === 'trip_open' && tripId && tripOpenCounts[tripId] >= 2) {
    promptTrigger = 'second_open';
  }

  if (!promptTrigger) {
    return skip('no_trigger');
  }

  return { action: 'prompt', reason: null, nextState, promptTrigger };
}
