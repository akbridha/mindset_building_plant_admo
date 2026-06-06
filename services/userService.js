const { db } = require("../db");


const { encryptTelegramId } = require("./encryptionService");

// async function setTimeReminder(ctx) {

//     //TODO : Pengecekan status
//         //TODO : set Status
//     return ctx.reply(ctx, "Masukkan Jam Untuk Reminder Time Anda");
    
// }


async function updateTimeReminder(telegram_id, reminder_time) {
    const sql = `
        UPDATE ms_user
        SET reminder_time = ?, 
        updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id = ?
    `;
    
    try {
        // const [result] = await db.execute(sql, [reminder_time, telegram_id]);
        const [result] = await db.execute(sql, [reminder_time, telegram_id]);
        
        // VALIDASI: Pastikan ada data yang berubah
        if (result.affectedRows === 0) {
            throw new Error(`User dengan ID ${telegram_id} tidak ditemukan di database`);
        }
        
        if (result.affectedRows > 1) {
            console.warn(`Warning: Update affected ${result.affectedRows} rows for telegram_id ${telegram_id}`);
        }
        
        return true;
        
    } catch (error) {
        console.error("Error updating time reminder:", error);
        throw error; // Re-throw agar ditangkap oleh controller
    }
}

async function findUserByUsername(username) {
  try {
    // Hapus @ jika ada
    const cleanUsername = username.replace(/^@/, '');
    
    const [rows] = await db.execute(
      `SELECT id, encrypted_telegram_id, username, first_name 
       FROM users 
       WHERE username = ? OR encrypted_telegram_id = ?`,
      [cleanUsername, cleanUsername]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error finding user by username:", error);
    throw error;
  }
}


/**
 * Create or get user from Telegram data
 * @param {number|string} telegramId - Raw Telegram ID
 * @param {string|null} username - Telegram username
 * @param {string|null} firstName - Telegram first name
 * @returns {Promise<number>} - User internal ID
 */
async function createUserFromTelegram(telegramId, username, firstName) {
  try {
    // ENKRIPSI telegram_id
    const encryptedId = encryptTelegramId(telegramId);
    
    // Cek apakah user sudah ada
    let user = await getUserByTelegramId(telegramId);
    
    if (user) {
      // Update existing user jika perlu
      if (username || firstName) {
        await db.execute(
          `UPDATE users 
           SET username = COALESCE(?, username),
               first_name = COALESCE(?, first_name)
           WHERE encrypted_telegram_id = ?`,
          [username, firstName, encryptedId]
        );
      }
      return user.id;
    }
    
    // Insert new user
    const [result] = await db.execute(
      `INSERT INTO users (encrypted_telegram_id, username, first_name, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [encryptedId, username || null, firstName || null]
    );
    
    return result.insertId;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}



/**
 * Get user by raw telegram_id (encrypted lookup)
 * @param {number|string} telegram_id - Raw Telegram ID
 * @returns {Promise<Object|null>} - User data or null
 */
async function getUserByTelegramId(telegram_id) {
  try {
    // ENKRIPSI telegram_id terlebih dahulu
    const encryptedId = encryptTelegramId(telegram_id);
    
    const [rows] = await db.execute(
      `SELECT id, encrypted_telegram_id, username, first_name, is_super_admin, created_at
       FROM users 
       WHERE encrypted_telegram_id = ?`,
      [encryptedId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error finding user by telegram_id:", error);
    throw error;
  }
}

/**
 * Get user by internal user ID
 * @param {number} userId - Internal user ID
 * @returns {Promise<Object|null>} - User data or null
 */
async function getUserById(userId) {
  try {
    const [rows] = await db.execute(
      `SELECT id, encrypted_telegram_id, username, first_name, is_super_admin, created_at
       FROM users 
       WHERE id = ?`,
      [userId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw error;
  }
}

/**
 * Get raw Telegram ID from ms_user table by user ID
 * @param {number} userId - Internal user ID from users table
 * @returns {Promise<number|null>} - Raw Telegram ID or null
 */
async function getRawTelegramIdByUserId(userId) {
  try {
    const [rows] = await db.execute(
      `SELECT telegram_id FROM ms_user WHERE user_id = ?`,
      [userId]
    );
    
    return rows.length > 0 ? rows[0].telegram_id : null;
  } catch (error) {
    console.error("Error getting raw telegram ID:", error);
    return null;
  }
}

/**
 * Get user by internal user ID (already exists, but export it)
 */
async function getUserById(userId) {
  try {
    const [rows] = await db.execute(
      `SELECT id, encrypted_telegram_id, username, first_name, is_super_admin, created_at
       FROM users 
       WHERE id = ?`,
      [userId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error finding user by ID:", error);
    throw error;
  }
}
module.exports ={
  getUserByTelegramId, 
  getUserById,         
  updateTimeReminder,
  findUserByUsername, 
  createUserFromTelegram,
  getRawTelegramIdByUserId 

}