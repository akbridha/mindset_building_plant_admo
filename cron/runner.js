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
      console.log(new Date().toLocaleString());
      return;
    }
    
    for (const reminder of allScheduleInRange) {

      // sendM
      console.log({
        telegram_id: reminder.telegram_id,
        checkpoint_time: reminder.checkpoint_time,
        task_id: reminder.task_id,
        task_description: reminder.task_description,
      });

      const decoratedReminder = `⏰ *Reminder:*\n${reminder.task_description}\n\nTask ID: ${reminder.task_id}\nCheckpoint Time: ${new Date(reminder.checkpoint_time).toLocaleString()}\nApakah Task Dikerjakan?`;
      const inlineKeyboard = {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ dikerjakan", callback_data: `task_done:${reminder.task_id}` }],
            [{ text: "❌ tidak dikerjakan", callback_data: `task_miss:${reminder.task_id}` }]
          ]
        }
      }
          await bot.api.sendMessage( reminder.telegram_id, decoratedReminder, inlineKeyboard);
          await stateService.setState(reminder.telegram_id, "awaiting_checkpoint_response", { });
            console.log("State set to awaiting_checkpoint_response");
    }
  // run every minute
    // await checkReminderService();
  }, 60 * 1000);


}

module.exports = {
  startCron,
};