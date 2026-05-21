const stateService = require("../services/stateService");
const taskService = require("../services/taskService");
const referenceService = require("../services/referenceService");

/**
 * /add_task command handler - Step 1: Initial prompt
 * Initiates the multi-step task creation flow
 * Validates reference code status before allowing operation
 */
async function addTaskCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const currentState = ctx.state.userState;
    const isAdmin = ctx.state.isAdmin;
    const referenceCode = ctx.state.referenceCode;

    // Check reference code status if user has one (non-admin users)
    if (!isAdmin && referenceCode) {
      const isValid = await referenceService.isReferenceCodeValid(referenceCode);
      if (!isValid) {
        return ctx.reply(
          "❌ Reference code Anda sudah ditutup oleh admin.\n\n" +
          "Hubungi admin untuk mendapatkan reference code baru."
        );
      }
    }

    // If user is not admin and has no reference code, reject
    if (!isAdmin && !referenceCode) {
      return ctx.reply(
        "❌ Anda tidak authorized untuk menggunakan fitur ini.\n\n" +
        "Silakan lakukan /start_[REFERENCE_CODE] terlebih dahulu."
      );
    }

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
      "Buat Nama Task \n" +
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

    // Move to step 3
    await stateService.setState(
      telegram_id,
      "awaiting_checkpoint_time",
      { task_description: taskDescription.trim() }
    );

    return ctx.reply(
      "✅ Task description saved: <b>" + taskDescription.trim() + "</b>\n\n" +
      "⏰ <b>Jam berapa reminder pertama kali dikirimkan?</b>\n" +
      "Kirim dalam format <code>HH:MM</code> (24-hour)\n\n" +
      "Contoh: <code>14:30</code> untuk Jam 2:30 sore",
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
        "❌ Format Waktu Invalid.\n\n" +
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

    // Move to step 4: Ask for interval type
    await stateService.setState(
      telegram_id,
      "awaiting_interval_type",
      { ...context, checkpoint_time: checkpointTime }
    );

    return ctx.reply(
      "✅ Waktu mulai reminder: <b>" + checkpointTime + "</b>\n\n" +
      "📅 <b>Kapan User hendak diberikan Reminder?</b>\n" +
      "Pilih salah satu:",
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🗓️ Harian (24:00:00)", callback_data: "interval_daily" },
              { text: "⏰ Per Jam:Menit", callback_data: "interval_custom" }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error("Error in addTaskStep3:", error);
    return ctx.reply("❌ Error processing time. Mohon Coba lagi.");
  }
}

/**
 * Step 4a: Handle interval type selection - Daily
 */
async function addTaskStep4aDaily(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;

    // Set interval to daily (24:00:00 in TIME format)
    await stateService.updateContext(telegram_id, {
      interval_type: "harian",
      interval: "24:00:00"
    });

    // Move to step 5: Ask for target/frequency
    await stateService.setState(
      telegram_id,
      "awaiting_target",
      { ...context, interval_type: "harian", interval: "24:00:00" }
    );

    return ctx.reply(
      "✅ Tipe Reminder: <b>Harian (24 jam)</b>\n\n" +
      "🎯 <b>Berapa kali reminder akan dikirimkan?</b>\n" +
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
    console.error("Error in addTaskStep4aDaily:", error);
    return ctx.reply("❌ Error processing selection. Please try again.");
  }
}

/**
 * Step 4b: Handle interval type selection - Custom
 * Ask user to input custom interval time
 */
async function addTaskStep4bCustom(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;

    // Move to step 4b: Ask for custom interval time
    await stateService.setState(
      telegram_id,
      "awaiting_interval_custom",
      { ...context, interval_type: "custom" }
    );

    return ctx.reply(
      "✅ Tipe Reminder: <b>Per Jam:Menit</b>\n\n" +
      "⏰ <b>Berapa interval setiap berapa jam:menit reminder dikirim?</b>\n" +
      "Kirim dalam format <code>HH:MM</code>\n\n" +
      "Contoh:\n" +
      "<code>01:30</code> = setiap 1 jam 30 menit\n" +
      "<code>00:30</code> = setiap 30 menit",
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
    console.error("Error in addTaskStep4bCustom:", error);
    return ctx.reply("❌ Error processing selection. Please try again.");
  }
}

/**
 * Step 4b-Extended: Handle custom interval time input
 */
async function addTaskStep4bInterval(ctx, intervalTime) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;

    // Validate time format HH:MM
    const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(intervalTime)) {
      return ctx.reply(
        "❌ Format Interval Invalid.\n\n" +
        "Gunakan format <code>HH:MM</code>\n" +
        "Contoh: <code>01:30</code> atau <code>00:30</code>\n\n" +
        "Coba lagi:",
        { parse_mode: "HTML" }
      );
    }

    // Convert HH:MM to HH:MM:00 format (TIME in MySQL)
    const intervalFormatted = intervalTime + ":00";

    // Update context with custom interval
    await stateService.updateContext(telegram_id, {
      interval_type: "custom",
      interval: intervalFormatted
    });

    // Move to step 5: Ask for target/frequency
    await stateService.setState(
      telegram_id,
      "awaiting_target",
      { ...context, interval_type: "custom", interval: intervalFormatted }
    );

    return ctx.reply(
      "✅ Interval: <b>" + intervalTime + " (setiap " + intervalTime + " jam:menit)</b>\n\n" +
      "🎯 <b>Berapa kali reminder akan dikirimkan?</b>\n" +
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
    console.error("Error in addTaskStep4bInterval:", error);
    return ctx.reply("❌ Error processing interval. Please try again.");
  }
}

/**
 * Step 5 (Final): Handle target (frequency) input and finalize task creation
 */
async function addTaskStep5(ctx, target) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;

    // Validate is number
    const targetNum = parseInt(target, 10);
    if (isNaN(targetNum) || targetNum <= 0) {
      return ctx.reply(
        "❌ Mohon kirimkan angka yang valid.\n\n" +
        "Contoh: <code>3</code>\n\n" +
        "Coba lagi:",
        { parse_mode: "HTML" }
      );
    }

    // Create task in database with dynamic interval
    const taskData = {
      task_description: context.task_description,
      checkpoint_time: context.checkpoint_time,
      target: targetNum,
      interval: context.interval  // Now dynamic!
    };

    const taskId = await taskService.createTask(telegram_id, taskData);

    // Clear state
    await stateService.clearState(telegram_id);

    const intervalDisplay = context.interval_type === "harian" 
      ? "Harian (24:00:00)" 
      : "Per " + context.interval;

    return ctx.reply(
      "✅ <b>Task Berhasil Dibuat !</b>\n\n" +
      "📝 " + context.task_description + "\n" +
      "⏰ Checkpoint: " + context.checkpoint_time + "\n" +
      "📅 Interval: " + intervalDisplay + "\n" +
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
    console.error("Error in addTaskStep5:", error);
    await stateService.clearState(telegram_id);
    return ctx.reply("❌ Error membuat task. Mohon Coba Lagi.");
  }
}

module.exports = {
  addTaskCommand,
  addTaskStep2,
  addTaskStep3,
  addTaskStep4aDaily,
  addTaskStep4bCustom,
  addTaskStep4bInterval,
  addTaskStep5
};
