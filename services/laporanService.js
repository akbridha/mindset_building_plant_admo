const { db } = require("../db");
const { encryptTelegramId, generateLaporPakId } = require("./encryptionService");

/**
 * Laporan (Report) Service for LAPOR PAK system
 * Handles all database operations related to reports, updates, and feedback
 */

/**
 * Create a new report
 * @param {number} reporter_telegram_id - Telegram ID of reporter (will be encrypted)
 * @param {string} message_text - Report description
 * @returns {Promise<string>} - Generated lapor_pak_id (e.g., "LAP-00001")
 */
async function createReport(reporter_telegram_id, message_text) {
  try {
    // Get latest sequence from laporan table
    const [result] = await db.execute(
      "SELECT MAX(CAST(SUBSTRING(lapor_pak_id, 5) AS UNSIGNED)) as max_seq FROM laporan"
    );
    const nextSeq = (result[0]?.max_seq || 0) + 1;
    const lapor_pak_id = generateLaporPakId(nextSeq);

    const encrypted_telegram_id = encryptTelegramId(reporter_telegram_id);

    // Insert report with pending_approval status
    const insertSql = `
      INSERT INTO laporan (lapor_pak_id, reporter_id, message_text, status, created_at, updated_at)
      SELECT ?, id, ?, 'pending_approval', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM users WHERE encrypted_telegram_id = ?
      LIMIT 1
    `;

    // First ensure reporter exists in users table
    await db.execute(
      `INSERT INTO users (encrypted_telegram_id, created_at)
       VALUES (?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE created_at = created_at`,
      [encrypted_telegram_id]
    );

    // Now insert the report
    await db.execute(insertSql, [lapor_pak_id, message_text, encrypted_telegram_id]);

    return lapor_pak_id;
  } catch (error) {
    console.error("Error creating report:", error);
    throw error;
  }
}

/**
 * Get all reports for a specific reporter
 * @param {number} reporter_telegram_id - Telegram ID of reporter
 * @returns {Promise<Array>} - List of reports with status
 */
async function getReporterReports(reporter_telegram_id) {
  try {
    const encrypted_telegram_id = encryptTelegramId(reporter_telegram_id);

    const sql = `
      SELECT l.id, l.lapor_pak_id, l.message_text, l.status, l.pic_id, l.created_at, l.updated_at,
             COUNT(DISTINCT u.id) as update_count, COUNT(DISTINCT f.id) as feedback_count
      FROM laporan l
      JOIN users r ON l.reporter_id = r.id
      LEFT JOIN updates u ON l.id = u.laporan_id AND u.status = 'approved'
      LEFT JOIN feedbacks f ON l.id = f.laporan_id AND f.status = 'approved'
      WHERE r.encrypted_telegram_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `;

    const [rows] = await db.execute(sql, [encrypted_telegram_id]);
    return rows;
  } catch (error) {
    console.error("Error getting reporter reports:", error);
    throw error;
  }
}

/**
 * Get report details with full history (updates and feedback)
 * @param {string} lapor_pak_id - Report ID
 * @param {number} viewer_telegram_id - Who's viewing (for permission check)
 * @returns {Promise<Object>} - Report with updates and feedback history
 */
async function getReportDetail(lapor_pak_id, viewer_telegram_id) {
  try {
    // Get report
    const [reportRows] = await db.execute(
      `SELECT l.id, l.lapor_pak_id, l.message_text, l.status, l.pic_id, l.created_at, l.updated_at
       FROM laporan l
       WHERE l.lapor_pak_id = ?`,
      [lapor_pak_id]
    );

    if (!reportRows.length) {
      throw new Error(`Report not found: ${lapor_pak_id}`);
    }

    const report = reportRows[0];

    // Get approved updates
    const [updates] = await db.execute(
      `SELECT u.id, u.message_text, u.status, u.created_at, 
              pu.username as psd_username, pic.username as pic_username
       FROM updates u
       LEFT JOIN users pu ON u.psd_id = pu.id
       LEFT JOIN users pic ON u.pic_id = pic.id
       WHERE u.laporan_id = ? AND u.status = 'approved'
       ORDER BY u.created_at DESC`,
      [report.id]
    );

    // Get approved feedback
    const [feedbacks] = await db.execute(
      `SELECT f.id, f.message_text, f.status, f.created_at
       FROM feedbacks f
       WHERE f.laporan_id = ? AND f.status = 'approved'
       ORDER BY f.created_at DESC`,
      [report.id]
    );

    return {
      ...report,
      updates,
      feedbacks,
    };
  } catch (error) {
    console.error("Error getting report detail:", error);
    throw error;
  }
}

