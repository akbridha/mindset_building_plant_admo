const { db } = require("../db");

/**
 * Get user's current state from ms_user table
 * @param {number} telegram_id - Telegram user ID
 * @returns {Promise<Object>} State object with properties: current_state, context_data
 */
async function getState(telegram_id) {
  try {
    const sql = "SELECT current_state, context_data FROM ms_user WHERE telegram_id = ?";
    const [rows] = await db.execute(sql, [telegram_id]);
    
    if (rows.length === 0) {
      return { current_state: null, context_data: null };
    }
    
    const state = rows[0];
    return {
      current_state: state.current_state,
      context_data: state.context_data ? JSON.parse(state.context_data) : null
    };
  } catch (error) {
    console.error("Error getting state:", error);
    throw error;
  }
}

/**
 * Set or update user's state
 * @param {number} telegram_id - Telegram user ID
 * @param {string} state_name - New state name (e.g., 'awaiting_task_description')
 * @param {Object} context_data - JSON context data to store (optional)
 * @returns {Promise<void>}
 */
async function setState(telegram_id, state_name, context_data = {}) {
  try {
    const contextJson = JSON.stringify(context_data);
    const sql = `
      INSERT INTO ms_user (telegram_id, current_state, context_data)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        current_state = VALUES(current_state),
        context_data = VALUES(context_data),
        updated_at = CURRENT_TIMESTAMP
    `;
    await db.execute(sql, [telegram_id, state_name, contextJson]);
  } catch (error) {
    console.error("Error setting state:", error);
    throw error;
  }
}

/**
 * Clear user's state (set to null)
 * @param {number} telegram_id - Telegram user ID
 * @returns {Promise<void>}
 */
async function clearState(telegram_id) {
  try {
    const sql = `
      UPDATE ms_user
      SET current_state = NULL, context_data = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = ?
    `;
    await db.execute(sql, [telegram_id]);
  } catch (error) {
    console.error("Error clearing state:", error);
    throw error;
  }
}

/**
 * Get context data for user
 * @param {number} telegram_id - Telegram user ID
 * @returns {Promise<Object>} Parsed context data object
 */
async function getContext(telegram_id) {
  try {
    const state = await getState(telegram_id);
    return state.context_data || {};
  } catch (error) {
    console.error("Error getting context:", error);
    throw error;
  }
}

/**
 * Update/merge context data for user
 * @param {number} telegram_id - Telegram user ID
 * @param {Object} contextUpdates - Object with fields to merge into context
 * @returns {Promise<void>}
 */
async function updateContext(telegram_id, contextUpdates) {
  try {
    const currentContext = await getContext(telegram_id);
    const mergedContext = { ...currentContext, ...contextUpdates };
    
    const sql = `
      UPDATE ms_user
      SET context_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id = ?
    `;
    await db.execute(sql, [JSON.stringify(mergedContext), telegram_id]);
  } catch (error) {
    console.error("Error updating context:", error);
    throw error;
  }
}

/**
 * Check if user state has timed out (> 5 minutes old)
 * @param {number} telegram_id - Telegram user ID
 * @returns {Promise<boolean>} True if timed out, false otherwise
 */
async function isStateTimedOut(telegram_id) {
  try {
    const sql = "SELECT updated_at, current_state FROM ms_user WHERE telegram_id = ?";
    const [rows] = await db.execute(sql, [telegram_id]);
    
    if (rows.length === 0 || !rows[0].current_state) {
      return false; // No state = no timeout
    }
    
    const updatedAt = new Date(rows[0].updated_at);
    const now = new Date();
    const minutesDiff = (now - updatedAt) / (1000 * 60);
    
    return minutesDiff > 5;
  } catch (error) {
    console.error("Error checking timeout:", error);
    throw error;
  }
}

module.exports = {
  getState,
  setState,
  clearState,
  getContext,
  updateContext,
  isStateTimedOut
};
