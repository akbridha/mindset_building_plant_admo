const { db } = require("../db");
const { hashTelegramId } = require("./encryptionService");

async function checkReminderService(timeRange = 5) {
  try {
    console.log("Checking reminders...");

    const [rows] = await db.execute(`
      SELECT
        r.user_id,
        r.task_id,
        r.task_description,
        r.checkpoint_time,
        r.target
      FROM reminders r
      WHERE
        r.checkpoint_time >= NOW()
        AND r.checkpoint_time < DATE_ADD(NOW(), INTERVAL ${timeRange} MINUTE)
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

    console.log("Total Semua progress tercatat:", jumlahReminder);
    console.log("Reminder untuk cek last reminder:", );

    return jumlahReminder >= targetReminder ? true :false;


    } catch (error) {
      console.error("cek last reminder error:", error);
    }

  }

  async function filterReminderWithProgressLessThanTarget(reminders) {
    if (!reminders || reminders.length === 0) {
      return [];
    }

    var filteredReminders = [];

    for (const reminder of reminders) {


      console.log({
        data_in_main_command: "data insised",
        telegram_id: reminder.telegram_id,
        task_id: reminder.task_id,
        task_description: reminder.task_description,
        checkpoint_time: reminder.checkpoint_time,
        target: reminder.target
      });


      try {
        // Get current progress count for this reminder
        const [rowProgress] = await db.execute(
          `SELECT COUNT(*) AS total
          FROM progress_history
          WHERE reminder_id = ?`,
          [reminder.task_id] 
        );

        const currentProgress = rowProgress[0]?.total || 0;
        const target = parseInt(reminder.target);

        // Only keep reminders where progress is less than target
        if (currentProgress < target) {
          filteredReminders.push(reminder);
          console.log(`Reminder ${reminder.task_id}: Progress ${currentProgress} < Target ${target} - INCLUDED`);
        } else {
          console.log(`Reminder ${reminder.task_id}: Progress ${currentProgress} >= Target ${target} - FILTERED OUT`);
        }
      } catch (error) {
        console.error(`Error checking progress for reminder ${reminder.reminder_id || reminder.id}:`, error);
        // Optionally include reminders that cause errors, or skip them
        // filteredReminders.push(reminder);
      }
    }

    return filteredReminders;
  }

  async function getUsersInReminderWindow(timeRange = 5) {
  try {
    const sql = `
      SELECT 
        user_id,
        telegram_id,
        current_state,
        reminder_time
      FROM ms_user
      WHERE reminder_time BETWEEN CURTIME()
      AND ADDTIME(
        CURTIME(),
        SEC_TO_TIME(? * 60)
      )
    `;

    const [rows] = await db.execute(sql, [timeRange]);

    return rows;

  } catch (error) {
    console.error(error);
  }
}


async function getRemindersByUsers(telegramIds) {
  if (!telegramIds.length) return [];

  // Convert telegram_ids to user_ids
  const userIds = [];
  
  for (const telegramId of telegramIds) {
    try {
      const hash = hashTelegramId(telegramId);
      const sql = "SELECT user_id FROM ms_user WHERE telegram_id_hash = ?";
      const [rows] = await db.execute(sql, [hash]);
      if (rows.length > 0) {
        userIds.push(rows[0].user_id);
      }
    } catch (error) {
      console.error(`Error converting telegram_id ${telegramId} to user_id:`, error);
    }
  }

  if (!userIds.length) return [];

  const placeholders = userIds.map(() => '?').join(',');

  console.log("Placeholders: " + placeholders);

  const sql = `
    SELECT 
      u.telegram_id,
      r.task_id,
      r.task_description,
      r.target,
      r.progress,
      r.status
    FROM reminders r
    JOIN ms_user u ON r.user_id = u.user_id
    WHERE r.user_id IN (${placeholders})
  `;

  const [rows] = await db.execute(sql, userIds);

  console.log(sql);
  console.log(userIds);
  return rows;
}

function groupByTelegramId(rows) {
  return rows.reduce((acc, row) => {
    if (!acc[row.telegram_id]) {
      acc[row.telegram_id] = [];
    }
    acc[row.telegram_id].push(row);
    return acc;
  }, {});
}

function buildMessage(reminders) {
  let msg = `🔔 *Reminder Kamu*\n\n`;

  reminders.forEach((r, i) => {
    msg += `${i + 1}. ${r.task_description}\n`;
    msg += `📌 target: ${r.target}\n\n`;
  });


  msg += "\n Update Progress?"

  return msg;
}

module.exports = {
  checkReminderService,
  checkDataCheckpointTime,
  checkIsLastReminder,
  filterReminderWithProgressLessThanTarget,
  getUsersInReminderWindow,
  getRemindersByUsers,
  groupByTelegramId,
  buildMessage
};