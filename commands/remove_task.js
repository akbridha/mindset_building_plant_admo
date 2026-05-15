const stateService = require("../services/stateService");
const taskService = require("../services/taskService");

/**
 * /remove_task command handler - Step 1: Show task list
 * Initiates the multi-step task removal flow
 */
async function removeTaskCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const currentState = ctx.state.userState;

    // Check if already in progress
    if (currentState !== null) {
      return ctx.reply(
        "⚠️ You're already in the middle of a task flow.\n\n" +
        "Use /cancel to restart."
      );
    }

    // Fetch all tasks
    const tasks = await taskService.getAllTasks(telegram_id);

    if (tasks.length === 0) {
      return ctx.reply("📋 You have no tasks to remove.");
    }

    // Set state to awaiting task selection for removal
    await stateService.setState(
      telegram_id,
      "awaiting_task_selection_for_removal",
      {}
    );

    // Format task list with emoji numbers
    const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    let taskList = "🗑️ <b>Select a task to remove:</b>\n\n";

    tasks.forEach((task, index) => {
      const emoji = emojiNumbers[index] || `${index + 1}.`;
      taskList += `${emoji} <b>${task.task_description}</b> (${task.checkpoint_time})\n`;
    });

    taskList += "\n<i>Send the task number or tap the button</i>";

    // Store task list in context for reference
    await stateService.updateContext(telegram_id, { 
      task_list: tasks.map((t, i) => ({ index: i + 1, task_id: t.task_id, description: t.task_description }))
    });

    return ctx.reply(taskList, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "❌ Cancel", callback_data: "cancel" }]
        ]
      }
    });
  } catch (error) {
    console.error("Error in removeTaskCommand:", error);
    return ctx.reply("❌ Error loading tasks. Please try again.");
  }
}

/**
 * Step 2: Handle task selection for removal
 */
async function removeTaskStep2(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;

    // Parse user input as number
    const selectedIndex = parseInt(userInput, 10);

    // Validate selection
    if (isNaN(selectedIndex) || selectedIndex < 1 || !context.task_list) {
      return ctx.reply(
        "❌ Invalid task number. Please select a valid task from the list.\n\n" +
        "Try again or /cancel"
      );
    }

    // Find selected task
    const selectedTaskInfo = context.task_list.find(t => t.index === selectedIndex);
    if (!selectedTaskInfo) {
      return ctx.reply(
        "❌ Task number out of range. Please select a valid task.\n\n" +
        "Try again or /cancel"
      );
    }

    // Verify task exists in database
    const task = await taskService.getTaskById(selectedTaskInfo.task_id);
    if (!task || task.telegram_id !== telegram_id) {
      return ctx.reply(
        "❌ Task not found or invalid. Please try again."
      );
    }

    // Update context with selected task
    await stateService.updateContext(telegram_id, {
      selected_task_id: selectedTaskInfo.task_id,
      selected_task_description: selectedTaskInfo.description
    });

    // Move to confirmation step
    await stateService.setState(
      telegram_id,
      "awaiting_remove_confirmation",
      { ...context, selected_task_id: selectedTaskInfo.task_id, selected_task_description: selectedTaskInfo.description }
    );

    return ctx.reply(
      "❓ <b>Are you sure?</b>\n\n" +
      "Delete task: <b>" + selectedTaskInfo.description + "</b>\n\n" +
      "This action cannot be undone.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Yes, Delete", callback_data: "confirm_remove_yes" },
              { text: "❌ No, Cancel", callback_data: "confirm_remove_no" }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in removeTaskStep2:", error);
    return ctx.reply("❌ Error processing selection. Please try again.");
  }
}

/**
 * Step 3: Handle removal confirmation
 */
async function removeTaskConfirm(ctx, confirmed) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;
    const taskId = context.selected_task_id;
    const taskDescription = context.selected_task_description;

    // Clear state first
    await stateService.clearState(telegram_id);

    if (confirmed) {
      // Delete task
      const deleted = await taskService.deleteTask(taskId);

      if (deleted) {
        return ctx.reply(
          "✅ <b>Task deleted successfully!</b>\n\n" +
          "🗑️ " + taskDescription + " has been removed.",
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📋 View Tasks", callback_data: "list_task" }]
              ]
            }
          }
        );
      } else {
        return ctx.reply(
          "❌ Error deleting task. Please try again later."
        );
      }
    } else {
      return ctx.reply(
        "❌ <b>Cancelled.</b>\n\n" +
        "Task kept safe.",
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📋 View Tasks", callback_data: "list_task" }]
            ]
          }
        }
      );
    }
  } catch (error) {
    console.error("Error in removeTaskConfirm:", error);
    await stateService.clearState(telegram_id);
    return ctx.reply("❌ Error processing removal. Please try again.");
  }
}

module.exports = {
  removeTaskCommand,
  removeTaskStep2,
  removeTaskConfirm
};
