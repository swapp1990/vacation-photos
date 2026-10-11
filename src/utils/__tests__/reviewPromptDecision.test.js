const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const {
  decideRatingPrompt,
  COOLDOWN_MS,
  localCalendarDay,
} = require('../reviewPromptDecision.js');
const { sha256hex, hashShareId } = require('../hashShareId.js');

const NOW = 1_800_000_000_000;
const VERSION = '1.1.8';
const DAY_A = '2026-01-01';
const DAY_B = '2026-01-10';

function decide(overrides = {}) {
  const { state: stateOverrides, ...rest } = overrides;
  return decideRatingPrompt({
    state: {
      lastPromptAt: null,
      lastPromptVersion: null,
      distinctDays: [DAY_A],
      tripOpenCounts: {},
      ...stateOverrides,
    },
    trigger: 'share_success',
    now: NOW,
    appVersion: VERSION,
    storeKitAvailable: true,
    calendarDay: DAY_B,
    ...rest,
  });
}

describe('decideRatingPrompt truth table', () => {
  test('launch never prompts (threshold)', () => {
    const d = decide({ trigger: 'launch' });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'threshold');
  });

  test('other never prompts (threshold)', () => {
    const d = decide({ trigger: 'other' });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'threshold');
  });

  test('missing trigger never prompts (threshold)', () => {
    const d = decide({ trigger: undefined });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'threshold');
  });

  test('share_success on one calendar day is day_gate', () => {
    const d = decide({
      state: { distinctDays: [] },
      calendarDay: DAY_A,
      trigger: 'share_success',
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'day_gate');
    assert.deepEqual(d.nextState.distinctDays, [DAY_A]);
  });

  test('share_success on 2 distinct days prompts', () => {
    const d = decide({ trigger: 'share_success' });
    assert.equal(d.action, 'prompt');
    assert.equal(d.reason, null);
    assert.deepEqual(d.nextState.distinctDays, [DAY_A, DAY_B]);
  });

  test('share_success with StoreKit unavailable', () => {
    const d = decide({ trigger: 'share_success', storeKitAvailable: false });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'unavailable');
  });

  test('share_success within 90-day cooldown', () => {
    const d = decide({
      trigger: 'share_success',
      state: { lastPromptAt: NOW - COOLDOWN_MS + 1, distinctDays: [DAY_A] },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'cooldown');
  });

  test('share_success after cooldown expires can prompt', () => {
    const d = decide({
      trigger: 'share_success',
      state: { lastPromptAt: NOW - COOLDOWN_MS, lastPromptVersion: '1.1.7', distinctDays: [DAY_A] },
    });
    assert.equal(d.action, 'prompt');
  });

  test('share_success same app version is version_gate after cooldown', () => {
    const d = decide({
      trigger: 'share_success',
      state: {
        lastPromptAt: NOW - COOLDOWN_MS,
        lastPromptVersion: VERSION,
        distinctDays: [DAY_A],
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'version_gate');
  });

  test('share_success new version still in cooldown prefers cooldown', () => {
    const d = decide({
      trigger: 'share_success',
      appVersion: '1.1.9',
      state: {
        lastPromptAt: NOW - 1000,
        lastPromptVersion: VERSION,
        distinctDays: [DAY_A],
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'cooldown');
  });

  test('share_success new version after cooldown prompts', () => {
    const d = decide({
      trigger: 'share_success',
      appVersion: '1.1.9',
      state: {
        lastPromptAt: NOW - COOLDOWN_MS,
        lastPromptVersion: VERSION,
        distinctDays: [DAY_A],
      },
    });
    assert.equal(d.action, 'prompt');
  });

  test('first trip_open is threshold even with 2 days', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'threshold');
    assert.equal(d.nextState.tripOpenCounts['cluster-0'], 1);
  });

  test('second trip_open of the same trip prompts', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
      state: { distinctDays: [DAY_A], tripOpenCounts: { 'cluster-0': 1 } },
    });
    assert.equal(d.action, 'prompt');
    assert.equal(d.nextState.tripOpenCounts['cluster-0'], 2);
  });

  test('second open of a different trip is still threshold', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-1',
      state: { distinctDays: [DAY_A], tripOpenCounts: { 'cluster-0': 1 } },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'threshold');
    assert.equal(d.nextState.tripOpenCounts['cluster-1'], 1);
    assert.equal(d.nextState.tripOpenCounts['cluster-0'], 1);
  });

  test('second trip_open on a single calendar day is day_gate', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
      calendarDay: DAY_A,
      state: { distinctDays: [DAY_A], tripOpenCounts: { 'cluster-0': 1 } },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'day_gate');
    assert.equal(d.nextState.tripOpenCounts['cluster-0'], 2);
  });

  test('second trip_open with StoreKit unavailable', () => {
    const d = decide({
      trigger: 'trip_open',
      tripId: 'cluster-0',
      storeKitAvailable: false,
      state: { distinctDays: [DAY_A], tripOpenCounts: { 'cluster-0': 1 } },
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
        distinctDays: [DAY_A],
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
        distinctDays: [DAY_A],
        tripOpenCounts: { 'cluster-0': 1 },
      },
    });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'version_gate');
  });

  test('trip_open without tripId is threshold', () => {
    const d = decide({ trigger: 'trip_open' });
    assert.equal(d.action, 'skip');
    assert.equal(d.reason, 'threshold');
  });

  test('unavailable wins over day_gate', () => {
    const d = decide({
      trigger: 'share_success',
      storeKitAvailable: false,
      state: { distinctDays: [] },
      calendarDay: DAY_A,
    });
    assert.equal(d.reason, 'unavailable');
  });

  test('records today even when skipping', () => {
    const d = decide({
      trigger: 'share_success',
      state: { distinctDays: [] },
      calendarDay: DAY_B,
    });
    assert.equal(d.reason, 'day_gate');
    assert.ok(d.nextState.distinctDays.includes(DAY_B));
  });

  test('two injected local calendar days satisfy the day gate', () => {
    const first = decide({
      trigger: 'share_success',
      state: { distinctDays: [] },
      calendarDay: DAY_A,
    });
    const second = decide({
      trigger: 'share_success',
      state: first.nextState,
      calendarDay: DAY_B,
    });
    assert.equal(first.reason, 'day_gate');
    assert.equal(second.action, 'prompt');
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
