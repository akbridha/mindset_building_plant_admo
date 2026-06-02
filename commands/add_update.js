const laporanService = require("../services/laporanService");
const stateService = require("../services/stateService");

/**
 * Handler for /update command - add update to report
 * Format: /update LAP-00001 <update text>
 * or multi-step form if just /update
 */

async function addUpdateCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is team member
    if (!ctx.state.isTeamMember) {
      return ctx.reply(
        "❌ Anda bukan anggota tim Follow-up.\n\n" +
        "Hanya anggota tim (SH/PSD) yang dapat menambah update."
      );
    }

    // Ask for report ID
    await stateService.setStateOnly(telegram_id, "awaiting_update_laporan_id");

    return ctx.reply(
      "<b>📝 Tambah Update</b>\n\n" +
      "Masukkan ID Laporan (contoh: LAP-00001):",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in addUpdateCommand:", error);
    return ctx.reply("❌ Error memproses perintah. Silakan coba lagi.");
  }
}

/**
 * Step 2 - Get laporan ID and validate
 */
async function updateStep2(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const lapor_pak_id = userInput.trim().toUpperCase();

    // Validate format
    if (!/^LAP-\d{5}$/.test(lapor_pak_id)) {
      return ctx.reply(
        "⚠️ Format ID tidak valid.\n\n" +
        "Format harus: LAP-00001\n\n" +
        "Silakan coba lagi:"
      );
    }

    // Check if report exists and has PIC
    const reports = await laporanService.getActiveReports();
    const report = reports.find((r) => r.lapor_pak_id === lapor_pak_id);

    if (!report) {
      return ctx.reply(
        "❌ Laporan tidak ditemukan atau sudah ditutup.\n\n" +
        "Silakan coba dengan ID laporan lain."
      );
    }

    if (!report.pic_id) {
      return ctx.reply(
        "⚠️ Laporan belum memiliki PIC.\n\n" +
        "PIC harus ditunjuk terlebih dahulu sebelum menambah update.\n" +
        "Hubungi tim untuk menunjuk PIC."
      );
    }

    // Set state for update content input
    await stateService.setState(telegram_id, "awaiting_update_content", {
      lapor_pak_id: lapor_pak_id,
      pic_id: report.pic_id,
    });

    return ctx.reply(
      `<b>📝 Tambah Update untuk ${lapor_pak_id}</b>\n\n` +
      `Silakan ketik isi update/perkembangan laporan:`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in updateStep2:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.reply("❌ Error memproses request. Silakan coba lagi.");
  }
}

/**
 * Step 3 - Process update content
 */
async function updateStep3(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const lapor_pak_id = ctx.state.userContext.lapor_pak_id;
    const pic_id = ctx.state.userContext.pic_id;

    // Validate input
    if (!userInput || userInput.trim().length < 5) {
      return ctx.reply(
        "⚠️ Update terlalu pendek.\n\n" +
        "Minimal 5 karakter. Silakan coba lagi:"
      );
    }

    if (userInput.trim().length > 500) {
      return ctx.reply(
        "⚠️ Update terlalu panjang.\n\n" +
        "Maksimal 500 karakter. Silakan coba lagi:"
      );
    }

    // Add update to database (pending PIC approval)
    const update_id = await laporanService.addUpdate(
      lapor_pak_id,
      telegram_id,
      pic_id,
      userInput.trim()
    );

    // Clear state
    await stateService.clearState(telegram_id);

    // Send success message
    return ctx.reply(
      `<b>✅ Update Diterima</b>\n\n` +
      `Update untuk ${lapor_pak_id} telah disimpan.\n\n` +
      `Update menunggu persetujuan dari PIC yang ditunjuk.\n\n` +
      `Anda akan menerima notifikasi ketika disetujui atau ditolak.`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in updateStep3:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.reply("❌ Error menyimpan update. Silakan coba lagi.");
  }
}

module.exports = {
  addUpdateCommand,
  updateStep2,
  updateStep3,
};
