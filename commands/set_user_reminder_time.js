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
    const context = ctx.state.userContext;

    // Validate time format HH:MM, HH.MM, or HH MM
    let checkPointTime = checkPointTimeRaw; // asumsi input user ada di variabel ini

    // Replace dot (.) or space ( ) with colon (:)
    checkPointTime = checkPointTime.replace(/[. ]/, ':');

    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(checkPointTime)) {
    return ctx.reply(
        "❌ Format Waktu Invalid.\n\n" +
        "Gunakan format 24-hour dengan pemisah:\n" +
        "• <code>HH:MM</code> (titik dua)\n" +
        "• <code>HH.MM</code> (titik)\n" +
        "• <code>HH MM</code> (spasi)\n\n" +
        "Contoh: <code>14:30</code>, <code>14.30</code>, atau <code>14 30</code>\n\n" +
        "Coba lagi:",
        { parse_mode: "HTML" }
    );
    }

    try{
    // proses update
    await userService.updateTimeReminder(telegram_id, checkPointTime);
    
    return ctx.reply(`Berhasil set Reminder Time ${checkPointTime}`);
    }catch(error){
        return ctx.reply(`Gagal set Reminder Time. error  ${error.message}`);
        
    }

    await stateService.clearState(telegram_id);

}

module.exports = {

    settingReminderMenu,
    processUserInput,
}