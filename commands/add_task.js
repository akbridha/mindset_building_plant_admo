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
        "⚠️ Anda tengah berada di dalam suatu alur fitur.\n\n" +
        "Gunakan /cancel untuk memulai ulang, atau selesaikan flow saat ini."
      );
    }

    // Set state to awaiting task description
    await stateService.setState(telegram_id, "awaiting_task_description", {});

    return ctx.reply(
      "📝 <b>Menambahkan task baru</b>\n\n" +
      "Buat Nama Task ?\n" +
      "<i>Kirim deskripsi teks</i>\n\n" +
      "Contoh: \n<code> - Belajar Membuat umpan pancing imitasi</code>\n <code>- Persiapan Ujian Kompetensi</code> ",
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
        "❌ Mohon masukkan deskripsi task yang valid.\n\n" +
        "Coba lagi atau /cancel"
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
        "❌ Format Waktu Invalid .\n\n" +
        "Gunakan format <code>HH:MM</code> (24-hour)\n" +
        "Contoh: <code>14:30</code>\n\n" +
        "Coba lagi:",
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
      "🎯 <b>Berapa kali reminder dikirimkan?</b>\n" +
      "Kirim dalam bentuk angka\n\n" +
      "Contoh: <code>3</code> artinya 3 total reminder",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Batal", callback_data: "cancel" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in addTaskStep3:", error);
    return ctx.reply("❌ Error processing time.Mohon Coba lagi.");
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
      "✅ <b>Task Berhasil Dibuat  !</b>\n\n" +
      "📝 " + context.task_description + "\n" +
      "⏰ " + context.checkpoint_time + "\n" +
      "🎯 " + targetNum + " reminder(s)\n\n" +
      "Gunakan /list_task untuk melihat semua task.",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📋 Lihat Task", callback_data: "list_task" }],
            [{ text: "➕ Tambah Baru", callback_data: "add_task" }]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in addTaskStep4:", error);
    await stateService.clearState(telegram_id);
    return ctx.reply("❌ Error membuat task. Mohon Coba Lagi.");
  }
}

module.exports = {
  addTaskCommand,
  addTaskStep2,
  addTaskStep3,
  addTaskStep4
};
