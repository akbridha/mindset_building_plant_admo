const { getTeksBalasan } = require("../services/textService");

module.exports = async (ctx) => {

    ctx.reply(getTeksBalasan(), {
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [
            [{ text: "📋 Daftar Task", callback_data: "list_task" }],
            [{ text: "➕ Tambah Task", callback_data: "add_task" }],
            [{ text: "🗑️ Hapus Task", callback_data: "remove_task" }],
            [{ text: "⛑️ Belajar Contoh Get-Users", callback_data: "list_user" }]

        ]
        // keyboard: [
        // ["📋 Laporan"],
        // ["📊 Progress", "⚙️ Checkpoint"],
        // ],
        // resize_keyboard: true,
        
    },
    });
};