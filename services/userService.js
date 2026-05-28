const { db } = require("../db");


async function setTimeReminder(ctx) {

    //TODO : Pengecekan status
        //TODO : set Status
    return ctx.reply(ctx, "Masukkan Jam Untuk Reminder Time Anda");
    
}


async function updateTimeReminder(telegram_id, reminder_time) {
  try {



    //TODO : Pengecekan format
    const sql = `
      UPDATE ms_user
      SET context_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = ?
    `;
    await db.execute(sql, [JSON.stringify(mergedContext), telegram_id]);
  } catch (error) {
    console.error("Error updating time Reminder:", error);
    throw error;
  }
}