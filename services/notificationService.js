/**
 * Notification Service for LAPOR PAK system
 * Routes messages to users/groups with appropriate formatting
 *
 * NOTE: This service is prepared for integration with the bot instance
 * and requires the bot context to be passed in or available globally
 */

/**
 * Send private notification to a user
 * Usage: await notifyUser(bot, user_id, message, options)
 * @param {object} bot - Bot instance from grammy
 * @param {number} user_id - Telegram user ID
 * @param {string} message - Message text
 * @param {object} options - Optional Telegram API options (parse_mode, reply_markup, etc)
 * @returns {Promise<void>}
 */
async function notifyUser(bot, user_id, message, options = {}) {
  try {
    await bot.api.sendMessage(user_id, message, {
      parse_mode: "HTML",
      ...options,
    });
  } catch (error) {
    console.error(`Error notifying user ${user_id}:`, error);
    // Don't throw - notifications should not break workflow
  }
}

/**
 * Send message to team group
 * Usage: await notifyGroup(bot, group_id, message, options)
 * @param {object} bot - Bot instance from grammy
 * @param {number} group_id - Telegram group ID (negative for groups)
 * @param {string} message - Message text
 * @param {object} options - Optional Telegram API options
 * @returns {Promise<void>}
 */
async function notifyGroup(bot, group_id, message, options = {}) {
  try {
    await bot.api.sendMessage(group_id, message, {
      parse_mode: "HTML",
      ...options,
    });
  } catch (error) {
    console.error(`Error notifying group ${group_id}:`, error);
    // Don't throw - notifications should not break workflow
  }
}

/**
 * Notify PIC about pending update approval
 * Usage: await notifyPICForApproval(bot, pic_user_id, lapor_pak_id, update_text, update_id)
 * @param {object} bot - Bot instance
 * @param {number} pic_user_id - Telegram user ID of PIC
 * @param {string} lapor_pak_id - Report ID
 * @param {string} update_text - Update content
 * @param {number} update_id - Update ID for callback
 * @returns {Promise<void>}
 */
async function notifyPICForApproval(
  bot,
  pic_user_id,
  lapor_pak_id,
  update_text,
  update_id
) {
  try {
    const message = `<b>Update Memerlukan Persetujuan</b>\n\n` +
      `<b>Laporan:</b> ${lapor_pak_id}\n` +
      `<b>Update:</b>\n${update_text}\n\n` +
      `Silakan setujui atau tolak update ini.`;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Setujui", callback_data: `approve_update_${update_id}` },
            { text: "❌ Tolak", callback_data: `reject_update_${update_id}` },
          ],
        ],
      },
    };

    await notifyUser(bot, pic_user_id, message, options);
  } catch (error) {
    console.error(`Error notifying PIC ${pic_user_id}:`, error);
  }
}

/**
 * Notify reporter about approved update
 * Usage: await notifyReporterAboutUpdate(bot, reporter_user_id, lapor_pak_id, update_text)
 * @param {object} bot - Bot instance
 * @param {number} reporter_user_id - Telegram user ID
 * @param {string} lapor_pak_id - Report ID
 * @param {string} update_text - Update content
 * @returns {Promise<void>}
 */
async function notifyReporterAboutUpdate(
  bot,
  reporter_user_id,
  lapor_pak_id,
  update_text
) {
  try {
    const message = `<b>Update untuk Laporan Anda</b>\n\n` +
      `<b>Laporan:</b> ${lapor_pak_id}\n\n` +
      `<b>Update:</b>\n${update_text}\n\n` +
      `Silakan pilih tindakan di bawah.`;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "📝 Feedback", callback_data: `feedback_${lapor_pak_id}` },
            { text: "✅ Selesai", callback_data: `close_${lapor_pak_id}` },
          ],
        ],
      },
    };

    await notifyUser(bot, reporter_user_id, message, options);
  } catch (error) {
    console.error(`Error notifying reporter ${reporter_user_id}:`, error);
  }
}

/**
 * Notify PSD about rejected update
 * Usage: await notifyPSDAboutRejection(bot, psd_user_id, lapor_pak_id, update_text)
 * @param {object} bot - Bot instance
 * @param {number} psd_user_id - Telegram user ID of PSD
 * @param {string} lapor_pak_id - Report ID
 * @param {string} update_text - Update that was rejected
 * @returns {Promise<void>}
 */
async function notifyPSDAboutRejection(
  bot,
  psd_user_id,
  lapor_pak_id,
  update_text
) {
  try {
    const message = `<b>Update Ditolak - Perlu Revisi</b>\n\n` +
      `<b>Laporan:</b> ${lapor_pak_id}\n\n` +
      `<b>Update yang ditolak:</b>\n${update_text}\n\n` +
      `Silakan revisi dan kirim kembali dengan perintah:\n` +
      `<code>/update ${lapor_pak_id} [isi update baru]</code>`;

    await notifyUser(bot, psd_user_id, message);
  } catch (error) {
    console.error(`Error notifying PSD ${psd_user_id}:`, error);
  }
}

