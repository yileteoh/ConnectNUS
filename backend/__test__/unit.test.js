// backend/__tests__/unit.test.js
const { isValidCapacity } = require('../utils/validation');

describe('Unit Testing', () => {
  
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