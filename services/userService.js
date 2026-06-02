const { db } = require("../db");


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

async function createUserFromTelegram(telegramId, username, firstName) {
  try {
    const [result] = await db.execute(
      `INSERT INTO users (encrypted_telegram_id, username, first_name, created_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE 
         username = COALESCE(?, username),
         first_name = COALESCE(?, first_name)`,
      [telegramId.toString(), username, firstName, username, firstName]
    );
    
    const [user] = await db.execute(`SELECT id FROM users WHERE encrypted_telegram_id = ?`, [telegramId.toString()]);
    return user[0].id;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

module.exports ={
  updateTimeReminder,
  findUserByUsername, 
  createUserFromTelegram 

}