const crypto = require('crypto');

/**
 * Hashing service for encrypting telegram_id
 * Uses SHA-256 with SALT for deterministic hashing
 * Same input will always produce same hash (good for lookups)
 */

const SALT = process.env.ENCRYPTION_SALT || 'your-secret-salt-key-change-this';

/**
 * Hash a telegram_id to create a unique fingerprint
 * @param {number} telegramId - The Telegram user ID
 * @returns {string} SHA-256 hash of the telegram ID
 */
function hashTelegramId(telegramId) {
  if (!telegramId) {
    throw new Error('Telegram ID cannot be null or undefined');
  }

  try {
    const hash = crypto
      .createHash('sha256')
      .update(telegramId.toString() + SALT)
      .digest('hex');
    
    return hash;
  } catch (error) {
    console.error('Error hashing telegram ID:', error);
    throw error;
  }
}

/**
 * Verify that a telegram ID matches a hash
 * (For future use or verification purposes)
 * @param {number} telegramId - The Telegram user ID to verify
 * @param {string} hash - The stored hash to compare against
 * @returns {boolean} True if hash matches
 */
function verifyTelegramId(telegramId, hash) {
  try {
    const computedHash = hashTelegramId(telegramId);
    return computedHash === hash;
  } catch (error) {
    console.error('Error verifying telegram ID:', error);
    return false;
  }
}

/**
 * Helper: Create hash + telegram_id pair for insertion
 * @param {number} telegramId - The Telegram user ID
 * @returns {Object} Object with telegramId and hash
 */
function createHashPair(telegramId) {
  return {
    telegramId,
    hash: hashTelegramId(telegramId)
  };
}

module.exports = {
  hashTelegramId,
  verifyTelegramId,
  createHashPair,
  SALT
};
