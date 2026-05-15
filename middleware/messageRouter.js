const { addTaskStep2, addTaskStep3, addTaskStep4 } = require("../commands/add_task");
const { removeTaskStep2, removeTaskConfirm } = require("../commands/remove_task");

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
        "ℹ️ I don't understand that command.\n\n" +
        "Try /start to see available commands."
      );
    }

    // Route based on current state
    switch (userState) {
      case "awaiting_task_description":
        return addTaskStep2(ctx, userInput);

      case "awaiting_checkpoint_time":
        return addTaskStep3(ctx, userInput);

      case "awaiting_target":
        return addTaskStep4(ctx, userInput);

      case "awaiting_task_selection_for_removal":
        return removeTaskStep2(ctx, userInput);

      default:
        // Unknown state - reset and inform user
        return ctx.reply(
          "⚠️ Unknown state. Please try /cancel and start over."
        );
    }
  } catch (error) {
    console.error("Error in messageRouter:", error);
    return ctx.reply(
      "❌ An error occurred. Please try /cancel and start over."
    );
  }
}

module.exports = messageRouter;
