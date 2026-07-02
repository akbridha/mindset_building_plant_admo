const userService = require("../services/userService");
const stateService = require("../services/stateService")



async function settingReminderMenu(ctx) {
    const telegram_id = ctx.state.telegram_id;

    try {
        await stateService.assertStateIsNull(telegram_id);
        // Jika sukses (tidak throw), lanjut ke sini
        await stateService.setState(telegram_id, "awaiting_reminder_time");
        return ctx.reply("Masukkan jam untuk Reminder Anda",  {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "Pagi", callback_data: "set_reminder_pagi" },{ text: "Siang", callback_data: "set_reminder_siang" },{ text: "Malam", callback_data: "set_reminder_malam" }],
            [{ text: "❌ Batal", callback_data: "cancel" }]
          ]
        }
      });
        
    } catch (error) {
        // Tangkap error dari assertStateIsNull
        if (error.message.includes("USER_IN_ACTIVE_STATE")) {
            return ctx.reply(
                "⚠️ Anda tengah berada di dalam suatu alur fitur.\n\n" +
                "Gunakan /cancel untuk memulai ulang, atau selesaikan flow saat ini."
            );
        }
        // Error lain yang tidak terduga
        throw error;
    }
}

async function processUserInput(ctx, checkPointTimeRaw) {
    const telegram_id = ctx.state.telegram_id;
    const currentState = ctx.state.userState;


    if (currentState !== "awaiting_reminder_time") {
      return ctx.reply("❌ Perintah tidak valid. Anda tidak sedang dalam proses untuk mengatur reminder.");
    }
    
    // Validasi format waktu
    let checkPointTime = checkPointTimeRaw.replace(/[. ]/, ':');
    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
    
    if (!timeRegex.test(checkPointTime)) {
        return ctx.reply(
            "❌ Format Waktu Invalid.\n\n" +
            "Gunakan format 24-hour:\n" +
            "• HH:MM (titik dua)\n" +
            "• HH.MM (titik)\n" +
            "• HH MM (spasi)\n\n" +
            "Contoh: 14:30, 14.30, atau 14 30",
            { parse_mode: "HTML"
             }
        );
    }
    
    try {
        await userService.updateTimeReminder(telegram_id, checkPointTime);
        
        await stateService.clearState(telegram_id);
        return ctx.reply(`✅ Berhasil set Reminder Time ${checkPointTime}`);
        
    } catch (error) {
        console.error("Error in processUserInput:", error);
        
        // Jangan clear state, biar user bisa coba lagi
        return ctx.reply(
            `❌ Gagal set Reminder Time.\n\n` +
            `Error: ${error.message}\n\n` +
            `Silakan coba lagi atau hubungi administrator.`
        );
        await stateService.clearState(telegram_id);
    }
}

module.exports = {

    settingReminderMenu,
    processUserInput,
}