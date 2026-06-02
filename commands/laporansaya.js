const laporanService = require("../services/laporanService");
const stateService = require("../services/stateService");
const { encryptTelegramId } = require("../services/encryptionService");

/**
 * Handler for /laporansaya command - list reporter's reports
 * Shows all reports with status badges and action buttons
 */

async function laporansayaCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Get all reports for this reporter
    const reports = await laporanService.getReporterReports(telegram_id);

    if (reports.length === 0) {
      return ctx.reply(
        "<b>📋 Laporan Saya</b>\n\n" +
        "Anda belum memiliki laporan.\n\n" +
        "Ketik /lapor untuk membuat laporan baru.",
        { parse_mode: "HTML" }
      );
    }

    // Format report list
    let message =
      "<b>📋 Laporan Saya</b>\n\n" +
      "<i>Klik laporan untuk melihat detail:</i>\n\n";

    const buttons = [];

    reports.forEach((report, index) => {
      // Status badge
      let statusIcon = "";
      let statusText = "";

      switch (report.status) {
        case "pending_approval":
          statusIcon = "⏳";
          statusText = "Menunggu Persetujuan";
          break;
        case "rejected":
          statusIcon = "❌";
          statusText = "Ditolak";
          break;
        case "follow_up":
          statusIcon = "🔄";
          statusText = "Follow-up";
          break;
        case "closed":
          statusIcon = "✅";
          statusText = "Selesai";
          break;
        default:
          statusIcon = "❓";
          statusText = report.status;
      }

      // Add to message
      message +=
        `${statusIcon} <b>${report.lapor_pak_id}</b>\n` +
        `${report.message_text.substring(0, 50)}...\n` +
        `<i>${statusText}</i>\n\n`;

      // Add button
      buttons.push([
        {
          text: `${statusIcon} ${report.lapor_pak_id}`,
          callback_data: `detail_laporan_${report.id}`,
        },
      ]);
    });

    // Send with inline buttons
    return ctx.reply(message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  } catch (error) {
    console.error("Error in laporansayaCommand:", error);
    return ctx.reply("❌ Error mengambil data laporan. Silakan coba lagi.");
  }
}

module.exports = {
  laporansayaCommand,
};
