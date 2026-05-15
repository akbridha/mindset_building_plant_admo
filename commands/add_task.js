const stateService = require("../services/stateService");
const taskService = require("../services/taskService");

/**
 * /add_task command handler - Step 1: Initial prompt
 * Initiates the multi-step task creation flow
 */
async function addTaskCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const currentState = ctx.state.userState;

    // Check if already in progress
    if (currentState !== null) {
      return ctx.reply(
        "⚠️ You're already in the middle of a task flow.\n\n" +
        "Use /cancel to restart, or complete the current flow."
      );
    }

    // Set state to awaiting task description
    await stateService.setState(telegram_id, "awaiting_task_description", {});

    return ctx.reply(
      "📝 <b>Creating a new task</b>\n\n" +
      "What should this task be about?\n" +
      "<i>Send a text description</i>\n\n" +
      "Example: <code>Water plants</code>",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in addTaskCommand:", error);
    return ctx.reply("❌ Error starting task creation. Please try again.");
  }
}

/**
 * Step 2: Handle task description input
 */
async function addTaskStep2(ctx, taskDescription) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Validate input
    if (!taskDescription || taskDescription.trim().length === 0) {
      return ctx.reply(
        "❌ Please enter a valid task description.\n\n" +
        "Try again or /cancel"
      );
    }

    // Update state with task description
    await stateService.updateContext(telegram_id, { 
      task_description: taskDescription.trim() 
    });

    // Move to step 2
    await stateService.setState(
      telegram_id,
      "awaiting_checkpoint_time",
      { task_description: taskDescription.trim() }
    );

    return ctx.reply(
      "✅ Task description saved: <b>" + taskDescription.trim() + "</b>\n\n" +
      "⏰ <b>What time should the reminder trigger?</b>\n" +
      "Send in <code>HH:MM</code> format (24-hour)\n\n" +
      "Example: <code>14:30</code> for 2:30 PM",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in addTaskStep2:", error);
    return ctx.reply("❌ Error processing description. Please try again.");
  }
}

/**
 * Step 3: Handle checkpoint time input
 */
async function addTaskStep3(ctx, checkpointTime) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;

    // Validate time format HH:MM
    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(checkpointTime)) {
      return ctx.reply(
        "❌ Invalid time format.\n\n" +
        "Use <code>HH:MM</code> format (24-hour)\n" +
        "Example: <code>14:30</code>\n\n" +
        "Try again:",
        { parse_mode: "HTML" }
      );
    }

    // Update context with checkpoint time
    await stateService.updateContext(telegram_id, { 
      checkpoint_time: checkpointTime 
    });

    // Move to step 3
    await stateService.setState(
      telegram_id,
      "awaiting_target",
      { ...context, checkpoint_time: checkpointTime }
    );

    return ctx.reply(
      "✅ Checkpoint time saved: <b>" + checkpointTime + "</b>\n\n" +
      "🎯 <b>How many times should you be reminded?</b>\n" +
      "Send a number\n\n" +
      "Example: <code>3</code> means 3 reminders total",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in addTaskStep3:", error);
    return ctx.reply("❌ Error processing time. Please try again.");
  }
}

/**
 * Step 4: Handle target (frequency) input and finalize task creation
 */
async function addTaskStep4(ctx, target) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;

    // Validate is number
    const targetNum = parseInt(target, 10);
    if (isNaN(targetNum) || targetNum <= 0) {
      return ctx.reply(
        "❌ Please send a valid number.\n\n" +
        "Example: <code>3</code>\n\n" +
        "Try again:",
        { parse_mode: "HTML" }
      );
    }

    // Create task in database
    const taskData = {
      task_description: context.task_description,
      checkpoint_time: context.checkpoint_time,
      target: targetNum,
      interval: "once"
    };

    const taskId = await taskService.createTask(telegram_id, taskData);

    // Clear state
    await stateService.clearState(telegram_id);

    return ctx.reply(
      "✅ <b>Task created successfully!</b>\n\n" +
      "📝 " + context.task_description + "\n" +
      "⏰ " + context.checkpoint_time + "\n" +
      "🎯 " + targetNum + " reminder(s)\n\n" +
      "Use /list_task to see all tasks.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 View Tasks", callback_data: "list_task" }],
            [{ text: "➕ Add Another", callback_data: "add_task" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in addTaskStep4:", error);
    await stateService.clearState(telegram_id);
    return ctx.reply("❌ Error creating task. Please try again.");
  }
}

module.exports = {
  addTaskCommand,
  addTaskStep2,
  addTaskStep3,
  addTaskStep4
};
