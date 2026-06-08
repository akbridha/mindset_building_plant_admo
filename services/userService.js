const { db } = require("../db");
const { hashTelegramId } = require("./encryptionService");

/**
 * Update reminder time for a user
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @param {string} reminder_time - Time in HH:MM:SS format
 * @returns {Promise<boolean>} True if update was successful
 */
async function updateTimeReminder(telegram_id, reminder_time) {
    const hash = hashTelegramId(telegram_id);
    
    const sql = `
        UPDATE ms_user
        SET reminder_time = ?, 
        updated_at = CURRENT_TIMESTAMP
        WHERE telegram_id_hash = ?
    `;
    
    try {
        const [result] = await db.execute(sql, [reminder_time, hash]);
        
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
async function isUserRegistered(telegram_id) {
    const sql = "SELECT * FROM ms_user WHERE telegram_id = ?";
    const [rows] = await db.execute(sql, [telegram_id]);
    return rows.length > 0;
}

module.exports ={
    updateTimeReminder,
    isUserRegistered

}
