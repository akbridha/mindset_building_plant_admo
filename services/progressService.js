const { db } = require("../db");

async function progressCreate(ctx, userInput, task_id, note = null) {
  try {
    // const {

    // } = progressData;

    const sql = `
      INSERT INTO progress_history 
      (telegram_id, reminder_id, progress, note)
      VALUES (?, ?, ?, ?)
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
      task_id,
      userInput,
      note
    ]);


  } catch (error) {
    console.error("Error creating progress:", error);
    throw error;
  }
}


async function getProgress(taskId) {
  try {
    // 1. Perbaikan: 'ORDER BY' dipisah spasi, dan taskId diganti dengan placeholder '?'
    const sql = `
      SELECT * FROM progress_history
      WHERE reminder_id = ? 
      ORDER BY recorded_at ASC
    `;

    // 2. Perbaikan: Masukkan taskId ke dalam array sebagai parameter kedua db.execute()
    const [rows] = await db.execute(sql, [taskId]);

    if (rows.length > 0) {
      return rows; 
      // Catatan: Karena menggunakan ORDER BY ASC, ini akan mengembalikan progress yang PALING LAMA/AWAL.
      // Jika Anda ingin mengambil progress TERBARU, ganti ASC menjadi DESC.
    }

    return null;
    
  } catch (error) {
    // 3. Perbaikan: Cetak juga error aslinya agar Anda mudah melakukan debugging jika ada masalah database
    console.error("Error Mengambil Semua progress berdasarkan ID Task:", error.message);
    throw error;
  }
}

async function getProgressPercentage(taskId, dataRiwayat) {
  var targetReminder = 0;
  var totalSukses = 0;
  try {
 
    const sqlForGetFrequencyTotal = `
    SELECT target FROM reminders WHERE task_id = ?
      
    `;

    
    const [rows] = await db.execute(sqlForGetFrequencyTotal, [taskId]);
    
    if (rows.length > 0) {
      targetReminder = rows[0].target; 
      console.log(`Target Reminder ${targetReminder}`);
      
    }
    
    for (const row of dataRiwayat) {
      if (row.answer_yes_or_no === 1) {
        totalSukses++;

      }
    }
    
    console.log(`Total Sukses ${totalSukses}`);
    

    
    
  } catch (error) {
    
    console.error("Error Mengambil Semua progress berdasarkan ID Task:", error.message);
    throw error;
  }
  const hasilAverage = targetReminder > 0 ? (totalSukses / targetReminder) * 100 : 0;
  return `${hasilAverage}%`;
}



async function getUserTasksWithProgress(telegramId) {
  try {
    // Get all tasks for the user
    const sqlTasks = `
      SELECT task_id, task_description, target
      FROM reminders
      WHERE telegram_id = ? AND status = 'OPEN'
      ORDER BY created_at DESC
    `;

    const [tasks] = await db.execute(sqlTasks, [telegramId]);

    if (tasks.length === 0) {
      return null;
    }

    // For each task, get progress count and calculate percentage
    const tasksWithProgress = await Promise.all(
      tasks.map(async (task) => {
        const sqlProgress = `
          SELECT COUNT(*) as count
          FROM progress_history
          WHERE reminder_id = ?
        `;

        const [progressResult] = await db.execute(sqlProgress, [task.task_id]);
        const progressCount = progressResult[0].count || 0;
        const target = parseInt(task.target) || 1;
        const percentage = Math.min((progressCount / target) * 100, 100);

        return {
          task_id: task.task_id,
          task_description: task.task_description,
          target: target,
          progress_count: progressCount,
          percentage: Math.round(percentage)
        };
      })
    );

    return tasksWithProgress;

  } catch (error) {
    console.error("Error getting user tasks with progress:", error.message);
    throw error;
  }
}

module.exports = {
//   getAllTasks,
//   getTaskById,
    progressCreate,
    getProgress,
    getProgressPercentage,
    getUserTasksWithProgress

//   deleteTask,
//   updateTask
};
