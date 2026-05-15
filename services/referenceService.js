const { db } = require("../db");

/**
 * Check if reference code exists and has status OPEN
 * @param {string} referenceCode - Reference code to validate (e.g., "CODE123")
 * @returns {Promise<boolean>} True if valid and OPEN, false otherwise
 */
async function isReferenceCodeValid(referenceCode) {
  try {
    if (!referenceCode) {
      return false;
    }

    const sql = "SELECT status FROM ms_ref WHERE reference_code = ?";
    const [rows] = await db.execute(sql, [referenceCode]);

    if (rows.length === 0) {
      return false; // Code does not exist
    }

    return rows[0].status === "OPEN";
  } catch (error) {
    console.error("Error checking reference code validity:", error);
    throw error;
  }
}

/**
 * Get reference code status (OPEN or CLOSED)
 * @param {string} referenceCode - Reference code to check
 * @returns {Promise<string|null>} Status string ("OPEN", "CLOSED") or null if not found
 */
async function getReferenceCodeStatus(referenceCode) {
  try {
    const sql = "SELECT status FROM ms_ref WHERE reference_code = ?";
    const [rows] = await db.execute(sql, [referenceCode]);

    if (rows.length === 0) {
      return null;
    }

    return rows[0].status;
  } catch (error) {
    console.error("Error getting reference code status:", error);
    throw error;
  }
}

/**
 * Generate new reference code with status OPEN
 * @param {string} referenceCode - Reference code to create (must be alphanumeric, max 15 char)
 * @returns {Promise<void>}
 * @throws {Error} If code already exists
 */
async function generateReferenceCode(referenceCode) {
  try {
    // Check if code already exists
    const checkSql = "SELECT id FROM ms_ref WHERE reference_code = ?";
    const [checkRows] = await db.execute(checkSql, [referenceCode]);

    if (checkRows.length > 0) {
      const error = new Error(`Reference code ${referenceCode} sudah ada`);
      error.code = "DUPLICATE_REFERENCE_CODE";
      throw error;
    }

    // Insert new reference code
    const insertSql = `
      INSERT INTO ms_ref (reference_code, status, created_at, updated_at)
      VALUES (?, 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;
    await db.execute(insertSql, [referenceCode]);
  } catch (error) {
    console.error("Error generating reference code:", error);
    throw error;
  }
}

/**
 * Update reference code status (e.g., from OPEN to CLOSED)
 * @param {string} referenceCode - Reference code to update
 * @param {string} newStatus - New status ("OPEN" or "CLOSED")
 * @returns {Promise<void>}
 */
async function updateReferenceCodeStatus(referenceCode, newStatus) {
  try {
    const sql = `
      UPDATE ms_ref
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE reference_code = ?
    `;
    await db.execute(sql, [newStatus, referenceCode]);
  } catch (error) {
    console.error("Error updating reference code status:", error);
    throw error;
  }
}

/**
 * Check if reference code exists (regardless of status)
 * @param {string} referenceCode - Reference code to check
 * @returns {Promise<boolean>} True if code exists in database
 */
async function referenceCodeExists(referenceCode) {
  try {
    const sql = "SELECT id FROM ms_ref WHERE reference_code = ?";
    const [rows] = await db.execute(sql, [referenceCode]);
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking if reference code exists:", error);
    throw error;
  }
}

module.exports = {
  isReferenceCodeValid,
  getReferenceCodeStatus,
  generateReferenceCode,
  updateReferenceCodeStatus,
  referenceCodeExists
};
