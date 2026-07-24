const laporanService = require("../services/laporanService");

/**
 * Handler for show_listall callback - list all reports from laporan table
 * Shows all reports for super users / team members
 */
async function listAllReportsCommand(ctx) {
  try {
    if (!ctx.state.isSuperUser && !ctx.state.isTeamMember) {
      return ctx.reply(
        "❌ Maaf, hanya pengguna yang memiliki akses tim yang dapat melihat daftar laporan ini."
      );
    }

    const reports = await laporanService.getAllReports();

    if (!reports || reports.length === 0) {
      return ctx.reply("📭 Belum ada data laporan di tabel laporan.");
    }

    let message = "<b>📋 Semua Laporan</b>\n\n";

    reports.forEach((report, index) => {
      message += `${index + 1}. <b>${report.lapor_pak_id}</b>\n`;
      message += `<i>Status:</i> ${report.status || "-"}\n`;
      message += `<i>Reporter ID:</i> ${report.reporter_id || "-"}\n`;
      message += `<i>Isi:</i> ${report.message_text || "-"}\n`;
      message += `<i>Dibuat:</i> ${new Date(report.created_at).toLocaleString("id-ID")}\n`;
      message += `<i>Update:</i> ${new Date(report.updated_at).toLocaleString("id-ID")}\n\n`;
    });

    return ctx.reply(message, { parse_mode: "HTML" });
  } catch (error) {
    console.error("Error in listAllReportsCommand:", error);
    return ctx.reply("❌ Gagal mengambil data laporan dari tabel laporan.");
  }
}

module.exports = {
  listAllReportsCommand,
};
