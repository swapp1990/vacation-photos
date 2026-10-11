const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { trackVacationShared } = require('../shareEvents.js');

const PII_KEYS = [
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
];

describe('trackVacationShared', () => {
  let calls;
  function mockTrack(eventName, metadata) {
    calls.push([eventName, metadata]);
  }

  beforeEach(() => {
    calls = [];
  });

  test('emits exactly one vp_vacation_shared with photos and is_north_star', () => {
    trackVacationShared(12, mockTrack);

    assert.equal(calls.length, 1);
    const [eventName, metadata] = calls[0];
    assert.equal(eventName, 'vp_vacation_shared');
    assert.deepEqual(metadata, {
      photos: 12,
      is_north_star: 'true',
    });
  });

  test('payload has no PII keys', () => {
    trackVacationShared(3, mockTrack);

    const metadata = calls[0][1];
    for (const key of PII_KEYS) {
      assert.ok(!Object.prototype.hasOwnProperty.call(metadata, key));
    }
  });
});
