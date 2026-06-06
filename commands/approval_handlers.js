const laporanService = require("../services/laporanService");
const notificationService = require("../services/notificationService");
const userService = require("../services/userService"); // 🔑 TAMBAHKAN
const logger = require("../services/logger");
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

    // Get report details with reporter info
    const [reportRows] = await db.execute(
      `SELECT l.id, l.lapor_pak_id, l.message_text, l.reporter_id
       FROM laporan l
       WHERE l.id = ?`,
      [report_id]
    );

    if (!reportRows.length) {
      return ctx.answerCallbackQuery("❌ Laporan tidak ditemukan");
    }

    const report = reportRows[0];

    // Approve the report
    await laporanService.approveReport(report.lapor_pak_id, ctx.state.telegram_id);

    // 🔑 KIRIM NOTIFIKASI KE REPORTER bahwa laporan disetujui
    const reporterTelegramId = await userService.getRawTelegramIdByUserId(report.reporter_id);
    
    if (reporterTelegramId) {
      try {
        await notificationService.notifyUser(
          ctx.api,
          reporterTelegramId,
          `<b>✅ Laporan Anda Disetujui!</b>\n\n` +
          `Laporan dengan ID <b>${report.lapor_pak_id}</b> telah disetujui.\n\n` +
          `📝 Isi laporan:\n${report.message_text}\n\n` +
          `Tim kami akan segera menindaklanjuti laporan Anda.`
        );
        console.log(`✅ Notifikasi ke reporter terkirim: ${reporterTelegramId}`);
      } catch (notifError) {
        console.error(`❌ Gagal kirim notifikasi ke reporter:`, notifError.message);
      }
    }

    // KIRIM KE GROUP
    const TEAM_GROUP_ID = process.env.TEAM_GROUP_ID;
    if (TEAM_GROUP_ID) {
      try {
        await notificationService.notifyGroupAboutApprovedReport(
          ctx.api,
          TEAM_GROUP_ID,
          report.lapor_pak_id,
          report.message_text
        );
        console.log(`✅ Notifikasi terkirim ke group ${TEAM_GROUP_ID}`);
      } catch (notifError) {
        console.error("❌ Gagal kirim notifikasi ke group:", notifError.message);
      }
    } else {
      console.warn("⚠️ TEAM_GROUP_ID tidak diset di environment");
    }

    // Update message
    await ctx.editMessageText(
      `<b>✅ Laporan Disetujui</b>\n\n` +
      `ID: ${report.lapor_pak_id}\n\n` +
      `Laporan telah disetujui dan akan diteruskan ke tim Follow-up.\n\n` +
      `Notifikasi telah dikirim ke pelapor.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Laporan disetujui");
  } catch (error) {
    logger.error("Error in handleApproveReportCallback", {
      userId: ctx.state?.telegram_id,
      error: error.message,
    });
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

    // Get report details with reporter info
    const [reportRows] = await db.execute(
      `SELECT l.id, l.lapor_pak_id, l.message_text, l.reporter_id
       FROM laporan l
       WHERE l.id = ?`,
      [report_id]
    );

    if (!reportRows.length) {
      return ctx.answerCallbackQuery("❌ Laporan tidak ditemukan");
    }

    const report = reportRows[0];

    // Reject the report
    await laporanService.rejectReport(report.lapor_pak_id);

    // 🔑 KIRIM NOTIFIKASI KE REPORTER bahwa laporan ditolak
    const reporterTelegramId = await userService.getRawTelegramIdByUserId(report.reporter_id);
    
    if (reporterTelegramId) {
      try {
        await notificationService.notifyUser(
          ctx.api,
          reporterTelegramId,
          `<b>❌ Laporan Anda Ditolak</b>\n\n` +
          `Laporan dengan ID <b>${report.lapor_pak_id}</b> telah ditolak.\n\n` +
          `📝 Isi laporan:\n${report.message_text}\n\n` +
          `Silakan perbaiki laporan Anda dan kirimkan kembali menggunakan perintah:\n` +
          `<code>/lapor</code>`
        );
        console.log(`✅ Notifikasi penolakan ke reporter terkirim: ${reporterTelegramId}`);
      } catch (notifError) {
        console.error(`❌ Gagal kirim notifikasi penolakan:`, notifError.message);
      }
    }

    // Update message
    await ctx.editMessageText(
      `<b>❌ Laporan Ditolak</b>\n\n` +
      `ID: ${report.lapor_pak_id}\n\n` +
      `Laporan telah ditolak. Pelapor dapat merevisi dan mengirim ulang laporan.\n\n` +
      `Notifikasi telah dikirim ke pelapor.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Laporan ditolak");
  } catch (error) {
    logger.error("Error in handleRejectReportCallback", {
      userId: ctx.state?.telegram_id,
      error: error.message,
    });
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

    // 🔑 KIRIM NOTIFIKASI KE GROUP
    const TEAM_GROUP_ID = process.env.TEAM_GROUP_ID;
    if (TEAM_GROUP_ID) {
      try {
        await notificationService.notifyGroupAboutApprovedFeedback(
          ctx.api,
          TEAM_GROUP_ID,
          feedbackData.lapor_pak_id,
          feedbackData.feedback_text
        );
        console.log(`✅ Notifikasi feedback ke group terkirim`);
      } catch (notifError) {
        console.error("❌ Gagal kirim notifikasi feedback ke group:", notifError.message);
      }
    }

    // Update message
    await ctx.editMessageText(
      `<b>✅ Feedback Disetujui</b>\n\n` +
      `ID Laporan: ${feedbackData.lapor_pak_id}\n\n` +
      `Feedback telah disetujui dan akan diteruskan ke tim Follow-up.\n\n` +
      `📝 Feedback: ${feedbackData.feedback_text}`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Feedback disetujui");
  } catch (error) {
    logger.error("Error in handleApproveFeedbackCallback", {
      userId: ctx.state?.telegram_id,
      error: error.message,
    });
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

    // Get feedback details with reporter info
    const [feedbackRows] = await db.execute(
      `SELECT f.id, f.laporan_id, f.message_text, f.reporter_id, l.lapor_pak_id
       FROM feedbacks f
       JOIN laporan l ON f.laporan_id = l.id
       WHERE f.id = ?`,
      [feedback_id]
    );

    if (!feedbackRows.length) {
      return ctx.answerCallbackQuery("❌ Feedback tidak ditemukan");
    }

    const feedback = feedbackRows[0];

    // Reject the feedback
    await laporanService.rejectFeedback(feedback_id);

    // 🔑 KIRIM NOTIFIKASI KE REPORTER bahwa feedback ditolak
    const reporterTelegramId = await userService.getRawTelegramIdByUserId(feedback.reporter_id);
    
    if (reporterTelegramId) {
      try {
        await notificationService.notifyUser(
          ctx.api,
          reporterTelegramId,
          `<b>❌ Feedback Anda Ditolak</b>\n\n` +
          `Feedback untuk laporan <b>${feedback.lapor_pak_id}</b> telah ditolak.\n\n` +
          `📝 Feedback Anda:\n${feedback.message_text}\n\n` +
          `Silakan perbaiki feedback Anda dan kirimkan kembali.\n\n` +
          `Gunakan perintah <code>/laporansaya</code> untuk melihat laporan Anda.`
        );
        console.log(`✅ Notifikasi penolakan feedback ke reporter terkirim: ${reporterTelegramId}`);
      } catch (notifError) {
        console.error(`❌ Gagal kirim notifikasi penolakan feedback:`, notifError.message);
      }
    }

    // Update message
    await ctx.editMessageText(
      `<b>❌ Feedback Ditolak</b>\n\n` +
      `ID Laporan: ${feedback.lapor_pak_id}\n\n` +
      `Feedback telah ditolak. Pelapor dapat merevisi dan mengirim ulang.\n\n` +
      `Notifikasi telah dikirim ke pelapor.`,
      { parse_mode: "HTML" }
    );

    await ctx.answerCallbackQuery("✅ Feedback ditolak");
  } catch (error) {
    logger.error("Error in handleRejectFeedbackCallback", {
      userId: ctx.state?.telegram_id,
      error: error.message,
    });
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

    // Approve the update - this returns update details including psd_id
    const updateData = await laporanService.approveUpdate(update_id);
    
    // Get additional details with PSD info
    const [updateRows] = await db.execute(
      `SELECT u.*, l.lapor_pak_id, u.psd_id
       FROM updates u
       JOIN laporan l ON u.laporan_id = l.id
       WHERE u.id = ?`,
      [update_id]
    );
    
    const update = updateRows[0];

    // 🔑 KIRIM NOTIFIKASI KE PSD bahwa update disetujui
    const psdTelegramId = await userService.getRawTelegramIdByUserId(update.psd_id);
    
    if (psdTelegramId) {
      try {
        await notificationService.notifyUser(
          ctx.api,
          psdTelegramId,
          `<b>✅ Update Disetujui!</b>\n\n` +
          `Update untuk laporan <b>${update.lapor_pak_id}</b> telah disetujui oleh PIC.\n\n` +
          `📝 Update Anda:\n${update.message_text}\n\n` +
          `Update ini akan terlihat oleh reporter laporan.`
        );
        console.log(`✅ Notifikasi persetujuan update ke PSD terkirim: ${psdTelegramId}`);
      } catch (notifError) {
        console.error(`❌ Gagal kirim notifikasi ke PSD:`, notifError.message);
      }
    }

    // 🔑 KIRIM NOTIFIKASI KE REPORTER bahwa ada update baru (opsional)
    const [reportRows] = await db.execute(
      `SELECT reporter_id FROM laporan WHERE id = ?`,
      [update.laporan_id]
    );
    
    if (reportRows.length > 0) {
      const reporterTelegramId = await userService.getRawTelegramIdByUserId(reportRows[0].reporter_id);
      
      if (reporterTelegramId) {
        try {
          await notificationService.notifyUser(
            ctx.api,
            reporterTelegramId,
            `<b>📢 Update Baru untuk Laporan Anda</b>\n\n` +
            `Laporan <b>${update.lapor_pak_id}</b> memiliki update terbaru:\n\n` +
            `📝 ${update.message_text}\n\n` +
            `Gunakan /laporansaya untuk melihat detail laporan Anda.`
          );
          console.log(`✅ Notifikasi update ke reporter terkirim: ${reporterTelegramId}`);
        } catch (notifError) {
          console.error(`❌ Gagal kirim notifikasi ke reporter:`, notifError.message);
        }
      }
    }

    // Update message (remove buttons)
    await ctx.editMessageText(
      `<b>✅ Update Disetujui</b>\n\n` +
      `Laporan: ${updateData.lapor_pak_id}\n\n` +
      `Update telah disetujui.\n\n` +
      `📝 Update: ${updateData.message_text}\n\n` +
      `Notifikasi telah dikirim ke PSD dan reporter.`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
    );

    await ctx.answerCallbackQuery("✅ Update disetujui");
  } catch (error) {
    logger.error("Error in handleApproveUpdateCallback", {
      userId: ctx.state?.telegram_id,
      error: error.message,
    });
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

    // Get update details before rejection
    const [updateRows] = await db.execute(
      `SELECT u.*, l.lapor_pak_id, u.psd_id
       FROM updates u
       JOIN laporan l ON u.laporan_id = l.id
       WHERE u.id = ?`,
      [update_id]
    );
    
    if (!updateRows.length) {
      return ctx.answerCallbackQuery("❌ Update tidak ditemukan");
    }
    
    const update = updateRows[0];

    // Reject the update
    const updateData = await laporanService.rejectUpdate(update_id);

    // 🔑 KIRIM NOTIFIKASI KE PSD bahwa update ditolak
    const psdTelegramId = await userService.getRawTelegramIdByUserId(update.psd_id);
    
    if (psdTelegramId) {
      try {
        await notificationService.notifyPSDAboutRejection(
          ctx.api,
          psdTelegramId,
          update.lapor_pak_id,
          update.message_text
        );
        console.log(`✅ Notifikasi penolakan update ke PSD terkirim: ${psdTelegramId}`);
      } catch (notifError) {
        console.error(`❌ Gagal kirim notifikasi penolakan ke PSD:`, notifError.message);
      }
    }

    // Update message (remove buttons)
    await ctx.editMessageText(
      `<b>❌ Update Ditolak</b>\n\n` +
      `Laporan: ${updateData.lapor_pak_id}\n\n` +
      `Update telah ditolak.\n\n` +
      `📝 Update: ${updateData.message_text}\n\n` +
      `PSD akan menerima notifikasi untuk merevisi update.`,
      { parse_mode: "HTML", reply_markup: { inline_keyboard: [] } }
    );

    await ctx.answerCallbackQuery("✅ Update ditolak");
  } catch (error) {
    logger.error("Error in handleRejectUpdateCallback", {
      userId: ctx.state?.telegram_id,
      error: error.message,
    });
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