/**
 * Get all pending approval reports (for Super User approval queue)
 * @returns {Promise<Array>} - List of reports pending approval
 */
async function getPendingApprovalReports() {
  try {
    const [rows] = await db.execute(
      `SELECT l.id, l.lapor_pak_id, l.message_text, l.status, l.created_at
       FROM laporan l
       WHERE l.status = 'pending_approval'
       ORDER BY l.created_at ASC`
    );
    return rows;
  } catch (error) {
    console.error("Error getting pending reports:", error);
    throw error;
  }
}

/**
 * Approve a report - changes status to follow_up
 * @param {string} lapor_pak_id - Report ID
 * @param {number} approver_id - User ID of approver (for audit)
 * @returns {Promise<void>}
 */
async function approveReport(lapor_pak_id, approver_id) {
  try {
    await db.execute(
      `UPDATE laporan SET status = 'follow_up', updated_at = CURRENT_TIMESTAMP
       WHERE lapor_pak_id = ?`,
      [lapor_pak_id]
    );
  } catch (error) {
    console.error("Error approving report:", error);
    throw error;
  }
}

/**
 * Reject a report - keeps status as pending_approval (allows resubmit)
 * @param {string} lapor_pak_id - Report ID
 * @returns {Promise<void>}
 */
async function rejectReport(lapor_pak_id) {
  try {
    // Mark as rejected - keeps pending but marked for review
    await db.execute(
      `UPDATE laporan SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE lapor_pak_id = ?`,
      [lapor_pak_id]
    );
  } catch (error) {
    console.error("Error rejecting report:", error);
    throw error;
  }
}

/**
 * Close a report
 * @param {string} lapor_pak_id - Report ID
 * @returns {Promise<void>}
 */
async function closeReport(lapor_pak_id) {
  try {
    await db.execute(
      `UPDATE laporan SET status = 'closed', updated_at = CURRENT_TIMESTAMP
       WHERE lapor_pak_id = ?`,
      [lapor_pak_id]
    );
  } catch (error) {
    console.error("Error closing report:", error);
    throw error;
  }
}

/**
 * Get all active reports (for team view) - exclude closed
 * @returns {Promise<Array>} - List of active reports
 */
