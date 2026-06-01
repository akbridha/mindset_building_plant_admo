const { getTeksBalasan } = require("../services/textService");
const stateService = require("../services/stateService");

module.exports = async (ctx) => {
  try {
    const telegram_id = ctx.state.telegram_id;
    const isAdmin = ctx.state.isAdmin;

    // Only admin can use /start (without reference code)
    if (!isAdmin) {
      return ctx.reply(
        "Gunakan /start_[REFERENCE_CODE] yang diberikan untuk memulai.\n" +
        "Contoh: /start_A4BIJDDIF4XC123"
      );
    }

    // Initialize admin in database (without reference_code, preserves context)
    await stateService.setStateOnly(telegram_id, null);

    // Show main menu
    ctx.reply(getTeksBalasan(), {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Daftar Task", callback_data: "list_task" }],

          [{ text: "🗝️ Generate Reference Code", callback_data: "generate_key" }],
          // [{ text: "⛑️ Belajar Contoh Get-Users", callback_data: "list_user" }]
        ]
      }
    });
  } catch (error) {
    console.error("Error in start command:", error);
    return ctx.reply("❌ Error starting bot. Please try again.");
  }
};