const laporanService = require("../services/laporanService");
const notificationService = require("../services/notificationService");
const { db } = require("../db");

/**
 * Callback handlers for approval workflows
 * - Super User approving/rejecting reports
 * - Super User approving/rejecting feedback
 * - PIC approving/rejecting updates
 */

/**
 * Handle Super User approval of a report
 */
async function handleApproveReportCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^approve_report_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const report_id = match[1];

    // Get report details
    const [reportRows] = await db.execute(
      "SELECT lapor_pak_id, message_text FROM laporan WHERE id = ?",
      [report_id]
    );

    if (!reportRows.length) {
      return ctx.answerCallbackQuery("❌ Laporan tidak ditemukan");
    }

    const report = reportRows[0];

    // Approve the report
    await laporanService.approveReport(report.lapor_pak_id, ctx.state.telegram_id);

    // Update message
    await ctx.editMessageText(
      `<b>✅ Laporan Disetujui</b>\n\n` +
      `ID: ${report.lapor_pak_id}\n\n` +
      `Laporan telah disetujui dan akan diteruskan ke tim Follow-up.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Laporan disetujui", { show_alert: false });
  } catch (error) {
    console.error("Error in handleApproveReportCallback:", error);
    return ctx.answerCallbackQuery("❌ Error menyetujui laporan");
  }
}

/**
 * Handle Super User rejection of a report
 */
async function handleRejectReportCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^reject_report_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const report_id = match[1];

    // Get report details
    const [reportRows] = await db.execute(
      "SELECT lapor_pak_id FROM laporan WHERE id = ?",
      [report_id]
    );

    if (!reportRows.length) {
      return ctx.answerCallbackQuery("❌ Laporan tidak ditemukan");
    }

    const report = reportRows[0];

    // Reject the report
    await laporanService.rejectReport(report.lapor_pak_id);

    // Update message
    await ctx.editMessageText(
      `<b>❌ Laporan Ditolak</b>\n\n` +
      `ID: ${report.lapor_pak_id}\n\n` +
      `Laporan telah ditolak. Pelapor dapat merevisi dan mengirim ulang laporan.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Laporan ditolak", { show_alert: false });
  } catch (error) {
    console.error("Error in handleRejectReportCallback:", error);
    return ctx.answerCallbackQuery("❌ Error menolak laporan");
  }
}

/**
 * Handle Super User approval of feedback
 */
async function handleApproveFeedbackCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^approve_feedback_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const feedback_id = match[1];

    // Approve the feedback
    const feedbackData = await laporanService.approveFeedback(feedback_id);

    // Update message
    await ctx.editMessageText(
      `<b>✅ Feedback Disetujui</b>\n\n` +
      `ID: ${feedbackData.lapor_pak_id}\n\n` +
      `Feedback telah disetujui dan akan diteruskan ke tim Follow-up.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Feedback disetujui", { show_alert: false });
  } catch (error) {
    console.error("Error in handleApproveFeedbackCallback:", error);
    return ctx.answerCallbackQuery("❌ Error menyetujui feedback");
  }
}

/**
 * Handle Super User rejection of feedback
 */
async function handleRejectFeedbackCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^reject_feedback_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const feedback_id = match[1];

    // Get feedback details
    const [feedbackRows] = await db.execute(
      "SELECT lapor_pak_id FROM feedbacks WHERE id = ?",
      [feedback_id]
    );

    if (!feedbackRows.length) {
      return ctx.answerCallbackQuery("❌ Feedback tidak ditemukan");
    }

    const feedback = feedbackRows[0];

    // Reject the feedback
    await laporanService.rejectFeedback(feedback_id);

    // Update message
    await ctx.editMessageText(
      `<b>❌ Feedback Ditolak</b>\n\n` +
      `ID: ${feedback.lapor_pak_id}\n\n` +
      `Feedback telah ditolak. Pelapor dapat merevisi dan mengirim ulang feedback.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Feedback ditolak", { show_alert: false });
  } catch (error) {
    console.error("Error in handleRejectFeedbackCallback:", error);
    return ctx.answerCallbackQuery("❌ Error menolak feedback");
  }
}

/**
 * Handle PIC approval of an update
 */
async function handleApproveUpdateCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^approve_update_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const update_id = match[1];

    // Approve the update
    const updateData = await laporanService.approveUpdate(update_id);

    // Update message
    await ctx.editMessageText(
      `<b>✅ Update Disetujui</b>\n\n` +
      `Laporan: ${updateData.lapor_pak_id}\n\n` +
      `Update telah disetujui dan akan diteruskan ke pelapor.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Update disetujui", { show_alert: false });
  } catch (error) {
    console.error("Error in handleApproveUpdateCallback:", error);
    return ctx.answerCallbackQuery("❌ Error menyetujui update");
  }
}

/**
 * Handle PIC rejection of an update
 */
async function handleRejectUpdateCallback(ctx) {
  try {
    const callbackData = ctx.callbackQuery.data;
    const match = callbackData.match(/^reject_update_(\d+)$/);

    if (!match) {
      return ctx.answerCallbackQuery("❌ Data tidak valid");
    }

    const update_id = match[1];

    // Reject the update
    const updateData = await laporanService.rejectUpdate(update_id);

    // Update message
    await ctx.editMessageText(
      `<b>❌ Update Ditolak</b>\n\n` +
      `Laporan: ${updateData.lapor_pak_id}\n\n` +
      `Update telah ditolak. PSD dapat merevisi dan mengirim ulang.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Update ditolak", { show_alert: false });
  } catch (error) {
    console.error("Error in handleRejectUpdateCallback:", error);
    return ctx.answerCallbackQuery("❌ Error menolak update");
  }
}

module.exports = {
  handleApproveReportCallback,
  handleRejectReportCallback,
  handleApproveFeedbackCallback,
  handleRejectFeedbackCallback,
  handleApproveUpdateCallback,
  handleRejectUpdateCallback,
};