async function getActiveReports() {
  try {
    const [rows] = await db.execute(
      `SELECT l.id, l.lapor_pak_id, l.message_text, l.status, l.pic_id, l.created_at, l.updated_at,
              pic.username as pic_username, COUNT(DISTINCT u.id) as update_count
       FROM laporan l
       LEFT JOIN users pic ON l.pic_id = pic.id
       LEFT JOIN updates u ON l.id = u.laporan_id AND u.status = 'approved'
       WHERE l.status IN ('follow_up', 'pending_approval')
       GROUP BY l.id
       ORDER BY l.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error("Error getting active reports:", error);
    throw error;
  }
}

/**
 * Get all reports from the laporan table
 * @returns {Promise<Array>} - Full list of reports
 */
async function getAllReports() {
  try {
    const [rows] = await db.execute(
      `SELECT id, lapor_pak_id, reporter_id, message_text, status, pic_id, created_at, updated_at
       FROM laporan
       ORDER BY created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error("Error getting all reports:", error);
    throw error;
  }
}

/**
 * Assign PIC to a report
 * @param {string} lapor_pak_id - Report ID
 * @param {number} pic_id - User ID of PIC
 * @returns {Promise<void>}
 */
async function assignPIC(lapor_pak_id, pic_id) {
  try {
    await db.execute(
      `UPDATE laporan SET pic_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE lapor_pak_id = ?`,
      [pic_id, lapor_pak_id]
    );
  } catch (error) {
    console.error("Error assigning PIC:", error);
    throw error;
  }
}

/**
 * Get reports where user is assigned as PIC
 * @param {number} user_id - User ID
 * @returns {Promise<Array>} - List of reports where user is PIC
 */
async function getReportsByPIC(user_id) {
  try {
    const [rows] = await db.execute(
      `SELECT l.id, l.lapor_pak_id, l.message_text, l.status, l.created_at, l.updated_at,
              COUNT(DISTINCT u.id) as pending_updates
       FROM laporan l
       LEFT JOIN updates u ON l.id = u.laporan_id AND u.status = 'pending_approval'
       WHERE l.pic_id = ?
       GROUP BY l.id
       ORDER BY l.created_at DESC`,
      [user_id]
    );
    return rows;
  } catch (error) {
    console.error("Error getting PIC reports:", error);
    throw error;
  }
}

/**
 * Add update to a report
 * @param {string} lapor_pak_id - Report ID
 * @param {number} psd_id - User ID of PSD who submitted update
 * @param {number} pic_id - User ID of PIC who must approve
 * @param {string} message_text - Update content
 * @returns {Promise<number>} - Update ID
 */
async function addUpdate(lapor_pak_id, psd_id, pic_id, message_text) {
  try {
    // Get laporan ID from lapor_pak_id
    const [lapRows] = await db.execute(
      "SELECT id FROM laporan WHERE lapor_pak_id = ?",
      [lapor_pak_id]
    );

    if (!lapRows.length) {
      throw new Error(`Report not found: ${lapor_pak_id}`);
    }

    const laporan_id = lapRows[0].id;

    // Insert update with pending_approval status
    const [result] = await db.execute(
      `INSERT INTO updates (laporan_id, psd_id, message_text, status, pic_id, created_at)
       VALUES (?, ?, ?, 'pending_approval', ?, CURRENT_TIMESTAMP)`,
      [laporan_id, psd_id, message_text, pic_id]
    );

    return result.insertId;
  } catch (error) {
    console.error("Error adding update:", error);
    throw error;
  }
}

/**
 * Approve an update
 * @param {number} update_id - Update ID
 * @returns {Promise<Object>} - Update details for notification
 */
// Di laporanService.js
async function approveUpdate(update_id) {
  try {
    // Get update details before approving
    const [updateRows] = await db.execute(
      `SELECT u.id, u.laporan_id, u.message_text, u.psd_id, l.lapor_pak_id
       FROM updates u
       JOIN laporan l ON u.laporan_id = l.id
       WHERE u.id = ?`,
      [update_id]
    );

    if (!updateRows.length) {
      throw new Error(`Update not found: ${update_id}`);
    }

    // Approve the update
    await db.execute(
      `UPDATE updates SET status = 'approved', approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [update_id]
    );

    return updateRows[0];
  } catch (error) {
    console.error("Error approving update:", error);
    throw error;
  }
}

/**
 * Reject an update
 * @param {number} update_id - Update ID
 * @returns {Promise<Object>} - Update details for notification
 */
async function rejectUpdate(update_id) {
  try {
    // Get update details
    const [updateRows] = await db.execute(
      `SELECT u.id, u.psd_id, u.message_text, l.lapor_pak_id
       FROM updates u
       JOIN laporan l ON u.laporan_id = l.id
       WHERE u.id = ?`,
      [update_id]
    );

    if (!updateRows.length) {
      throw new Error(`Update not found: ${update_id}`);
    }

    // Reject the update
    await db.execute(
      `UPDATE updates SET status = 'rejected'
       WHERE id = ?`,
      [update_id]
    );

    return updateRows[0];
  } catch (error) {
    console.error("Error rejecting update:", error);
    throw error;
  }
}

/**
 * Add feedback to a report
 * @param {string} lapor_pak_id - Report ID
 * @param {number} reporter_telegram_id - Telegram ID of reporter
 * @param {string} message_text - Feedback content
 * @returns {Promise<number>} - Feedback ID
 */
async function addFeedback(lapor_pak_id, reporter_telegram_id, message_text) {
  try {
    const encrypted_telegram_id = encryptTelegramId(reporter_telegram_id);

    // Get report and reporter IDs
    const [lapRows] = await db.execute(
      `SELECT l.id, l.reporter_id FROM laporan l
       JOIN users r ON l.reporter_id = r.id
       WHERE l.lapor_pak_id = ? AND r.encrypted_telegram_id = ?`,
      [lapor_pak_id, encrypted_telegram_id]
    );

    if (!lapRows.length) {
      throw new Error(`Report not found or access denied: ${lapor_pak_id}`);
    }

    const laporan_id = lapRows[0].id;
    const reporter_id = lapRows[0].reporter_id;

    // Insert feedback with pending_approval status
    const [result] = await db.execute(
      `INSERT INTO feedbacks (laporan_id, reporter_id, message_text, status, created_at)
       VALUES (?, ?, ?, 'pending_approval', CURRENT_TIMESTAMP)`,
      [laporan_id, reporter_id, message_text]
    );

    return result.insertId;
  } catch (error) {
    console.error("Error adding feedback:", error);
    throw error;
  }
}

/**
 * Get pending feedback for approval queue
 * @returns {Promise<Array>} - List of feedback pending approval
 */
async function getPendingApprovalFeedback() {
  try {
    const [rows] = await db.execute(
      `SELECT f.id, f.laporan_id, l.lapor_pak_id, l.message_text as report_text, 
              f.message_text as feedback_text, f.created_at
       FROM feedbacks f
       JOIN laporan l ON f.laporan_id = l.id
       WHERE f.status = 'pending_approval'
       ORDER BY f.created_at ASC`
    );
    return rows;
  } catch (error) {
    console.error("Error getting pending feedback:", error);
    throw error;
  }
}

/**
 * Approve feedback
 * @param {number} feedback_id - Feedback ID
 * @returns {Promise<Object>} - Feedback details for notification
 */
async function approveFeedback(feedback_id) {
  try {
    // Get feedback details
    const [fbRows] = await db.execute(
      `SELECT f.id, f.laporan_id, l.lapor_pak_id, l.message_text as report_text, 
              f.message_text as feedback_text
       FROM feedbacks f
       JOIN laporan l ON f.laporan_id = l.id
       WHERE f.id = ?`,
      [feedback_id]
    );

    if (!fbRows.length) {
      throw new Error(`Feedback not found: ${feedback_id}`);
    }

    // Approve feedback
    await db.execute(
      `UPDATE feedbacks SET status = 'approved', approved_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [feedback_id]
    );

    return fbRows[0];
  } catch (error) {
    console.error("Error approving feedback:", error);
    throw error;
  }
}

/**
 * Reject feedback
 * @param {number} feedback_id - Feedback ID
 * @returns {Promise<void>}
 */
async function rejectFeedback(feedback_id) {
  try {
    await db.execute(
      `UPDATE feedbacks SET status = 'rejected'
       WHERE id = ?`,
      [feedback_id]
    );
  } catch (error) {
    console.error("Error rejecting feedback:", error);
    throw error;
  }
}

/**
 * Get summary statistics
 * @returns {Promise<Object>} - Count of reports by status
 */
async function getSummary() {
  try {
    const [rows] = await db.execute(
      `SELECT status, COUNT(*) as count FROM laporan GROUP BY status`
    );

    const summary = {
      open: 0,
      follow_up: 0,
      closed: 0,
      pending_approval: 0,
      rejected: 0,
      total: 0,
    };

    rows.forEach((row) => {
      summary[row.status] = row.count;
      summary.total += row.count;
    });

    return summary;
  } catch (error) {
    console.error("Error getting summary:", error);
    throw error;
  }
}


async function getLaporanByLaporPakId(lapor_pak_id) {
  try {
    const [rows] = await db.execute(
      'SELECT id, lapor_pak_id, reporter_id, message_text, status, pic_id FROM laporan WHERE lapor_pak_id = ?',
      [lapor_pak_id]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error getting laporan:", error);
    throw error;
  }
}

module.exports = {
  createReport,
  getLaporanByLaporPakId,
  getReporterReports,
  getReportDetail,
  getPendingApprovalReports,
  approveReport,
  rejectReport,
  closeReport,
  getActiveReports,
  getAllReports,
  assignPIC,
  getReportsByPIC,
  addUpdate,
  approveUpdate,
  rejectUpdate,
  addFeedback,
  getPendingApprovalFeedback,
  approveFeedback,
  rejectFeedback,
  getSummary,
};
