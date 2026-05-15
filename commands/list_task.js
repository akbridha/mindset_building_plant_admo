const taskService = require("../services/taskService");

/**
 * /list_task command handler
 * Lists all open tasks for the user
 */
async function listTaskCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Fetch all tasks for user
    const tasks = await taskService.getAllTasks(telegram_id);

    if (tasks.length === 0) {
      return ctx.reply(
        "📋 You have no tasks yet.\n\n" +
        "Use /add_task to create a new task!",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "➕ Add Task", callback_data: "add_task" }]
            ]
          }
        }
      );
    }

    // Format task list with emoji numbers
    const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    let taskList = "📋 <b>Your Tasks:</b>\n\n";

    tasks.forEach((task, index) => {
      const emoji = emojiNumbers[index] || `${index + 1}.`;
      const status = task.progress >= task.target ? "✅" : "⏳";
      taskList += `${emoji} <b>${task.task_description}</b>\n`;
      taskList += `   ⏰ ${task.checkpoint_time} | 🎯 ${task.progress}/${task.target} ${status}\n\n`;
    });

    taskList += "\n<i>Tap /list_task to refresh</i>";

    return ctx.reply(taskList, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "➕ Add Task", callback_data: "add_task" }],
          [{ text: "🗑️ Remove Task", callback_data: "remove_task" }]
        ]
      }
    });
  } catch (error) {
    console.error("Error in listTaskCommand:", error);
    return ctx.reply("❌ Error loading tasks. Please try again later.");
  }
}

module.exports = listTaskCommand;
