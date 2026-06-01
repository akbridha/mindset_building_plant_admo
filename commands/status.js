const progressService = require("../services/progressService");

function createProgressBar(percentage) {
  const barLength = 20;
  const filledLength = Math.round((percentage / 100) * barLength);
  const emptyLength = barLength - filledLength;

  const filledBar = "🟩".repeat(filledLength);
  const emptyBar = "⬜".repeat(emptyLength);

  return `${filledBar}${emptyBar}`;
}

async function statusCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Get all tasks with progress
    const tasksWithProgress = await progressService.getUserTasksWithProgress(telegram_id);

    if (!tasksWithProgress || tasksWithProgress.length === 0) {
      return ctx.reply(
        "📋 Anda tidak memiliki task yang aktif.\n\n" +
        "Gunakan /new_task untuk membuat task baru."
      );
    }

    // Build message with progress bars
    let message = "📊 <b>Status Progress Semua Task</b>\n\n";

    let totalPercentage = 0;
    tasksWithProgress.forEach((task, index) => {
      const progressBar = createProgressBar(task.percentage);
      const description = task.task_description.substring(0, 30); // Limit description length
      
      message += `${index + 1}. <b>${description}</b>\n`;
      message += `${progressBar} ${task.percentage}%\n`;
      message += `📈 ${task.progress_count}/${task.target}\n\n`;

      totalPercentage += task.percentage;
    });

    // Calculate average percentage
    const averagePercentage = Math.round(totalPercentage / tasksWithProgress.length);
    const overallBar = createProgressBar(averagePercentage);

    message += `<b>📌 Overall Progress</b>\n`;
    message += `${overallBar} ${averagePercentage}%`;

    return ctx.reply(message, {
      parse_mode: "HTML"
    });

  } catch (error) {
    console.error("Error in statusCommand:", error);
    return ctx.reply("❌ Error mengambil status task. Mohon coba lagi.");
  }
}

module.exports = statusCommand;
