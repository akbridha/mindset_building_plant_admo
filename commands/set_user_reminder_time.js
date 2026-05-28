const userService = require("../services/userService");
const stateService = require("../services/stateService")



async function settingReminderMenu(ctx) {
    const telegram_id = ctx.state.telegram_id;

    try {
        await stateService.assertStateIsNull(telegram_id);
        // Jika sukses (tidak throw), lanjut ke sini
        await stateService.setState(telegram_id, "awaiting_reminder_time");
        return ctx.reply("Masukkan jam untuk Reminder Anda", {});
        
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

async function processUserInput(ctx) {
    const telegram_id = ctx.state.telegram_id;

}

module.exports = {

    settingReminderMenu,
    processUserInput,
}