jest.mock('../telemetry-client', () => ({
  initAnalytics: jest.fn(),
  track: jest.fn(),
  getInstalledAt: jest.fn(),
}));

const { track: mockTrack } = require('../telemetry-client');
const { trackVacationShared } = require('../analytics');

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
  beforeEach(() => {
    mockTrack.mockClear();
  });

  test('emits exactly one vp_vacation_shared with photos and is_north_star', () => {
    trackVacationShared(12);

    expect(mockTrack).toHaveBeenCalledTimes(1);
    const [eventName, metadata] = mockTrack.mock.calls[0];
    expect(eventName).toBe('vp_vacation_shared');
    expect(metadata).toEqual({
      photos: 12,
      is_north_star: 'true',
    });
  });

  test('payload has no PII keys', () => {
    trackVacationShared(3);

    const metadata = mockTrack.mock.calls[0][1];
    for (const key of PII_KEYS) {
      expect(metadata).not.toHaveProperty(key);
    }
  });
});
