const {
  checkReminderService,
  checkDataCheckpointTime
} = require("../services/check_reminder_service");
async function startCron() {
  console.log("Cron started");

  const timeRange = 1; // in minutes

  // run immediately once
  const allScheduleInRange =   await checkReminderService(timeRange);

  const reminderInRange =    checkDataCheckpointTime(allScheduleInRange);

  console.log("reminderInRange", reminderInRange);




  // run every minute
  setInterval(async () => {
    await checkReminderService();
//   }, 60 * 1000);
  }, 3 * 1000);
}

module.exports = {
  startCron,
};