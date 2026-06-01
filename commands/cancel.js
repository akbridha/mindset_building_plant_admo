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
        "ℹ️ Tidak ada flow task yang sedang aktif untuk dibatalkan.\n\n" +
        "Gunakan /add_task atau /remove_task untuk memulai flow."
      );
    }

    // Clear state
    await stateService.clearState(telegram_id);

    return ctx.reply(
      "❌ <b>Dibatalkan.</b>\n\n" +
      "Semua perubahan tidak disimpan. kombali ke mode normal.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 Lihat Task", callback_data: "list_task" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in cancelCommand:", error);
    return ctx.reply("❌ Gagal Membatalkan Alur task. Mohon Coba lagi.");
  }
}

module.exports = cancelCommand;
