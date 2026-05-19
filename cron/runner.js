const {
  checkReminderService,
  checkDataCheckpointTime
} = require("../services/check_reminder_service");
const { Bot } = require("grammy");

const stateService = require("../services/stateService");

console

async function startCron() {
  const bot = new Bot((process.env.BOT_TOKEN));
  console.log("Cron started");

  const timeRange = 1; // in minutes

  // run immediately once
  
  
  // async function processReminders(range) {
  // }



  
  
  
  // await processReminders(timeRange);
  
  // const reminderInRange =    checkDataCheckpointTime(allScheduleInRange);
  
  
  setInterval(async () => {
    
    const allScheduleInRange =   await checkReminderService(timeRange);
    if(!allScheduleInRange || allScheduleInRange.length === 0) {
      console.log("No reminders to process.");
      return;
    }
    
    for (const reminder of allScheduleInRange) {

      // sendM
      console.log({
        telegram_id: reminder.telegram_id,
        checkpoint_time: reminder.checkpoint_time,
        task_description: reminder.task_description,
      });
          await bot.api.sendMessage( reminder.telegram_id,reminder.task_description);
          await stateService.setState(reminder.telegram_id, "awaiting_checkpoint_response", { });
    }
  // run every minute
    // await checkReminderService();
  }, 60 * 1000);


}

module.exports = {
  startCron,
};