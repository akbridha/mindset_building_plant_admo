const { db } = require("../db");

/**
 * Command /followup
 * Menampilkan semua laporan yang sudah disetujui (status 'follow_up')
 * Hanya menampilkan LAP ID dan isi laporan
 */
async function listFollowupCommand(ctx) {
  try {
    // Cek izin: hanya team member atau super user
    if (!ctx.state.isTeamMember && !ctx.state.isSuperUser) {
      return ctx.reply("❌ Maaf, hanya untuk anggota tim.");
    }

    // Ambil laporan dengan status follow_up
    const [reports] = await db.execute(
      `SELECT lapor_pak_id, message_text 
       FROM laporan 
       WHERE status = 'follow_up' 
       ORDER BY created_at DESC`
    );

    if (reports.length === 0) {
      return ctx.reply("📭 Belum ada laporan yang perlu ditindaklanjuti.");
    }

    // Format pesan sederhana
    let message = "📋 *DAFTAR LAPORAN*\n\n";
    
    for (const report of reports) {
      message += `🔹 *${report.lapor_pak_id}*\n`;
      message += `${report.message_text}\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    }

    await ctx.reply(message, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("Error in listFollowupCommand:", error);
    await ctx.reply("❌ Gagal mengambil data laporan.");
  }
}

module.exports = { listFollowupCommand };