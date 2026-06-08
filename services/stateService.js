const { db } = require("../db");
const { hashTelegramId } = require("./encryptionService");

/**
 * Get user_id from telegram_id (internal reference)
 * This function should be called first to get the internal user_id
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @returns {Promise<number>} Internal user_id for database operations
 * @throws {Error} If user not found or database error
 */
async function getUserId(telegram_id) {
  try {
    const hash = hashTelegramId(telegram_id);
    const sql = "SELECT user_id FROM ms_user WHERE telegram_id_hash = ?";
    const [rows] = await db.execute(sql, [hash]);
    
    if (rows.length === 0) {
      // throw new Error(`User not found for telegram_id: ${telegram_id}`);
      return "user_not_found";
    }
    
    return rows[0].user_id;
  } catch (error) {
    console.error("Error getting user_id:", error);
    throw error;
  }
}

/**
 * Get user's current state from ms_user table
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @returns {Promise<Object>} State object with properties: current_state, context_data, user_id
 */
async function getState(telegram_id) {
  try {
    const hash = hashTelegramId(telegram_id);
    const sql = "SELECT user_id, current_state, context_data FROM ms_user WHERE telegram_id_hash = ?";
    const [rows] = await db.execute(sql, [hash]);
    
    if (rows.length === 0) {
      return { user_id: null, current_state: null, context_data: null };
    }
    
    const state = rows[0];
    return {
      user_id: state.user_id,
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
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @param {string} state_name - New state name (e.g., 'awaiting_task_description')
 * @param {Object} context_data - JSON context data to store (optional)
 * @param {string} reminder_time - Reminder time (optional, default "18:00:00")
 * @returns {Promise<number>} Returns user_id
 */
async function setState(
  telegram_id,
  state_name,
  context_data = {},
  reminder_time = "18:00:00"
) {
  try {
    const hash = hashTelegramId(telegram_id);
    
    // cek apakah object kosong
    const isEmptyContext =
      !context_data || Object.keys(context_data).length === 0;

    // kalau kosong -> kirim null
    const contextJson = isEmptyContext
      ? null
      : JSON.stringify(context_data);

    // fallback reminder time
    const dbReminderTime =
      reminder_time === "" ? "18:00:00" : reminder_time;

    const sql = `
      INSERT INTO ms_user (
        telegram_id,
        telegram_id_hash,
        current_state,
        context_data,
        reminder_time
      )
      VALUES (?, ?, ?, ?, ?)

      ON DUPLICATE KEY UPDATE
        current_state = VALUES(current_state),

        -- hanya update jika context_data baru tidak null
        context_data = COALESCE(
          VALUES(context_data),
          context_data
        ),

        reminder_time = VALUES(reminder_time),
        updated_at = CURRENT_TIMESTAMP
    `;

    const [result] = await db.execute(sql, [
      telegram_id,
      hash,
      state_name,
      contextJson,
      dbReminderTime,
    ]);

    // Get user_id (either newly created or existing)
    const userId = await getUserId(telegram_id);
    return userId;

  } catch (error) {
    console.error("Error setting state:", error);
    throw error;
  }
}


/**
 * Clear user's state (set to null)
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @returns {Promise<void>}
 */
async function clearState(telegram_id) {
  try {
    const hash = hashTelegramId(telegram_id);
    const sql = `
      UPDATE ms_user
      SET current_state = NULL, context_data = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id_hash = ?
    `;
    await db.execute(sql, [hash]);
  } catch (error) {
    console.error("Error clearing state:", error);
    throw error;
  }
}

/**
 * Get context data for user
 * @param {number} telegram_id - Telegram user ID (plaintext)
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
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @param {Object} contextUpdates - Object with fields to merge into context
 * @returns {Promise<void>}
 */
async function updateContext(telegram_id, contextUpdates) {
  try {
    const hash = hashTelegramId(telegram_id);
    const currentContext = await getContext(telegram_id);
    const mergedContext = { ...currentContext, ...contextUpdates };
    
    const sql = `
      UPDATE ms_user
      SET context_data = ?, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_id_hash = ?
    `;
    await db.execute(sql, [JSON.stringify(mergedContext), hash]);
  } catch (error) {
    console.error("Error updating context:", error);
    throw error;
  }
}

/**
 * Check if user state has timed out (> 5 minutes old)
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @returns {Promise<boolean>} True if timed out, false otherwise
 */
async function isStateTimedOut(telegram_id) {
  try {
    const hash = hashTelegramId(telegram_id);
    const sql = "SELECT updated_at, current_state FROM ms_user WHERE telegram_id_hash = ?";
    const [rows] = await db.execute(sql, [hash]);
    
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

/**
 * Set state WITHOUT changing context data (preserves existing context)
 * Safe to use when you only want to change the state
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @param {string} state_name - New state name
 * @param {string} reminder_time - Reminder time (optional)
 * @returns {Promise<number>} Returns user_id
 */
async function setStateOnly(telegram_id, state_name, reminder_time = "18:00:00") {
  try {
    const currentState = await getState(telegram_id);
    const currentContext = currentState.context_data || {};
    
    // Call setState with existing context to preserve it
    const userId = await setState(telegram_id, state_name, currentContext, reminder_time);
    return userId;
  } catch (error) {
    console.error("Error setting state only:", error);
    throw error;
  }
}

/**
 * Validate that user is NOT in any active state flow
 * Prevents old inline keyboard buttons from executing commands in wrong state
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @returns {Promise<boolean>} True if user has NO active state (state is null)
 * @throws {Error} If user is in an active state
 */
async function assertStateIsNull(telegram_id) {
  try {
    const userState = await getState(telegram_id);
    
    if (userState.current_state !== null) {
      throw new Error(
        `USER_IN_ACTIVE_STATE:${userState.current_state}`
      );
    }
    
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Validate that user is in one of the expected states
 * Used in multi-step flows to ensure step callbacks are triggered in correct state
 * @param {number} telegram_id - Telegram user ID (plaintext)
 * @param {string|string[]} expectedStates - Single state name or array of valid state names
 * @returns {Promise<string>} Current state if valid
 * @throws {Error} If user is not in one of the expected states
 */
async function assertState(telegram_id, expectedStates) {
  try {
    const userState = await getState(telegram_id);
    const statesArray = Array.isArray(expectedStates) ? expectedStates : [expectedStates];
    
    if (!statesArray.includes(userState.current_state)) {
      throw new Error(
        `INVALID_STATE:Expected ${statesArray.join('|')} but got ${userState.current_state}`
      );
    }
    
    return userState.current_state;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getUserId,
  getState,
  setState,
  clearState,
  getContext,
  updateContext,
  isStateTimedOut,
  setStateOnly,
  assertStateIsNull,
  assertState
};
