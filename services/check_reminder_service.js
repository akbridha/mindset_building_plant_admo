const { db } = require("../db");

async function checkReminderService(timeRange = 5) {
  try {
    console.log("Checking reminders...");

    const [rows] = await db.execute(`
      SELECT
        telegram_id,
        checkpoint_time,
        task_id,
        task_description
      FROM reminders
      WHERE
        checkpoint_time >= NOW()
        AND checkpoint_time < DATE_ADD(NOW(), INTERVAL ${timeRange} MINUTE)
      `);

    console.log("Reminder found:", rows.length);

    // for (const reminder of rows) {
    //   console.log({
    //     time_now : new Date().toISOString(),
    //     telegram_id: reminder.telegram_id,
    //     checkpoint_time: reminder.checkpoint_time,
    //     task_description: reminder.task_description,
    //   });
    // }

    return rows;
  } catch (error) {
    console.error("checkReminderService error:", error);
  }
}

 function checkDataCheckpointTime(reminders) {

  const now = new Date();

  return reminders.filter((reminder) => {

    const checkpoint =
      new Date(reminder.checkpoint_time);

    return checkpoint <= now;

  });

}

async function checkIsLastReminder(reminderId){

    var  targetReminder  = 0;

    try {
      // console.log("Checking reminders...");
    

      const [rowReminder] = await db.execute(`
        

        SELECT task_id,
         target
          FROM reminders
        WHERE
         task_id = ?
        
        
        `,[reminderId]);

        
      if (rowReminder.length > 0) {
  
      // GUNAKAN TANDA KOMA (,) agar isi Object bisa diintip di terminal

      targetReminder = rowReminder[0].target;
      console.log('Target Reminder Terpilih:', targetReminder);
      
      // Jika ingin melihat salah satu properti spesifiknya saja:
      console.log('Nilai Target:', targetReminder);


    } else {
      // Jika masuk ke sini, berarti di database memat tidak ada task_id yang dicari
      console.log(`Data TIDAK DITEMUKAN di database untuk task_id: ${reminderId}`);
    }

      // format sql2 untuk node.js selalu mengembalikan dua Array jari perlu deconstruk untuk variable hasil querynya
      const [rowProgress] = await db.execute(`
        SELECT COUNT(*) AS total
        FROM progress_history
        WHERE
        reminder_id = ?
        
        `,[reminderId]
      );

      const jumlahReminder = rowProgress[0].total;

      console.log("hasil Query:", jumlahReminder);
      console.log("Reminder untuk cek last reminder:", );

      return jumlahReminder >= targetReminder ? true :false;


    } catch (error) {
      console.error("cek last reminder error:", error);
    }

  }

module.exports = {
  checkReminderService,
  checkDataCheckpointTime,
  checkIsLastReminder
};