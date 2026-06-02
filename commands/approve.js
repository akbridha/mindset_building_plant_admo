const laporanService = require("../services/laporanService");

/**
 * Handler for /approve command - show approval queue for Super User
 * Displays pending reports and feedback for approval
 */

async function approveCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is Super User
    if (!ctx.state.isSuperUser) {
      return ctx.reply(
        "❌ Hanya Super User yang dapat menggunakan perintah ini.\n\n" +
        "Hubungi administrator untuk akses."
      );
    }

    // Get pending reports and feedback
    const pendingReports = await laporanService.getPendingApprovalReports();
    const pendingFeedback = await laporanService.getPendingApprovalFeedback();

    if (pendingReports.length === 0 && pendingFeedback.length === 0) {
      return ctx.reply(
        "<b>📬 Antrian Persetujuan</b>\n\n" +
        "Tidak ada item yang menunggu persetujuan.\n\n" +
        "Sistem berjalan dengan lancar! ✅",
        { parse_mode: "HTML" }
      );
    }

    let message = "<b>📬 Antrian Persetujuan</b>\n\n";

    const buttons = [];

    // Show pending reports
    if (pendingReports.length > 0) {
      message += `<b>📋 Laporan Baru (${pendingReports.length})</b>\n\n`;

      pendingReports.forEach((report) => {
        message +=
          `<b>${report.lapor_pak_id}</b>\n` +
          `${report.message_text.substring(0, 60)}...\n\n`;

        buttons.push([
          {
            text: `✅ Setujui ${report.lapor_pak_id}`,
            callback_data: `approve_report_${report.id}`,
          },
          {
            text: `❌ Tolak`,
            callback_data: `reject_report_${report.id}`,
          },
        ]);
      });
    }

    // Show pending feedback
    if (pendingFeedback.length > 0) {
      message += `\n<b>💬 Feedback (${pendingFeedback.length})</b>\n\n`;

      pendingFeedback.forEach((feedback) => {
        message +=
          `<b>${feedback.lapor_pak_id}</b>\n` +
          `Laporan: ${feedback.report_text.substring(0, 40)}...\n` +
          `Feedback: ${feedback.feedback_text.substring(0, 40)}...\n\n`;

        buttons.push([
          {
            text: `✅ Setujui ${feedback.lapor_pak_id}`,
            callback_data: `approve_feedback_${feedback.id}`,
          },
          {
            text: `❌ Tolak`,
            callback_data: `reject_feedback_${feedback.id}`,
          },
        ]);
      });
    }

    // Send with inline buttons
    return ctx.reply(message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });
  } catch (error) {
    console.error("Error in approveCommand:", error);
    return ctx.reply("❌ Error memuat antrian persetujuan. Silakan coba lagi.");
  }
}

module.exports = {
  approveCommand,
};
