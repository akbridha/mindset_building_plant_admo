const stateService = require("../services/stateService");

/**
 * /cancel command handler
 * Cancels any active task flow and resets user state
 */
async function cancelCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const currentState = ctx.state.userState;

    // Check if there's an active state
    if (currentState === null) {
      return ctx.reply(
        "ℹ️ No active task flow to cancel.\n\n" +
        "Use /add_task or /remove_task to start a flow."
      );
    }

    // Clear state
    await stateService.clearState(telegram_id);

    return ctx.reply(
      "❌ <b>Cancelled.</b>\n\n" +
      "All changes discarded. Back to normal mode.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 View Tasks", callback_data: "list_task" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in cancelCommand:", error);
    return ctx.reply("❌ Error cancelling flow. Please try again.");
  }
}

module.exports = cancelCommand;
