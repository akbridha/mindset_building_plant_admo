const laporanService = require("../services/laporanService");
const stateService = require("../services/stateService");

/**
 * Handler for /lapor command - initiate report creation
 * Multi-step flow:
 * Step 1: Ask for report description
 * Step 2: Store report and return LAP-ID
 */

async function laporCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user already has an active state
    if (ctx.state.userState !== null) {
      return ctx.reply(
        "⚠️ Anda masih dalam proses lain.\n\n" +
        "Gunakan /cancel untuk membatalkan terlebih dahulu."
      );
    }

    // Set initial state
    await stateService.setStateOnly(telegram_id, "awaiting_laporan_description");

    // Ask for report description
    return ctx.reply(
      "<b>📋 Buat Laporan Baru</b>\n\n" +
      "Silakan deskripsikan masalah atau laporan Anda:\n\n" +
      "<i>Contoh: Lampu jalan di depan workshop mati, rawan insiden.</i>\n\n" +
      "Ketik pesan Anda di bawah:",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in laporCommand:", error);
    return ctx.reply("❌ Error memulai laporan. Silakan coba lagi.");
  }
}

/**
 * Handler for step 2 - process report description input
 * Store report to database with pending_approval status
 */
async function laporStep2(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Validate input
    if (!userInput || userInput.trim().length < 10) {
      return ctx.reply(
        "⚠️ Laporan terlalu pendek.\n\n" +
        "Minimal 10 karakter. Silakan coba lagi:"
      );
    }

    if (userInput.trim().length > 1000) {
      return ctx.reply(
        "⚠️ Laporan terlalu panjang.\n\n" +
        "Maksimal 1000 karakter. Silakan coba lagi:"
      );
    }

    // Create report in database
    const lapor_pak_id = await laporanService.createReport(
      telegram_id,
      userInput.trim()
    );

    // Clear state
    await stateService.clearState(telegram_id);

    // Send success response with LAP-ID
    return ctx.reply(
      `<b>✅ Laporan Diterima</b>\n\n` +
      `ID Lapor Pak: <code>${lapor_pak_id}</code>\n\n` +
      `Status: <b>Menunggu Persetujuan</b>\n\n` +
      `Laporan Anda akan ditinjau oleh tim. Anda akan menerima notifikasi ` +
      `ketika laporan disetujui atau perlu ditambah informasi.\n\n` +
      `Ketik /laporansaya untuk melihat daftar laporan Anda.`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in laporStep2:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.reply("❌ Error menyimpan laporan. Silakan coba lagi.");
  }
}

module.exports = {
  laporCommand,
  laporStep2,
};
