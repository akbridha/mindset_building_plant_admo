const { getTeksBalasan } = require("../services/textService");
const stateService = require("../services/stateService");
const {isUserRegistered} = require("../services/userService");

module.exports = async (ctx) => {
  try {
    const telegram_id = ctx.state.telegram_id;
    const isAdmin = ctx.state.isAdmin;
    const isRegistered = await isUserRegistered(ctx.state.telegram_id);

    if (!isRegistered) {
      return ctx.reply("❌ Anda belum terdaftar. Silakan hubungi admin untuk mendapatkan akses.");
    }


    var inlineKeyboard = {
        inline_keyboard: [
          [{ text: "📋 Daftar Task", callback_data: "list_task" }],

          // [{ text: "🗝️ Generate Reference Code", callback_data: "generate_key" }],
          // [{ text: "⛑️ Belajar Contoh Get-Users", callback_data: "list_user" }]
        ]
      };

    // Only admin can use /start (without reference code)
    if (isAdmin) {
      inlineKeyboard.inline_keyboard.push([{ text: "🗝️ Generate Reference Code", callback_data: "generate_key" }]);
    }

    // Initialize admin in database (without reference_code, preserves context)
    await stateService.setStateOnly(telegram_id, null);

    // Show main menu
    ctx.reply(getTeksBalasan(), {
      parse_mode: "HTML",
      reply_markup: inlineKeyboard
    });
  } catch (error) {
    console.error("Error in start command:", error);
    return ctx.reply("❌ Error starting bot. Please try again.");
  }
};