const { db } = require("../db");

async function progressCreate(ctx, userInput) {
  try {
    // const {

    // } = progressData;

    const sql = `
      INSERT INTO progress_history 
      (telegram_id, answer_yes_no)
      VALUES (?, ?)
    `;

    // const [result] = await db.execute(sql, [
    //   telegram_id,
    //   task_description,
    //   checkpoint_time,
    //   interval,
    //   target
    // ]);

    // return result.insertId;

    await db.execute(sql, [
      ctx.state.telegram_id,
      userInput
    ]);


  } catch (error) {
    console.error("Error creating progress:", error);
    throw error;
  }
}



module.exports = {
//   getAllTasks,
//   getTaskById,
    progressCreate
//   deleteTask,
//   updateTask
};
