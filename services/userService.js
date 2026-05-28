const { db } = require("../db");


// async function setTimeReminder(ctx) {

//     //TODO : Pengecekan status
//         //TODO : set Status
//     return ctx.reply(ctx, "Masukkan Jam Untuk Reminder Time Anda");
    
// }


async function updateTimeReminder(telegram_id, reminder_time) {
  try {

    const sql = `
      UPDATE ms_user
      SET reminder_time = ?, 
      updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = ?
    `;
    await db.execute(sql, [reminder_time, telegram_id]);
  } catch (error) {
    console.error("Error updating time Reminder:", error);
    throw error;
  }
}

module.exports ={
  updateTimeReminder

}