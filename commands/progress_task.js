const taskUpdaterService = require("../services/taskService");



async function createProgress(ctx, userInput) {
  try {
    await taskUpdaterService.progressCreate(ctx, userInput);
    return ctx.reply("✅ Progress recorded. Terima kasih atas update-nya!");

  } catch (error) {
    console.error("Error in updateTaskCommand:", error);
    return ctx.reply("❌ Error in update tasks Command. Mohon Coba lagi.");
  }
}

module.exports = createProgress;


    // return ctx.reply(
    //   "✅ Task description saved: <b>" + taskDescription.trim() + "</b>\n\n" +
    //   "⏰ <b>Jam berapa reminder pertama kali dikirimkan?</b>\n" +
    //   "Kirim dalam format <code>HH:MM</code> (24-hour)\n\n" +
    //   "Contoh: <code>14:30</code> untuk Jam 2:30 sore",
    //   {
    //     parse_mode: "HTML",
    //     reply_markup: {
    //       inline_keyboard: [
    //         [{ text: "❌ Batal", callback_data: "cancel" }]
    //       ]
    //     }
    //   }
    // );