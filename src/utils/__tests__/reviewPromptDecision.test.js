const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  decideRatingPrompt,
  COOLDOWN_MS,
  localCalendarDay,
  shouldDeferReviewRequest,
  consumePendingReview,
  SHARE_REVIEW_IDLE_DELAY_MS,
  SHARE_REVIEW_MAX_WAIT_MS,
} = require('../reviewPromptDecision.js');
const { sha256hex, hashShareId } = require('../hashShareId.js');

const NOW = 1_800_000_000_000;
const VERSION = '1.1.8';

function decide(overrides = {}) {
  const { state: stateOverrides, ...rest } = overrides;
  return decideRatingPrompt({
    state: {
      lastPromptAt: null,
      lastPromptVersion: null,
      tripOpenCounts: {},
      ...stateOverrides,
    },
    trigger: 'first_share',
    now: NOW,
    appVersion: VERSION,
    storeKitAvailable: true,
    ...rest,
  });
}

describe('decideRatingPrompt truth table', () => {
  test('first share on day 0 prompts with trigger first_share', () => {
    const d = decide({ trigger: 'first_share' });
    assert.equal(d.action, 'prompt');
    assert.equal(d.reason, null);
    assert.equal(d.promptTrigger, 'first_share');
  });

  test('second open of the same trip on day 0 prompts with trigger second_open', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
      state: { tripOpenCounts: { 'cluster-0': 1 } },
    });
    assert.equal(d.action, 'prompt');
    assert.equal(d.reason, null);
    assert.equal(d.promptTrigger, 'second_open');
    assert.equal(d.nextState.tripOpenCounts['cluster-0'], 2);
  });

  test('second share same version after a prompt is version_gate', () => {
    const first = decide({ trigger: 'first_share' });
    assert.equal(first.action, 'prompt');
    const d = decide({
      trigger: 'first_share',
      state: {
        ...first.nextState,
        lastPromptAt: NOW - COOLDOWN_MS,
        lastPromptVersion: VERSION,
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'version_gate');
  });

  test('within 90 days of a previous prompt on a different version is cooldown', () => {
    const d = decide({
      trigger: 'first_share',
      appVersion: '1.1.9',
      state: {
        lastPromptAt: NOW - 1000,
        lastPromptVersion: VERSION,
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'cooldown');
  });

  test('launch never prompts (no_trigger)', () => {
    const d = decide({ trigger: 'launch' });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'no_trigger');
  });

  test('other never prompts (no_trigger)', () => {
    const d = decide({ trigger: 'other' });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'no_trigger');
  });

  test('missing trigger never prompts (no_trigger)', () => {
    const d = decide({ trigger: undefined });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'no_trigger');
  });

  test('first open of a trip is no_trigger', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'no_trigger');
    assert.equal(d.nextState.tripOpenCounts['cluster-0'], 1);
    assert.equal(d.promptTrigger, null);
  });

  test('StoreKit unavailable', () => {
    const d = decide({ trigger: 'first_share', storeKitAvailable: false });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'unavailable');
  });

  test('second open of a different trip is no_trigger', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-1',
      state: { tripOpenCounts: { 'cluster-0': 1 } },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'no_trigger');
    assert.equal(d.nextState.tripOpenCounts['cluster-1'], 1);
    assert.equal(d.nextState.tripOpenCounts['cluster-0'], 1);
  });

  test('first_share after cooldown expires can prompt', () => {
    const d = decide({
      trigger: 'first_share',
      state: { lastPromptAt: NOW - COOLDOWN_MS, lastPromptVersion: '1.1.7' },
    });
    assert.equal(d.action, 'prompt');
    assert.equal(d.promptTrigger, 'first_share');
  });

  test('first_share immediately after a prompt prefers cooldown', () => {
    const d = decide({
      trigger: 'first_share',
      state: {
        lastPromptAt: NOW,
        lastPromptVersion: VERSION,
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'cooldown');
  });

  test('first_share new version after cooldown prompts', () => {
    const d = decide({
      trigger: 'first_share',
      appVersion: '1.1.9',
      state: {
        lastPromptAt: NOW - COOLDOWN_MS,
        lastPromptVersion: VERSION,
      },
    });
    assert.equal(d.action, 'prompt');
  });

  test('trip_open without tripId is no_trigger', () => {
    const d = decide({ trigger: 'trip_open' });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'no_trigger');
  });

  test('second trip_open with StoreKit unavailable', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
      storeKitAvailable: false,
      state: { tripOpenCounts: { 'cluster-0': 1 } },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'unavailable');
  });

  test('second trip_open during cooldown', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
      state: {
        lastPromptAt: NOW - 1000,
        tripOpenCounts: { 'cluster-0': 1 },
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'cooldown');
  });

  test('second trip_open same version after cooldown is version_gate', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
      state: {
        lastPromptAt: NOW - COOLDOWN_MS,
        lastPromptVersion: VERSION,
        tripOpenCounts: { 'cluster-0': 1 },
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'version_gate');
  });

  test('unavailable wins over cooldown', () => {
    const d = decide({
      trigger: 'first_share',
      storeKitAvailable: false,
      state: { lastPromptAt: NOW - 1000, lastPromptVersion: '1.1.7' },
    });
    assert.equal(d.reason, 'unavailable');
  });

  test('cooldown wins over version_gate', () => {
    const d = decide({
      trigger: 'first_share',
      state: {
        lastPromptAt: NOW - 1000,
        lastPromptVersion: VERSION,
      },
    });
    assert.equal(d.reason, 'cooldown');
  });

  test('version_gate wins over no_trigger', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
      state: {
        lastPromptAt: NOW - COOLDOWN_MS,
        lastPromptVersion: VERSION,
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'version_gate');
    assert.equal(d.nextState.tripOpenCounts['cluster-0'], 1);
  });

  test('old distinctDays in persisted state is ignored', () => {
    const d = decide({
      trigger: 'first_share',
      state: { distinctDays: ['2026-01-01'] },
    });
    assert.equal(d.action, 'prompt');
    assert.equal(d.promptTrigger, 'first_share');
    assert.equal(d.nextState.distinctDays, undefined);
  });

  test('nextState never records distinctDays', () => {
    const d = decide({ trigger: 'launch' });
    assert.ok(!Object.prototype.hasOwnProperty.call(d.nextState, 'distinctDays'));
  });
});

