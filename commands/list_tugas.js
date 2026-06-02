const laporanService = require("../services/laporanService");

/**
 * Handler for /listtugas command - show reports where user is PIC
 * Shows pending updates that need approval
 */

async function listTugasCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is team member
    if (!ctx.state.isTeamMember) {
      return ctx.reply(
        "❌ Anda bukan anggota tim Follow-up.\n\n" +
        "Hanya anggota tim yang dapat menggunakan perintah ini."
      );
    }

    // Get reports where user is PIC
    const reports = await laporanService.getReportsByPIC(telegram_id);

    if (reports.length === 0) {
      return ctx.reply(
        "<b>📋 Tugas Saya (PIC)</b>\n\n" +
        "Anda belum ditunjuk sebagai PIC untuk laporan manapun.",
        { parse_mode: "HTML" }
      );
    }

    // Format report list
    let message =
      "<b>📋 Tugas Saya (PIC)</b>\n\n" +
      `<i>Anda adalah PIC untuk ${reports.length} laporan</i>\n\n`;

    const buttons = [];

    reports.forEach((report) => {
      // Status badge
      let statusIcon = "";
      switch (report.status) {
        case "follow_up":
          statusIcon = "🔄";
          break;
        case "closed":
          statusIcon = "✅";
          break;
        default:
          statusIcon = "❓";
      }

      // Add update count indicator
      const pendingStr =
        report.pending_updates > 0
          ? ` (${report.pending_updates} pending)`
          : "";

      message +=
        `${statusIcon} <b>${report.lapor_pak_id}</b>${pendingStr}\n` +
        `${report.message_text.substring(0, 50)}...\n` +
        `<i>Dibuat: ${new Date(report.created_at).toLocaleString(
          "id-ID"
        )}</i>\n\n`;

      // Add button
      buttons.push([
        {
          text: `${statusIcon} ${report.lapor_pak_id}${pendingStr ? " 🔴" : ""}`,
          callback_data: `detail_pic_${report.id}`,
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
    console.error("Error in listTugasCommand:", error);
    return ctx.reply("❌ Error mengambil data tugas. Silakan coba lagi.");
  }
}

module.exports = {
  listTugasCommand,
};
