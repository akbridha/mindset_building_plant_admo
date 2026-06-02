const laporanService = require("../services/laporanService");
const stateService = require("../services/stateService");

/**
 * Callback handler for viewing report detail
 * Shows full report with updates and feedback history
 * Buttons for: Add Feedback, Close Report
 */

async function handleDetailLaporanCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^detail_laporan_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const laporan_id = match[1];
    const telegram_id = ctx.state.telegram_id;

    // Get report details - need to get lapor_pak_id first
    const reports = await laporanService.getReporterReports(telegram_id);
    const report = reports.find((r) => r.id == laporan_id);

    if (!report) {
      return ctx.answerCallbackQuery(
        "❌ Laporan tidak ditemukan atau Anda tidak punya akses"
      );
    }

    // Get full detail with updates and feedback
    const detail = await laporanService.getReportDetail(
      report.lapor_pak_id,
      telegram_id
    );

    // Format message
    let message = `<b>📋 Detail Laporan</b>\n\n`;
    message += `<b>ID:</b> ${detail.lapor_pak_id}\n`;
    message += `<b>Status:</b> ${getStatusText(detail.status)}\n`;
    message += `<b>Dibuat:</b> ${new Date(detail.created_at).toLocaleString(
      "id-ID"
    )}\n\n`;

    message += `<b>Isi Laporan:</b>\n${detail.message_text}\n\n`;

    // Show updates if any
    if (detail.updates && detail.updates.length > 0) {
      message += `<b>📬 Update (${detail.updates.length})</b>\n`;
      detail.updates.forEach((update, i) => {
        message += `\n${i + 1}. ${update.message_text}\n`;
        message += `   <i>${new Date(update.created_at).toLocaleString(
          "id-ID"
        )}</i>\n`;
      });
      message += "\n";
    }

    // Show feedback if any
    if (detail.feedbacks && detail.feedbacks.length > 0) {
      message += `<b>💬 Feedback Anda (${detail.feedbacks.length})</b>\n`;
      detail.feedbacks.forEach((feedback, i) => {
        message += `\n${i + 1}. ${feedback.message_text}\n`;
        message += `   <i>${new Date(feedback.created_at).toLocaleString(
          "id-ID"
        )}</i>\n`;
      });
      message += "\n";
    }

    // Build action buttons based on status
    const buttons = [];

    if (detail.status === "follow_up" || detail.status === "closed") {
      buttons.push([
        {
          text: "📝 Tambah Feedback",
          callback_data: `add_feedback_${detail.lapor_pak_id}`,
        },
      ]);
    }

    if (detail.status !== "closed") {
      buttons.push([
        {
          text: "✅ Selesaikan Laporan",
          callback_data: `close_laporan_${detail.lapor_pak_id}`,
        },
      ]);
    }

    // Back button
    buttons.push([
      {
        text: "⬅️ Kembali",
        callback_data: "back_to_laporansaya",
      },
    ]);

    await ctx.editMessageText(message, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: buttons,
      },
    });

    return ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in handleDetailLaporanCallback:", error);
    return ctx.answerCallbackQuery("❌ Error memuat detail laporan");
  }
}

/**
 * Callback handler for adding feedback
 * Routes to feedback input state
 */
async function handleAddFeedbackCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^add_feedback_(.+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const lapor_pak_id = match[1];
    const telegram_id = ctx.state.telegram_id;

    // Set state for feedback input
    await stateService.setState(telegram_id, "awaiting_feedback_content", {
      lapor_pak_id: lapor_pak_id,
    });

    // Ask for feedback
    await ctx.editMessageText(
      "<b>💬 Tambah Feedback</b>\n\n" +
      "Silakan ketik feedback atau informasi tambahan untuk laporan ini:",
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error in handleAddFeedbackCallback:", error);
    return ctx.answerCallbackQuery("❌ Error memproses request");
  }
}

/**
 * Step handler for feedback input
 * Stores feedback as pending_approval
 */
async function feedbackStep2(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const lapor_pak_id = ctx.state.userContext.lapor_pak_id;

    // Validate input
    if (!userInput || userInput.trim().length < 5) {
      return ctx.reply(
        "⚠️ Feedback terlalu pendek.\n\n" +
        "Minimal 5 karakter. Silakan coba lagi:"
      );
    }

    if (userInput.trim().length > 500) {
      return ctx.reply(
        "⚠️ Feedback terlalu panjang.\n\n" +
        "Maksimal 500 karakter. Silakan coba lagi:"
      );
    }

    // Add feedback to database
    await laporanService.addFeedback(
      lapor_pak_id,
      telegram_id,
      userInput.trim()
    );

    // Clear state
    await stateService.clearState(telegram_id);

    // Send success message
    return ctx.reply(
      `<b>✅ Feedback Diterima</b>\n\n` +
      `Feedback Anda telah disimpan dan menunggu persetujuan supervisor.\n\n` +
      `Anda akan menerima notifikasi ketika feedback disetujui dan diteruskan ke tim.`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in feedbackStep2:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.reply("❌ Error menyimpan feedback. Silakan coba lagi.");
  }
}

/**
 * Callback handler for closing report
 */
async function handleCloseReportCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^close_laporan_(.+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const lapor_pak_id = match[1];

    // Close the report
    await laporanService.closeReport(lapor_pak_id);

    // Update message
    await ctx.editMessageText(
      `<b>✅ Laporan Ditutup</b>\n\n` +
      `Laporan ${lapor_pak_id} telah ditandai sebagai selesai.\n\n` +
      `Terima kasih telah melaporkan ke sistem kami.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery(
      "✅ Laporan ditutup",
      { show_alert: false }
    );
  } catch (error) {
    console.error("Error in handleCloseReportCallback:", error);
    return ctx.answerCallbackQuery("❌ Error menutup laporan");
  }
}

/**
 * Helper function to format status text
 */
function getStatusText(status) {
  const statusMap = {
    pending_approval: "⏳ Menunggu Persetujuan",
    rejected: "❌ Ditolak",
    follow_up: "🔄 Follow-up",
    closed: "✅ Selesai",
  };
  return statusMap[status] || status;
}

module.exports = {
  handleDetailLaporanCallback,
  handleAddFeedbackCallback,
  feedbackStep2,
  handleCloseReportCallback,
};
