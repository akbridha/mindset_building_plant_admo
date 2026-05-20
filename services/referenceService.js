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

    const sql = "SELECT reference_code FROM ms_ref WHERE reference_code = ?";
    const [rows] = await db.execute(sql, [referenceCode]);

    if (rows.length === 0) {
      return false; // Code does not exist
    }

    return true;
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
async function generateReferenceCode(durationMinutes = 20, jumlahMP = 1) {
  try {
    console.log("durationMinutes received:", durationMinutes);


  const randomPart = generateRandomPart(13);            // fix agar selalu 13 chars
  const mpFormatted = formatJumlahMP(jumlahMP);         // fixed selalu 2 digits
  const referenceCode = `${mpFormatted}${randomPart}`;  // Totoal mesti 15 chars total
    const timestampGeneration = new Date();
    const expirationTime = new Date(timestampGeneration.getTime() + durationMinutes * 60000); // Set expiration time
    // cek dulu if code asudah ada
    const checkSql = "SELECT id FROM ms_ref WHERE reference_code = ?";
    const [checkRows] = await db.execute(checkSql, [referenceCode]);

    if (checkRows.length > 0) {
      const error = new Error(`Reference code ${referenceCode} sudah ada`);
      error.code = "DUPLICATE_REFERENCE_CODE";
      throw error;
    }

    //buat Ke dalam dB
    const insertSql = `
      INSERT INTO ms_ref (reference_code, created_at, off_time)
      VALUES (?, ?, ?)
    `;
    await db.execute(insertSql, [referenceCode, timestampGeneration, expirationTime]);
    return {
      referenceCode: referenceCode,
      expirationTime: expirationTime,
      jumlahMP: jumlahMP
    };
    // retun object supaya bisa diprint untuk balasan oleh bot ke user
  } catch (error) {
    console.error("Error generating reference code:", error);
    throw error;
  }
}


function formatJumlahMP(jumlahMP) {
  let mpInteger = Math.floor(jumlahMP);
  if (mpInteger < 0) mpInteger = 0;
  if (mpInteger > 99) mpInteger = 99;
  return mpInteger.toString().padStart(2, '0');  // ✅ this already works
}

function generateRandomPart(length = 13) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// /**
//  * Update reference code status (e.g., from OPEN to CLOSED)
//  * @param {string} referenceCode - Reference code to update
//  * @param {string} newStatus - New status ("OPEN" or "CLOSED")
//  * @returns {Promise<void>}
//  */
// async function updateReferenceCodeStatus(referenceCode, newStatus) {
//   try {
//     const sql = `
//       UPDATE ms_ref
//       SET status = ?, updated_at = CURRENT_TIMESTAMP
//       WHERE reference_code = ?
//     `;
//     await db.execute(sql, [newStatus, referenceCode]);
//   } catch (error) {
//     console.error("Error updating reference code status:", error);
//     throw error;
//   }
// }

/**
 * Check if reference code exists (regardless of status)
 * @param {string} referenceCode - Reference code to check
 * @returns {Promise<boolean>} True if code exists in database
 */
async function referenceCodeExists(referenceCode) {
  try {
    const sql = "SELECT id FROM ms_ref WHERE reference_code = ? and off_time > now()";
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
  // updateReferenceCodeStatus,
  referenceCodeExists
};
