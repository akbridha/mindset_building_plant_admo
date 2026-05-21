const taskUpdaterService = require("../services/progressService");
const stateService = require("../services/stateService");



async function createProgress(ctx, userInput) {

  console.log(ctx.state.telegram_id, userInput);

  const userState = await stateService.getState(ctx.state.telegram_id);

  const isUserResponseAwaited = userState.current_state === "awaiting_checkpoint_response" ? true : false; 

  var textBalasan = "";
  console.log("Is user response awaited?", isUserResponseAwaited);
  // console.log("Current user state:", userState.current_state);


  // cegah aksi diluar jam permintaan checkpoint
  if(!isUserResponseAwaited){
    ctx.reply("Anda tidak sedang dalam proses Perekaman Checkpoint");
    return true;
  }
  try {
    await taskUpdaterService.progressCreate(ctx, userInput);
    textBalasan = "✅ Progress recorded. Terima kasih atas update-nya!";
  } catch (error) {
    textBalasan = "❌ Error in update tasks Command. Mohon Coba lagi.";
    console.error("Error in updateTaskCommand:", error);
  }



  // console.log("Clearing state for user:", ctx.state.telegram_id);
  return ctx.reply(textBalasan);
  await stateService.clearState(ctx.state.telegram_id);


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