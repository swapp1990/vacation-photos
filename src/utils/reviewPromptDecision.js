/**
 * Pure rating-prompt decision. Inject clock, version, StoreKit flag, and
 * persisted state so this can be unit-tested without React Native.
 *
 * Skip-reason priority: unavailable, cooldown, version_gate, day_gate, threshold.
 * Launch / other triggers never prompt (threshold).
 */

export const COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;
export const MIN_DISTINCT_DAYS = 2;

export function localCalendarDay(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * @param {object} params
 * @param {object} params.state
 * @param {string} params.trigger  share_success | trip_open | launch | other
 * @param {string} [params.tripId]
 * @param {number} params.now
 * @param {string} params.appVersion
 * @param {boolean} params.storeKitAvailable
 * @param {string} [params.calendarDay]  YYYY-MM-DD local; defaults from now
 */
export function decideRatingPrompt({
  state = {},
  trigger,
  tripId,
  now,
  appVersion,
  storeKitAvailable,
  calendarDay,
} = {}) {
  const day = calendarDay || localCalendarDay(now);
  const distinctDays = new Set(state.distinctDays || []);
  if (day) distinctDays.add(day);

  const tripOpenCounts = { ...(state.tripOpenCounts || {}) };
  if (trigger === 'trip_open' && tripId) {
    tripOpenCounts[tripId] = (tripOpenCounts[tripId] || 0) + 1;
  }

  const nextState = {
    lastPromptAt: state.lastPromptAt || null,
    lastPromptVersion: state.lastPromptVersion || null,
    distinctDays: [...distinctDays].sort(),
    tripOpenCounts,
  };

  const skip = (reason) => ({ action: 'skip', reason, nextState });

  if (trigger === 'launch' || trigger === 'other' || !trigger) {
    return skip('threshold');
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

  if (distinctDays.size < MIN_DISTINCT_DAYS) {
    return skip('day_gate');
  }

  let triggerMet = false;
  if (trigger === 'share_success') {
    triggerMet = true;
  } else if (trigger === 'trip_open' && tripId && tripOpenCounts[tripId] >= 2) {
    triggerMet = true;
  }

  if (!triggerMet) {
    return skip('threshold');
  }

  return { action: 'prompt', reason: null, nextState };
}
