const { db } = require("../db");

/**
 * Get all tasks for a user
 * @param {number} telegram_id - Telegram user ID
 * @returns {Promise<Array>} Array of task objects
 */
async function getAllTasks(telegram_id) {
  try {
    const sql = `
      SELECT task_id, telegram_id, task_description, checkpoint_time, 
             \`interval\`, target, last_date, progress, status, created_at, updated_at
      FROM reminders
      WHERE telegram_id = ? AND status = 'OPEN'
      ORDER BY created_at DESC
    `;
    const [rows] = await db.execute(sql, [telegram_id]);
    return rows;
  } catch (error) {
    console.error("Error getting all tasks:", error);
    throw error;
  }
}

/**
 * Get a single task by ID
 * @param {number} task_id - Task ID
 * @returns {Promise<Object>} Task object or null if not found
 */
async function getTaskById(task_id) {
  try {
    const sql = `
      SELECT task_id, telegram_id, task_description, checkpoint_time,
             \`interval\`, target, last_date, progress, status, created_at, updated_at
      FROM reminders
      WHERE task_id = ?
    `;
    const [rows] = await db.execute(sql, [task_id]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error getting task by ID:", error);
    throw error;
  }
}

/**
 * Create a new task for a user
 * @param {number} telegram_id - Telegram user ID
 * @param {Object} taskData - Task data object
 *   - task_description: string (required)
 *   - checkpoint_time: string HH:MM format (required)
 *   - target: number or string (required) - frequency/N-times
 *   - interval: string (optional) - default 'once'
 * @returns {Promise<number>} Inserted task_id
 */
async function createTask(telegram_id, taskData) {
  try {
    const {
      task_description,
      checkpoint_time,
      target,
      interval = "once"
    } = taskData;

    const sql = `
      INSERT INTO reminders 
      (telegram_id, task_description, checkpoint_time, \`interval\`, target, status)
      VALUES (?, ?, ?, ?, ?, 'OPEN')
    `;

    const [result] = await db.execute(sql, [
      telegram_id,
      task_description,
      checkpoint_time,
      interval,
      target
    ]);

    return result.insertId;
  } catch (error) {
    console.error("Error creating task:", error);
    throw error;
  }
}

/**
 * Delete a task by ID
 * @param {number} task_id - Task ID to delete
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteTask(task_id) {
  try {
    const sql = "DELETE FROM reminders WHERE task_id = ?";
    const [result] = await db.execute(sql, [task_id]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
}

/**
 * Update task progress/status
 * @param {number} task_id - Task ID
 * @param {Object} updates - Updates object (progress, status, last_date, etc.)
 * @returns {Promise<void>}
 */
async function updateTask(task_id, updates) {
  try {
    const allowedFields = ['progress', 'status', 'last_date'];
    const updateParts = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateParts.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updateParts.length === 0) {
      return;
    }

    updateParts.push("updated_at = CURRENT_TIMESTAMP");
    values.push(task_id);

    const sql = `UPDATE reminders SET ${updateParts.join(', ')} WHERE task_id = ?`;
    await db.execute(sql, values);
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  deleteTask,
  updateTask
};
