const { getTeksBalasan } = require("../services/textService");

module.exports = async (ctx) => {

    ctx.reply(getTeksBalasan(), {
    parse_mode: "HTML",
    reply_markup: {
        inline_keyboard: [
                    [{ text: "➕ Add Task", callback_data: "add_task" }],
          [{ text: "🗑️ Remove Task", callback_data: "remove_task" }]

        ]
        // keyboard: [
        // ["📋 Laporan"],
        // ["📊 Progress", "⚙️ Checkpoint"],
        // ],
        // resize_keyboard: true,
        
    },
    });
};