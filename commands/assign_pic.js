const laporanService = require("../services/laporanService");
const teamService = require("../services/teamService");
const stateService = require("../services/stateService");

/**
 * Handler for /pic command - assign PIC to a report
 * Format: /pic LAP-00001 @username
 * or via callback from list_reports
 */

async function assignPICCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is team member
    if (!ctx.state.isTeamMember) {
      return ctx.reply(
        "❌ Anda bukan anggota tim Follow-up.\n\n" +
        "Hanya anggota tim (SH/PSD) yang dapat menunjuk PIC."
      );
    }

    // Ask for report ID first
    await stateService.setStateOnly(
      telegram_id,
      "awaiting_pic_laporan_id"
    );

    return ctx.reply(
      "<b>👤 Tunjuk PIC</b>\n\n" +
      "Masukkan ID Laporan (contoh: LAP-00001):",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in assignPICCommand:", error);
    return ctx.reply("❌ Error memproses perintah. Silakan coba lagi.");
  }
}

/**
 * Step 2 - Get laporan ID
 */
async function assignPICStep2(ctx, userInput) {
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

    // Check if report exists
    const reports = await laporanService.getActiveReports();
    const report = reports.find((r) => r.lapor_pak_id === lapor_pak_id);

    if (!report) {
      return ctx.reply(
        "❌ Laporan tidak ditemukan atau sudah ditutup.\n\n" +
        "Silakan coba dengan ID laporan lain."
      );
    }

    // Get list of team members
    const teamMembers = await teamService.listTeamMembers();

    if (teamMembers.length === 0) {
      return ctx.reply("❌ Tidak ada anggota tim yang tersedia.");
    }

    // Show team members as buttons
    await stateService.setState(telegram_id, "awaiting_pic_selection", {
      lapor_pak_id: lapor_pak_id,
    });

    const buttons = teamMembers.map((member) => [
      {
        text: `${member.username || `User ${member.user_id}`} (${member.role})`,
        callback_data: `select_pic_${lapor_pak_id}_${member.user_id}`,
      },
    ]);

    return ctx.reply(
      `<b>👤 Pilih PIC untuk ${lapor_pak_id}</b>\n\n` +
      `Silakan pilih anggota tim yang akan menjadi PIC:`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: buttons,
        },
      }
    );
  } catch (error) {
    console.error("Error in assignPICStep2:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.reply("❌ Error memproses request. Silakan coba lagi.");
  }
}

/**
 * Callback handler for PIC selection
 */
async function handleSelectPICCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^select_pic_(.+)_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const lapor_pak_id = match[1];
    const pic_user_id = parseInt(match[2]);
    const telegram_id = ctx.state.telegram_id;

    // Assign PIC
    await laporanService.assignPIC(lapor_pak_id, pic_user_id);

    // Get PIC username for notification
    const teamMembers = await teamService.listTeamMembers();
    const picMember = teamMembers.find((m) => m.user_id === pic_user_id);

    await ctx.editMessageText(
      `<b>✅ PIC Ditunjuk</b>\n\n` +
      `Laporan: ${lapor_pak_id}\n` +
      `PIC: ${picMember?.username || `User ${pic_user_id}`}\n\n` +
      `PIC telah diberitahu tentang penunjukan ini.`,
      { parse_mode: "HTML" }
    );

    await stateService.clearState(telegram_id);
    await ctx.answerCallbackQuery("✅ PIC berhasil ditunjuk");
  } catch (error) {
    console.error("Error in handleSelectPICCallback:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.answerCallbackQuery("❌ Error menunjuk PIC");
  }
}

module.exports = {
  assignPICCommand,
  assignPICStep2,
  handleSelectPICCallback,
};