describe('shouldDeferReviewRequest', () => {
  test('first_share is deferred until share UI is gone', () => {
    assert.equal(shouldDeferReviewRequest('first_share'), true);
  });

  test('second_open is not deferred', () => {
    assert.equal(shouldDeferReviewRequest('second_open'), false);
  });
});

describe('consumePendingReview', () => {
  test('no pending is a noop', () => {
    const r = consumePendingReview({ pending: false, appState: 'active' });
    assert.equal(r.action, 'noop');
    assert.equal(r.idleDelayMs, 0);
  });

  test('pending while background waits for foreground', () => {
    const r = consumePendingReview({ pending: true, appState: 'background' });
    assert.equal(r.action, 'wait');
  });

  test('pending while inactive waits for foreground', () => {
    const r = consumePendingReview({ pending: true, appState: 'inactive' });
    assert.equal(r.action, 'wait');
  });

  test('pending while active flushes with a short idle delay', () => {
    const r = consumePendingReview({ pending: true, appState: 'active' });
    assert.equal(r.action, 'flush');
    assert.ok(r.idleDelayMs > 0);
    assert.ok(r.idleDelayMs <= 1000);
    assert.equal(r.idleDelayMs, SHARE_REVIEW_IDLE_DELAY_MS);
  });

  test('max wait is a few seconds', () => {
    assert.ok(SHARE_REVIEW_MAX_WAIT_MS >= 2000);
    assert.ok(SHARE_REVIEW_MAX_WAIT_MS <= 8000);
  });
});

describe('localCalendarDay', () => {
  test('formats YYYY-MM-DD from a timestamp', () => {
    const s = localCalendarDay(NOW);
    assert.match(s, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('hashShareId', () => {
  test('empty SHA-256 matches the public vector', () => {
    assert.equal(
      sha256hex(''),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });

  test('does not return the raw share id', () => {
    const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    const hashed = hashShareId(id);
    assert.equal(hashed.length, 16);
    assert.notEqual(hashed, id);
    assert.equal(hashShareId(id), hashed);
  });

  test('empty share id is omitted', () => {
    assert.equal(hashShareId(''), undefined);
    assert.equal(hashShareId(null), undefined);
  });
});
