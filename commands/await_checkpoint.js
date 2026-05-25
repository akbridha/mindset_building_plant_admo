const taskService = require ("../services/taskService");
const stateService = require("../services/stateService");
// const { removeTaskConfirm } = require("./remove_task");







// const db = require

async function testCheckpoint(ctx) {
    // const telegram_id = ctx.state.telegram_id;

    // await stateService.setState(telegram_id, "await_user_checkpoint_response");

    // // const dataTask = await taskService.getAllTasks(telegram_id)
    // const userData = await stateService.getState(telegram_id);
    // const currentState = userData.current_state;

    // const allUserTask 

    // // cosn removeTaskConfirm

    // return ctx.reply(currentState);


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
            "⚠️ Anda sudah berada di tengah alur proses.\n\n" +
            "Gunakan  /cancel untuk restart."
          );
        }
    
        // Fetch all tasks
        const tasks = await taskService.getAllTasks(telegram_id);
    
        if (tasks.length === 0) {
          return ctx.reply("📋 Anda tidak punya task untuk diupdate.");
        }
    
        // Set state to awaiting task selection for removal
        await stateService.setState(
          telegram_id,
          "awaiting_task_selection_for_update_progress",
          {}
        );
    
        // Format task list with emoji numbers
        const emojiNumbers = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
        let taskList = "🗑️ <b>Pilih task yang ingin diupdate:</b>\n\n";
    
        tasks.forEach((task, index) => {
          const emoji = emojiNumbers[index] || `${index + 1}.`;
          taskList += `${emoji} <b>${task.task_description}</b>\n`;
        });
    
        taskList += "\n<i>Kirim nomor task yang hendak diupdate progress</i>";
    
        // Store task list in context for reference
        await stateService.updateContext(telegram_id, { 
          task_list: tasks.map((t, i) => ({ index: i + 1, task_id: t.task_id, description: t.task_description }))
        });
    
        return ctx.reply(taskList, {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "❌ Batal", callback_data: "cancel" }]
            ]
          }
        });
      } catch (error) {
        console.error("Error in removeTaskCommand:", error);
        return ctx.reply("❌ Error loading tasks. Mohon Coba lagi.");
      }
    
}

module.exports = {testCheckpoint}