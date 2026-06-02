const crypto = require("crypto");

/**
 * Encryption service for LAPOR PAK system
 * - Encrypts telegram_id (one-way hash) for anonymity
 * - Generates unique Lapor Pak IDs
 */

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "lapor-pak-2026";

/**
 * One-way encryption of telegram_id
 * Used for storing reporter identity without exposing raw ID
 * @param {number} telegram_id - Telegram user ID
 * @returns {string} - Encrypted telegram_id (SHA256 hex)
 */
function encryptTelegramId(telegram_id) {
  const hash = crypto
    .createHash("sha256")
    .update(ENCRYPTION_KEY + telegram_id.toString())
    .digest("hex");
  return hash;
}

/**
 * Generate unique Lapor Pak ID
 * Format: LAP-[5-digit-sequence] (e.g., LAP-00001)
 * @param {number} sequence - Sequential number from DB auto-increment
 * @returns {string} - Formatted Lapor Pak ID
 */
function generateLaporPakId(sequence) {
  // Pad sequence to 5 digits
  const paddedSequence = String(sequence).padStart(5, "0");
  return `LAP-${paddedSequence}`;
}

/**
 * Extract sequence number from Lapor Pak ID
 * @param {string} laporPakId - ID like "LAP-00001"
 * @returns {number} - Sequence number
 */
function extractSequenceFromLaporPakId(laporPakId) {
  const match = laporPakId.match(/^LAP-(\d+)$/);
  if (!match) {
    throw new Error(`Invalid Lapor Pak ID format: ${laporPakId}`);
  }
  return parseInt(match[1], 10);
}

/**
 * Validate Lapor Pak ID format
 * @param {string} laporPakId - ID to validate
 * @returns {boolean} - True if valid format
 */
function isValidLaporPakId(laporPakId) {
  return /^LAP-\d{5}$/.test(laporPakId);
}

module.exports = {
  encryptTelegramId,
  generateLaporPakId,
  extractSequenceFromLaporPakId,
  isValidLaporPakId,
};
