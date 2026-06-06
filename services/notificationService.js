/**
 * Notification Service for LAPOR PAK system
 * Routes messages to users/groups with appropriate formatting
 */

/**
 * Send private notification to a user
 * @param {object} api - Bot API instance (ctx.api)
 * @param {number} user_telegram_id - Raw Telegram ID (from ms_user)
 * @param {string} message - Message text
 * @param {object} options - Optional Telegram API options
 * @returns {Promise<void>}
 */
async function notifyUser(api, user_telegram_id, message, options = {}) {
  try {
    await api.sendMessage(user_telegram_id, message, {
      parse_mode: "HTML",
      ...options,
    });
    console.log(`✅ Notifikasi terkirim ke user: ${user_telegram_id}`);
  } catch (error) {
    console.error(`Error notifying user ${user_telegram_id}:`, error);
    // Don't throw - notifications should not break workflow
  }
}

/**
 * Send message to team group
 * @param {object} api - Bot API instance (ctx.api)
 * @param {number} group_id - Telegram group ID (negative for groups)
 * @param {string} message - Message text
 * @param {object} options - Optional Telegram API options
 * @returns {Promise<void>}
 */
async function notifyGroup(api, group_id, message, options = {}) {
  try {
    await api.sendMessage(group_id, message, {
      parse_mode: "HTML",
      ...options,
    });
    console.log(`✅ Notifikasi terkirim ke group: ${group_id}`);
  } catch (error) {
    console.error(`Error notifying group ${group_id}:`, error);
  }
}

/**
 * Notify PIC about pending update approval
 * @param {object} api - Bot API instance (ctx.api)
 * @param {number} pic_telegram_id - Raw Telegram ID of PIC
 * @param {string} lapor_pak_id - Report ID
 * @param {string} update_text - Update content
 * @param {number} update_id - Update ID for callback
 * @returns {Promise<void>}
 */
async function notifyPICForApproval(
  api,
  pic_telegram_id,
  lapor_pak_id,
  update_text,
  update_id
) {
  try {
    const message = `<b>📝 Update Memerlukan Persetujuan</b>\n\n` +
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

    await notifyUser(api, pic_telegram_id, message, options);
  } catch (error) {
    console.error(`Error notifying PIC:`, error);
    throw error;
  }
}

/**
 * Notify PSD about rejected update
 * @param {object} api - Bot API instance
 * @param {number} psd_telegram_id - Raw Telegram ID of PSD
 * @param {string} lapor_pak_id - Report ID
 * @param {string} update_text - Update that was rejected
 * @returns {Promise<void>}
 */
async function notifyPSDAboutRejection(
  api,
  psd_telegram_id,
  lapor_pak_id,
  update_text
) {
  try {
    const message = `<b>❌ Update Ditolak - Perlu Revisi</b>\n\n` +
      `<b>Laporan:</b> ${lapor_pak_id}\n\n` +
      `<b>Update yang ditolak:</b>\n${update_text}\n\n` +
      `Silakan revisi dan kirim kembali dengan perintah:\n` +
      `<code>/updatelaporan ${lapor_pak_id}</code>`;

    await notifyUser(api, psd_telegram_id, message);
  } catch (error) {
    console.error(`Error notifying PSD:`, error);
  }
}

/**
 * Notify Super User about pending approval (report or feedback)
 * @param {object} api - Bot API instance
 * @param {number} superuser_telegram_id - Raw Telegram ID of Super User
 * @param {string} lapor_pak_id - Report ID
 * @param {string} message_text - Content to approve
 * @param {string} type - 'report' or 'feedback'
 * @param {number} item_id - ID of report/feedback for callback
 * @returns {Promise<void>}
 */
async function notifyApprovalQueue(
  api,
  superuser_telegram_id,
  lapor_pak_id,
  message_text,
  type,
  item_id
) {
  try {
    const typeLabel = type === "report" ? "📋 Laporan Baru" : "💬 Feedback Baru";
    const message = `<b>${typeLabel} Menunggu Persetujuan</b>\n\n` +
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

    await notifyUser(api, superuser_telegram_id, message, options);
  } catch (error) {
    console.error(`Error notifying approval queue:`, error);
  }
}

/**
 * Notify group about approved report
 * @param {object} api - Bot API instance
 * @param {number} group_id - Telegram group ID
 * @param {string} lapor_pak_id - Report ID
 * @param {string} message_text - Report content
 * @returns {Promise<void>}
 */
async function notifyGroupAboutApprovedReport(api, group_id, lapor_pak_id, message_text) {
  try {
    const message = `<b>📋 [${lapor_pak_id}] Laporan Baru</b>\n\n${message_text}`;
    
    await api.sendMessage(group_id, message, { 
      parse_mode: "HTML",
      disable_web_page_preview: true
    });
    
    console.log(`✅ Notifikasi group terkirim: ${lapor_pak_id} ke ${group_id}`);
  } catch (error) {
    console.error(`Error notifying group about report:`, error);
    throw error;
  }
}

/**
 * Notify group about approved feedback
 * @param {object} api - Bot API instance
 * @param {number} group_id - Telegram group ID
 * @param {string} lapor_pak_id - Report ID
 * @param {string} feedback_text - Feedback content
 * @returns {Promise<void>}
 */
async function notifyGroupAboutApprovedFeedback(
  api,
  group_id,
  lapor_pak_id,
  feedback_text
) {
  try {
    const message = `<b>💬 [${lapor_pak_id}] Feedback Baru</b>\n\n${feedback_text}`;
    await notifyGroup(api, group_id, message);
  } catch (error) {
    console.error(`Error notifying group about feedback:`, error);
  }
}

/**
 * Notify group about PIC assignment
 * @param {object} api - Bot API instance
 * @param {number} group_id - Telegram group ID
 * @param {string} lapor_pak_id - Report ID
 * @param {string} pic_username - Username of assigned PIC
 * @returns {Promise<void>}
 */
async function notifyGroupAboutPICAssignment(
  api,
  group_id,
  lapor_pak_id,
  pic_username
) {
  try {
    const message = `<b>👤 [${lapor_pak_id}] PIC Ditunjuk</b>\n\n` +
      `PIC: @${pic_username}`;
    await notifyGroup(api, group_id, message);
  } catch (error) {
    console.error(`Error notifying group about PIC assignment:`, error);
  }
}

/**
 * Notify PIC about assignment
 * @param {object} api - Bot API instance
 * @param {number} pic_telegram_id - Raw Telegram ID of PIC
 * @param {string} lapor_pak_id - Report ID
 * @param {string} report_text - Report content
 * @returns {Promise<void>}
 */
async function notifyPICAboutAssignment(
  api,
  pic_telegram_id,
  lapor_pak_id,
  report_text
) {
  try {
    const message = `<b>👤 Anda Ditunjuk sebagai PIC</b>\n\n` +
      `<b>Laporan:</b> ${lapor_pak_id}\n\n` +
      `<b>Isi Laporan:</b>\n${report_text}\n\n` +
      `Silakan lakukan follow-up dan kelola update untuk laporan ini.\n\n` +
      `Gunakan /updatelaporan ${lapor_pak_id} untuk menambah update.`;

    await notifyUser(api, pic_telegram_id, message);
  } catch (error) {
    console.error(`Error notifying PIC about assignment:`, error);
  }
}

module.exports = {
  notifyUser,
  notifyGroup,
  notifyPICForApproval,
  notifyPSDAboutRejection,
  notifyApprovalQueue,
  notifyGroupAboutApprovedReport,
  notifyGroupAboutApprovedFeedback,
  notifyGroupAboutPICAssignment,
  notifyPICAboutAssignment,
};