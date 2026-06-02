const { db } = require("../db");

/**
 * Team Service for LAPOR PAK system
 * Manages SH/PSD team members and their roles
 */

/**
 * Add a user to the team
 * @param {number} user_id - Telegram user ID to add
 * @param {string} role - Role: 'SH' or 'PSD'
 * @param {number} added_by_id - User ID of admin adding member
 * @returns {Promise<number>} - Team member ID
 */
async function addTeamMember(user_id, role, added_by_id) {
  try {
    // Validate role
    if (!["SH", "PSD"].includes(role)) {
      throw new Error(`Invalid role: ${role}. Must be SH or PSD`);
    }

    // ✅ Pastikan user_id dan added_by_id adalah angka yang valid
    if (!user_id || isNaN(user_id) || !added_by_id || isNaN(added_by_id)) {
      throw new Error(`Invalid user_id or added_by_id: user_id=${user_id}, added_by_id=${added_by_id}`);
    }

    // Check if user exists in users table
    const [existingUser] = await db.execute(
      `SELECT id FROM users WHERE id = ?`,
      [user_id]
    );

    if (existingUser.length === 0) {
      throw new Error(`User with id ${user_id} does not exist in users table`);
    }

    // Check if added_by user exists
    const [existingAdmin] = await db.execute(
      `SELECT id FROM users WHERE id = ?`,
      [added_by_id]
    );

    if (existingAdmin.length === 0) {
      throw new Error(`Admin with id ${added_by_id} does not exist in users table`);
    }

    // Add to team_members
    const [result] = await db.execute(
      `INSERT INTO team_members (user_id, role, added_by, is_active, created_at, updated_at)
       VALUES (?, ?, ?, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE 
         role = VALUES(role), 
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
      [user_id, role, added_by_id]
    );

    return result.insertId || result.affectedRows;
  } catch (error) {
    console.error("Error adding team member:", error);
    throw error;
  }
}

/**
 * Remove a user from the team
 * @param {number} user_id - User ID to remove
 * @returns {Promise<void>}
 */
async function removeTeamMember(user_id) {
  try {
    await db.execute(
      `UPDATE team_members SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [user_id]
    );
  } catch (error) {
    console.error("Error removing team member:", error);
    throw error;
  }
}

/**
 * Get a user's team role
 * @param {number} user_id - User ID
 * @returns {Promise<string|null>} - Role ('SH', 'PSD') or null if not in team
 */
async function getTeamRole(user_id) {
  const [rows] = await db.execute(
    `SELECT role FROM team_members WHERE user_id = ? AND is_active = TRUE`,
    [user_id]  // ✅ Ini mencari berdasarkan users.id (bukan Telegram ID)
  );
  return rows.length > 0 ? rows[0].role : null;
}

/**
 * Check if user is a team member
 * @param {number} user_id - User ID
 * @returns {Promise<boolean>} - True if active team member
 */
async function isTeamMember(user_id) {
  try {
    const [rows] = await db.execute(
      `SELECT id FROM team_members WHERE user_id = ? AND is_active = TRUE`,
      [user_id]
    );
    return rows.length > 0;
  } catch (error) {
    console.error("Error checking team membership:", error);
    throw error;
  }
}

/**
 * Get all active team members
 * @returns {Promise<Array>} - List of team members with roles
 */
async function listTeamMembers() {
  try {
    const [rows] = await db.execute(
      `SELECT tm.id, tm.user_id, tm.role, tm.is_active, tm.created_at, 
              u.username, u.first_name
       FROM team_members tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.is_active = TRUE
       ORDER BY tm.role ASC, tm.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error("Error listing team members:", error);
    throw error;
  }
}

/**
 * Get all SH members (Section Heads)
 * @returns {Promise<Array>} - List of SH members
 */
async function listSHMembers() {
  try {
    const [rows] = await db.execute(
      `SELECT tm.user_id, u.username, u.first_name
       FROM team_members tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.role = 'SH' AND tm.is_active = TRUE
       ORDER BY tm.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error("Error listing SH members:", error);
    throw error;
  }
}

/**
 * Get all PSD members (Plant Site Development)
 * @returns {Promise<Array>} - List of PSD members
 */
async function listPSDMembers() {
  try {
    const [rows] = await db.execute(
      `SELECT tm.user_id, u.username, u.first_name
       FROM team_members tm
       LEFT JOIN users u ON tm.user_id = u.id
       WHERE tm.role = 'PSD' AND tm.is_active = TRUE
       ORDER BY tm.created_at DESC`
    );
    return rows;
  } catch (error) {
    console.error("Error listing PSD members:", error);
    throw error;
  }
}

/**
 * Count active team members
 * @returns {Promise<Object>} - Count by role
 */
async function getTeamMemberCount() {
  try {
    const [rows] = await db.execute(
      `SELECT role, COUNT(*) as count FROM team_members 
       WHERE is_active = TRUE
       GROUP BY role`
    );

    const counts = { SH: 0, PSD: 0, total: 0 };
    rows.forEach((row) => {
      counts[row.role] = row.count;
      counts.total += row.count;
    });

    return counts;
  } catch (error) {
    console.error("Error getting team member count:", error);
    throw error;
  }
}

module.exports = {
  addTeamMember,
  removeTeamMember,
  getTeamRole,
  isTeamMember,
  listTeamMembers,
  listSHMembers,
  listPSDMembers,
  getTeamMemberCount,
};
