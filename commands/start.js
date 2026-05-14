const { getTeksBalasan } = require("../services/textService");

module.exports = async (ctx) => {

    ctx.reply(getTeksBalasan(), {
    parse_mode: "HTML",
    reply_markup: {
        keyboard: [
        ["📋 Laporan"],
        ["📊 Progress", "⚙️ Checkpoint"],
        ],
        resize_keyboard: true,
    },
    });
};