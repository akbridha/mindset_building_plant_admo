const laporanService = require("../services/laporanService");

/**
 * Handler for /summary command - show statistics for Super User
 */

async function summaryCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is Super User
    if (!ctx.state.isSuperUser) {
      return ctx.reply(
        "❌ Hanya Super User yang dapat melihat summary.\n\n" +
        "Hubungi administrator untuk akses."
      );
    }

    // Get summary statistics
    const summary = await laporanService.getSummary();

    // Format message
    let message = `<b>📊 Ringkasan Laporan</b>\n\n`;

    message += `<b>Total Laporan:</b> ${summary.total}\n\n`;

    message += `<b>Berdasarkan Status:</b>\n`;
    message += `🔄 Follow-up: ${summary.follow_up}\n`;
    message += `✅ Selesai: ${summary.closed}\n`;
    message += `⏳ Menunggu: ${summary.pending_approval}\n`;
    message += `❌ Ditolak: ${summary.rejected}\n\n`;

    // Calculate percentage
    if (summary.total > 0) {
      const closedPercentage = Math.round((summary.closed / summary.total) * 100);
      message += `<b>Tingkat Penyelesaian:</b> ${closedPercentage}%\n`;
    }

    message +=
      `\n<i>Update otomatis. Gunakan /listall untuk detail lengkap.</i>`;

    return ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error in summaryCommand:", error);
    return ctx.reply("❌ Error mengambil data summary. Silakan coba lagi.");
  }
}

module.exports = {
  summaryCommand,
};
