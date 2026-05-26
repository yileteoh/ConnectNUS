// backend/utils/validation.js

/**
 * Validates if the provided capacity is a valid number strictly greater than 1
 * @param {any} capacity - The input capacity
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidCapacity(capacity) {
  const num = parseInt(capacity, 10);
  if (isNaN(num)) return false;
  return num > 1;
}

module.exports = { isValidCapacity };