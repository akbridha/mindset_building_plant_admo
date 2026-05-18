const { addTaskStep2, addTaskStep3, addTaskStep4bInterval, addTaskStep5 } = require("../commands/add_task");
const { removeTaskStep2, removeTaskConfirm } = require("../commands/remove_task");
const { setDuration,// fungsi urutan 2  
        setManpower // fungsi urutan 3
      } = require("../commands/generate_ref");

/**
 * Message router middleware
 * Routes text messages to appropriate step handlers based on user's current state
 * Register with: bot.on("message:text", messageRouter)
 */
async function messageRouter(ctx) {
  try {
    const userState = ctx.state.userState;
    const userInput = ctx.message.text || "";

    // If no state, user is idle - don't know what to do with message
    if (userState === null) {
      return ctx.reply(
        "ℹ️ Perintah/Pesan tidak dikenal.\n\n" +
        "Coba /start untuk melihat perintah yang tersedia."
      );
    }

    // Route based on current state
    switch (userState) {
      case "awaiting_task_description":
        return addTaskStep2(ctx, userInput);

      case "awaiting_checkpoint_time":
        return addTaskStep3(ctx, userInput);

      case "awaiting_interval_custom":
        return addTaskStep4bInterval(ctx, userInput);

      case "awaiting_target":
        return addTaskStep5(ctx, userInput);

      case "awaiting_task_selection_for_removal":
        return removeTaskStep2(ctx, userInput);

      case "awaiting_task_selection_for_removal":
        return removeTaskStep2(ctx, userInput);

        case "awaiting_duration_refcode":
          return setDuration(ctx, userInput);

        case "awaiting_total_manpower_refcode":
          return setManpower(ctx, userInput);

      default:
        // Unknown state - reset and inform user
        return ctx.reply(
          "⚠️ State tidak dikenal. Silakan coba /cancel dan mulai lagi."
        );
    }
  } catch (error) {
    console.error("Error in messageRouter:", error);
    return ctx.reply(
      "❌ Terjadi kesalahan. Silakan coba /cancel dan mulai lagi."
    );
  }
}

module.exports = messageRouter;
