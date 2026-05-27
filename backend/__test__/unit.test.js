// backend/__tests__/unit.test.js
const { isValidCapacity } = require('../utils/validation');
const { getRelativeTime } = require('../utils/timeFormatter');

describe('Unit Testing', () => {

  describe('isValidCapacity', () => {
    test('should return true for valid capacities', () => {
      expect(isValidCapacity(5)).toBe(true);
      expect(isValidCapacity("10")).toBe(true); // Should handle string numbers
    });

    test('should return false for capacity less than or equal to 1', () => {
      expect(isValidCapacity(1)).toBe(false);
      expect(isValidCapacity(0)).toBe(false);
      expect(isValidCapacity(-5)).toBe(false);
    });

    test('should return false for non-numeric inputs', () => {
      expect(isValidCapacity("abc")).toBe(false);
      expect(isValidCapacity(null)).toBe(false);
    });
  });

  describe('Time Formatter (getRelativeTime)', () => {
    const now = Date.now();

    test('should parse standard ISO strings correctly (minutes ago)', () => {
      const tenMinsAgo = new Date(now - 10 * 60 * 1000).toISOString();
      expect(getRelativeTime(tenMinsAgo)).toBe('10m ago');
    });

    test('should parse Firebase Timestamp objects securely', () => {
      const twoHoursAgoSeconds = Math.floor((now - 2 * 60 * 60 * 1000) / 1000);
      const firebaseObj = { _seconds: twoHoursAgoSeconds, _nanoseconds: 0 };
      expect(getRelativeTime(firebaseObj)).toBe('2h ago');
    });

    test('should gracefully fallback to "Just now" for invalid/empty data', () => {
      expect(getRelativeTime(null)).toBe('Just now');
      expect(getRelativeTime("invalid-date-format")).toBe('Just now');
    });
  });

});