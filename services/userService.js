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

module.exports ={
  updateTimeReminder

}