const { db } = require("../db");

async function checkReminderService(timeRange = 5) {
  try {
    console.log("Checking reminders...");

    const [rows] = await db.execute(`
      SELECT
        telegram_id,
        checkpoint_time,
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

module.exports = {
  checkReminderService,
  checkDataCheckpointTime
};