/**
 * Notify Super User about pending approval
 * Usage: await notifyApprovalQueue(bot, superuser_id, lapor_pak_id, message_text, type)
 * @param {object} bot - Bot instance
 * @param {number} superuser_id - Telegram user ID
 * @param {string} lapor_pak_id - Report ID
 * @param {string} message_text - Content to approve
 * @param {string} type - 'report' or 'feedback'
 * @param {number} item_id - ID of report/feedback for callback
 * @returns {Promise<void>}
 */
async function notifyApprovalQueue(
  bot,
  superuser_id,
  lapor_pak_id,
  message_text,
  type,
  item_id
) {
  try {
    const typeLabel = type === "report" ? "Laporan Baru" : "Feedback";
    const message = `<b>📬 ${typeLabel} Menunggu Persetujuan</b>\n\n` +
      `<b>ID:</b> ${lapor_pak_id}\n\n` +
      `<b>Isi:</b>\n${message_text}\n\n` +
      `Silakan setujui atau tolak.`;

    const callback_approve = `approve_${type}_${item_id}`;
    const callback_reject = `reject_${type}_${item_id}`;

    const options = {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Setujui", callback_data: callback_approve },
            { text: "❌ Tolak", callback_data: callback_reject },
          ],
        ],
      },
    };

    await notifyUser(bot, superuser_id, message, options);
  } catch (error) {
    console.error(`Error notifying approval queue:`, error);
  }
}

/**
 * Notify group about approved report
 * Usage: await notifyGroupAboutApprovedReport(bot, group_id, lapor_pak_id, message_text)
 * @param {object} bot - Bot instance
 * @param {number} group_id - Telegram group ID
 * @param {string} lapor_pak_id - Report ID
 * @param {string} message_text - Report content
 * @returns {Promise<void>}
 */
async function notifyGroupAboutApprovedReport(
  bot,
  group_id,
  lapor_pak_id,
  message_text
) {
  try {
    const message = `<b>[${lapor_pak_id}] 📋 Laporan Baru</b>\n\n${message_text}`;
    await notifyGroup(bot, group_id, message);
  } catch (error) {
    console.error(`Error notifying group about report:`, error);
  }
}

/**
 * Notify group about approved feedback
 * Usage: await notifyGroupAboutApprovedFeedback(bot, group_id, lapor_pak_id, feedback_text)
 * @param {object} bot - Bot instance
 * @param {number} group_id - Telegram group ID
 * @param {string} lapor_pak_id - Report ID
 * @param {string} feedback_text - Feedback content
 * @returns {Promise<void>}
 */
async function notifyGroupAboutApprovedFeedback(
  bot,
  group_id,
  lapor_pak_id,
  feedback_text
) {
  try {
    const message =
      `<b>[${lapor_pak_id}] 💬 Feedback</b>\n\n${feedback_text}`;
    await notifyGroup(bot, group_id, message);
  } catch (error) {
    console.error(`Error notifying group about feedback:`, error);
  }
}

/**
 * Notify group about PIC assignment
 * Usage: await notifyGroupAboutPICAssignment(bot, group_id, lapor_pak_id, pic_username)
 * @param {object} bot - Bot instance
 * @param {number} group_id - Telegram group ID
 * @param {string} lapor_pak_id - Report ID
 * @param {string} pic_username - Username of assigned PIC
 * @returns {Promise<void>}
 */
async function notifyGroupAboutPICAssignment(
  bot,
  group_id,
  lapor_pak_id,
  pic_username
) {
  try {
    const message = `<b>[${lapor_pak_id}] 👤 PIC Ditunjuk</b>\n\n` +
      `PIC: @${pic_username}`;
    await notifyGroup(bot, group_id, message);
  } catch (error) {
    console.error(`Error notifying group about PIC assignment:`, error);
  }
}

/**
 * Notify PIC about assignment
 * Usage: await notifyPICAboutAssignment(bot, pic_user_id, lapor_pak_id, report_text)
 * @param {object} bot - Bot instance
 * @param {number} pic_user_id - Telegram user ID of PIC
 * @param {string} lapor_pak_id - Report ID
 * @param {string} report_text - Report content
 * @returns {Promise<void>}
 */
async function notifyPICAboutAssignment(
  bot,
  pic_user_id,
  lapor_pak_id,
  report_text
) {
  try {
    const message = `<b>👤 Anda Ditunjuk sebagai PIC</b>\n\n` +
      `<b>Laporan:</b> ${lapor_pak_id}\n\n` +
      `<b>Isi Laporan:</b>\n${report_text}\n\n` +
      `Silakan lakukan follow-up dan kelola update untuk laporan ini.`;

    await notifyUser(bot, pic_user_id, message);
  } catch (error) {
    console.error(`Error notifying PIC about assignment:`, error);
  }
}

module.exports = {
  notifyUser,
  notifyGroup,
  notifyPICForApproval,
  notifyReporterAboutUpdate,
  notifyPSDAboutRejection,
  notifyApprovalQueue,
  notifyGroupAboutApprovedReport,
  notifyGroupAboutApprovedFeedback,
  notifyGroupAboutPICAssignment,
  notifyPICAboutAssignment,
};
