const { Bot } = require("grammy");
const cron = require("node-cron");
const dotenv = require("dotenv");
const { startCron } = require("./cron/runner");
const logger = require("./services/logger");

const QRCode = require("qrcode");
const { InputFile } = require("grammy");

dotenv.config();

logger.info("🤖 Initializing bot...");
logger.debug(`Log level: ${process.env.LOG_LEVEL || "INFO"}`, {
  logsDir: logger.getLogFilePath().replace(/\/[^/]*\.log$/, ""),
});

const bot = new Bot(process.env.BOT_TOKEN);

const TELEGRAM_ID_OWNER = process.env.TELEGRAM_ID_OWNER;logger.debug(`Bot initialized with token`);

// ========== IMPORT COMMANDS ==========
const startCommand = require("./commands/start");
const startWithCodeCommand = require("./commands/start_with_code");
const { 
  generateRefCommand,   // urutan 1
  setDuration,// fungsi urutan 2  
  setManpower // fungsi urutan 3
} = require("./commands/generate_ref");
const {testCheckpoint} = require("./commands/await_checkpoint");
const {skipCheckpoint} = require("./commands/await_checkpoint");
const listUserCommand = require("./commands/list_user");
const listTaskCommand = require("./commands/list_task");
const {editTaskMenu, proceedTaskEdit, targetQuestion, descriptionQuestion, descriptionEdit } = require("./commands/edit_task");
const { addTaskCommand, addTaskStep4aDaily, addTaskStep4bCustom, extendTask } = require("./commands/add_task");
const { removeTaskCommand, removeTaskConfirm } = require("./commands/remove_task");
const userReminder = require("./commands/set_user_reminder_time");
const cancelCommand = require("./commands/cancel");
const demoRouter = require("./commands/demo");
const statusCommand = require("./commands/status");
const { getTeksBalasan } = require("./services/textService");

// LAPOR PAK Commands
const { laporCommand } = require("./commands/lapor");
const { laporansayaCommand } = require("./commands/laporansaya");
const { 
  handleDetailLaporanCallback, 
  handleAddFeedbackCallback, 
  handleCloseReportCallback 
} = require("./commands/laporan_detail");
const { 
  assignPICCommand, 
  handleSelectPICCallback 
} = require("./commands/assign_pic");
const { 
  addUpdateCommand, 
  handleSelectPICCallback: handleUpdateSelectCallback 
} = require("./commands/add_update");
const { listTugasCommand } = require("./commands/list_tugas");
const { approveCommand } = require("./commands/approve");
const { 
  addMemberCommand, 
  handleMemberRoleCallback, 
  removeMemberCommand, 
  handleRemoveMemberCallback, 
  listMemberCommand 
} = require("./commands/team_management");


const  {
  handleApproveReportCallback,
  handleRejectReportCallback,
  handleApproveFeedbackCallback,
  handleRejectFeedbackCallback,
  handleApproveUpdateCallback,
  handleRejectUpdateCallback,
} = require("./commands/approval_handlers");
const { summaryCommand } = require("./commands/summary");

// ========== IMPORT MIDDLEWARE ==========
const stateMiddleware = require("./middleware/stateMiddleware");
const messageRouter = require("./middleware/messageRouter");
const {updateProgress, createProgress, doneTask} = require("./commands/progress_task");

// ========== APPLY MIDDLEWARE ==========
// State middleware must be applied BEFORE command handlers to attach state to context
bot.use(stateMiddleware);
bot.use(demoRouter);

// ========== HANDLE DYNAMIC COMMANDS (before messageRouter) ==========
// Handle /start_CODE123 and /generate_ref_CODE123 commands
bot.on("message:text", async (ctx, next) => {
  let messageText = ctx.message.text || "";

  // TAMBAHKAN INI: Normalisasi format spasi dari link Telegram menjadi underscore
  if (messageText.startsWith("/start ")) {
    messageText = messageText.replace("/start ", "/start_");
    // Update juga ctx.message.text agar fungsi startWithCodeCommand menerima teks yang sudah rapi
    ctx.message.text = messageText; 
  }
  // Handle /start_CODE123
  if (/^\/start_/.test(messageText)) {
    return await startWithCodeCommand(ctx);
  }

  // Handle /generate_ref_CODE123
  // if (/^\/generate_ref_/.test(messageText)) {
  //   return await generateRefCommand(ctx);  /*lihat di constanta di baris 16 => generate_ref.js [commmand]*/
  // }

  // Pass through to next handler (messageRouter)
  return next();
});

// ========== REGISTER COMMANDS ==========
bot.command("start", startCommand);
bot.command("newref", generateRefCommand);
// bot.command("list_user", listUserCommand);
bot.command("list_task", listTaskCommand);
bot.command("new_task", addTaskCommand);
bot.command("remove_task", removeTaskCommand);
bot.command("update",testCheckpoint );
bot.command("status", statusCommand);
bot.command("cancel", cancelCommand);
bot.command("qr", async (ctx) => {
  const text = ctx.match || "default data dari backend";

  const buffer = await QRCode.toBuffer(text);

  await ctx.replyWithPhoto(new InputFile(buffer, "qr.png"), {
    caption: "Ini QR code kamu",
  });
});

// LAPOR PAK Commands
bot.command("lapor", laporCommand);
bot.command("laporansaya", laporansayaCommand);
bot.command("pic", assignPICCommand);
bot.command("update", addUpdateCommand);
bot.command("listtugas", listTugasCommand);
bot.command("approve", approveCommand);
bot.command("addmember", addMemberCommand);
bot.command("removemember", removeMemberCommand);
bot.command("listmember", listMemberCommand);
bot.command("summary", summaryCommand);


bot.command("testgroup", async (ctx) => {
  try {
    const TEAM_GROUP_ID = process.env.TEAM_GROUP_ID;
    
    if (!TEAM_GROUP_ID) {
      return ctx.reply("❌ TEAM_GROUP_ID tidak diset di environment");
    }
    
    await ctx.api.sendMessage(
      TEAM_GROUP_ID,
      "🧪 Test notifikasi dari bot - LAPOR PAK System",
      { parse_mode: "HTML" }
    );
    
    await ctx.reply("✅ Test notifikasi terkirim ke group!");
  } catch (error) {
    console.error("Error testing group:", error);
    await ctx.reply(`❌ Error: ${error.message}`);
  }
});
// ========== HANDLE CALLBACK QUERIES (Button Clicks) ==========
bot.on("callback_query:data", async (ctx) => {

  logger.debug(`Callback data received`, {
    userId: ctx.state.telegram_id,
    data: ctx.callbackQuery.data,
  });
  try {
    const callbackData = ctx.callbackQuery.data;
    const telegram_id = ctx.state.telegram_id;

    // ====extraksi untuk call back yang ada argument 
    // ====Idetifikasi dengan dilimiter `:`
    let action = callbackData;
    let params; //ini array apabila nanti mau passing banyak argument
    
    if (action.includes(':')) {
      const bagianData = callbackData.split(':');
      action = bagianData[0];
      params =  bagianData.slice(1);
     
    } 



    // Route callback data to handlers
    switch (action) {
      case "cancel":
        await cancelCommand(ctx);
        break;

      case "confirm_remove_yes":
        await removeTaskConfirm(ctx, true);
        break;

      case "confirm_remove_no":
        await removeTaskConfirm(ctx, false);
        break;

      case "add_task":
        await addTaskCommand(ctx);
        break;

      case "remove_task":
        await removeTaskCommand(ctx);
        break;

      case "list_task":
        await listTaskCommand(ctx);
        break;

      case "interval_daily":
        await addTaskStep4aDaily(ctx);
        break;

      case "interval_custom":
        await addTaskStep4bCustom(ctx);
        break;

      case "list_user":
        await listUserCommand(ctx);
        break;
      case "generate_key":
        await generateRefCommand(ctx);
        break;
      case "20_duration_reference":
        await setDuration(ctx, "20");
        break;
      case "60_duration_reference":
        await setDuration(ctx, "60");
        break;
      case "task_done":
        await createProgress(ctx, 1, params[0]);
        break;
      case "task_miss":
        await createProgress(ctx, 0, params[0]);
        break;

      case "progress":
        await updateProgress(ctx, params[0]);
        break;

      case "extend_phase":
        await extendTask(ctx);
        break;

      case "done_phase":
        await doneTask(ctx );
        break;
      case "update_via_reminder":
        await testCheckpoint(ctx);
        break;

      case "skip_update":
        await skipCheckpoint(ctx);
        break;

      case "edit_task":
        await editTaskMenu(ctx);
        break;

      case "set_reminder_time":
        await userReminder.settingReminderMenu(ctx)
        break;

      case "edit_description_name":
        await descriptionEdit(ctx);
       
        break;

      case "skip_edit_description_name":
       await targetQuestion(ctx);
        break;

      // LAPOR PAK Callbacks
      case "lapor_pak_menu":
        // Show LAPOR PAK menu based on user role
        if (ctx.state.isSuperUser) {
          await ctx.editMessageText(
            "<b>🔑 Menu Super User</b>\n\n" +
            "Pilih aksi:",
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📬 Antrian Persetujuan", callback_data: "show_approve" }],
                  [{ text: "📋 Semua Laporan", callback_data: "show_listall" }],
                  [{ text: "👥 Kelola Anggota", callback_data: "show_manage_team" }],
                  [{ text: "📊 Summary", callback_data: "show_summary" }],
                  [{ text: "⬅️ Kembali", callback_data: "back_to_menu" }],
                ]
              }
            }
          );
        } else if (ctx.state.isTeamMember) {
          await ctx.editMessageText(
            "<b>🏢 Menu Tim Follow-up</b>\n\n" +
            "Pilih aksi:",
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📋 Daftar Laporan", callback_data: "show_listlaporan" }],
                  [{ text: "👤 Tunjuk PIC", callback_data: "show_pic" }],
                  [{ text: "📝 Tambah Update", callback_data: "show_update" }],
                  [{ text: "📋 Tugas Saya", callback_data: "show_tugas" }],
                  [{ text: "⬅️ Kembali", callback_data: "back_to_menu" }],
                ]
              }
            }
          );
        } else {
          await ctx.editMessageText(
            "<b>📋 Menu Lapor Pak</b>\n\n" +
            "Pilih aksi:",
            {
              parse_mode: "HTML",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📝 Laporan Baru", callback_data: "new_laporan" }],
                  [{ text: "📋 Laporan Saya", callback_data: "my_laporan" }],
                  [{ text: "⬅️ Kembali", callback_data: "back_to_menu" }],
                ]
              }
            }
          );
        }
        break;

      case "new_laporan":
        await laporCommand(ctx);
        break;

      case "my_laporan":
        await laporansayaCommand(ctx);
        break;

      case "back_to_laporansaya":
        await laporansayaCommand(ctx);
        break;

      case "show_approve":
        await approveCommand(ctx);
        break;

      case "show_manage_team":
        await ctx.editMessageText(
          "<b>👥 Kelola Anggota Tim</b>\n\n" +
          "Pilih aksi:",
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "➕ Tambah Anggota", callback_data: "add_member_start" }],
                [{ text: "➖ Hapus Anggota", callback_data: "remove_member_start" }],
                [{ text: "📋 Daftar Anggota", callback_data: "list_member_show" }],
                [{ text: "⬅️ Kembali", callback_data: "lapor_pak_menu" }],
              ]
            }
          }
        );
        break;

      case "add_member_start":
        await addMemberCommand(ctx);
        break;

      case "remove_member_start":
        await removeMemberCommand(ctx);
        break;

      case "list_member_show":
        await listMemberCommand(ctx);
        break;

      case "show_pic":
        await assignPICCommand(ctx);
        break;

      case "show_update":
        await addUpdateCommand(ctx);
        break;

      case "show_tugas":
        await listTugasCommand(ctx);
        break;

      case "show_summary":
        await summaryCommand(ctx);
        break;

      case "back_to_menu":
        // Back to start menu
        await ctx.editMessageText(getTeksBalasan(), {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📋 Daftar Task", callback_data: "list_task" }],
              [{ text: "📋 Lapor Pak", callback_data: "lapor_pak_menu" }],
              [{ text: "🗝️ Generate Reference Code", callback_data: "generate_key" }],
            ]
          }
        });
        break;

      // LAPOR PAK Report Detail Callbacks
      default:
        if (callbackData.startsWith("detail_laporan_")) {
          await handleDetailLaporanCallback(ctx);
        } else if (callbackData.startsWith("add_feedback_")) {
          await handleAddFeedbackCallback(ctx);
        } else if (callbackData.startsWith("close_laporan_")) {
          await handleCloseReportCallback(ctx);
        } else if (callbackData.startsWith("select_pic_")) {
          await handleSelectPICCallback(ctx);
        } else if (callbackData.startsWith("member_role_")) {
          await handleMemberRoleCallback(ctx);
        } else if (callbackData.startsWith("remove_member_")) {
          await handleRemoveMemberCallback(ctx);
        } else if (callbackData.startsWith("approve_report_")) {
          await handleApproveReportCallback(ctx);
        } else if (callbackData.startsWith("reject_report_")) {
          await handleRejectReportCallback(ctx);
        } else if (callbackData.startsWith("approve_feedback_")) {
          await handleApproveFeedbackCallback(ctx);
        } else if (callbackData.startsWith("reject_feedback_")) {
          await handleRejectFeedbackCallback(ctx);
        } else if (callbackData.startsWith("approve_update_")) {
          await handleApproveUpdateCallback(ctx);
        } else if (callbackData.startsWith("reject_update_")) {
          await handleRejectUpdateCallback(ctx);
        } else {
          await ctx.answerCallbackQuery("Tombol aksi tidak dikenali");
        }
        break;
    }
  } catch (error) {
    logger.error("Error handling callback query", {
      userId: ctx.state?.telegram_id,
      callbackData: ctx.callbackQuery?.data,
      error: error.message,
      stack: error.stack,
    });
    await ctx.answerCallbackQuery("Error Recognizing Callback Action.");
  }
});

// ========== HANDLE TEXT MESSAGES ==========
// Route text messages to step handlers based on user state
bot.on("message:text", messageRouter);


// ========== DETEKSI BOT DITAMBAHKAN KE GROUP ==========
bot.on("my_chat_member", async (ctx) => {
  try {
    const chat = ctx.myChatMember.chat;
    const newStatus = ctx.myChatMember.new_chat_member.status;
    const oldStatus = ctx.myChatMember.old_chat_member?.status;
    
    // Bot baru ditambahkan ke chat (group/supergroup/channel)
    if (newStatus === "member" || newStatus === "administrator") {
      const chatId = chat.id;
      const chatTitle = chat.title || "Unnamed";
      const chatType = chat.type; // "group", "supergroup", "channel"
      
      // Log ke console dengan warna
      console.log("\x1b[32m%s\x1b[0m", `✅ Bot ditambahkan ke ${chatType}:`);
      console.log(`   📝 Nama Group: ${chatTitle}`);
      console.log(`   🆔 ID Group: ${chatId}`);
      console.log(`   📊 Type: ${chatType}`);
      console.log(`   👤 Status: ${newStatus}`);
      
      // Log ke file logger juga
      logger.info(`Bot added to chat`, {
        chatId: chatId,
        chatTitle: chatTitle,
        chatType: chatType,
        status: newStatus,
        timestamp: new Date().toISOString()
      });
      
      // Opsional: Kirim pesan ke group bahwa bot sudah aktif
      await ctx.api.sendMessage(
        chatId,
        `🤖 Bot aktif!\n\n` +
        `📋 Gunakan /start untuk memulai.\n` +
        `🆔 ID Group ini: <code>${chatId}</code>`,
        { parse_mode: "HTML" }
      );
      
      // Opsional: Simpan ID group ke database atau environment variable
      // await db.execute(
      //   `INSERT INTO group_settings (group_id, group_name, is_active) 
      //    VALUES (?, ?, TRUE) 
      //    ON DUPLICATE KEY UPDATE group_name = ?, is_active = TRUE`,
      //   [chatId, chatTitle, chatTitle]
      // );
      
    } else if (newStatus === "left" || newStatus === "kicked") {
      // Bot dikeluarkan dari group
      console.log("\x1b[31m%s\x1b[0m", `❌ Bot dikeluarkan dari group:`);
      console.log(`   🆔 ID: ${chat.id}`);
      console.log(`   📝 Nama: ${chat.title}`);
      
      logger.warn(`Bot removed from chat`, {
        chatId: chat.id,
        chatTitle: chat.title,
        oldStatus: oldStatus,
        newStatus: newStatus
      });
    }
    
  } catch (error) {
    console.error("Error in my_chat_member handler:", error);
    logger.error("Error handling my_chat_member", { error: error.message });
  }
});

logger.success(" Bot is running successfully!", {
  botToken: process.env.BOT_TOKEN ? "✓ configured" : "✗ missing",
  superUserId: process.env.SUPER_USER_ID || "not configured",
  teamGroupId: process.env.TEAM_GROUP_ID || "not configured",
  logFile: logger.getLogFilePath(),
  logsDir: logger.getLogFilePath().replace(/\/[^/]*\.log$/, ""),
});

logger.info("Ready to accept messages=> setTimeout(r, 5000));");

// ========== START BOT ==========
bot.start();

startCron();

// fungsi kirim 3 kali
async function sendThreeTimes() {
  for (let i = 0; i < 3; i++) {
    await bot.api.sendMessage(TELEGRAM_ID_OWNER, `halo ke-${i + 1}`);

    // delay biar tidak spam sekaligus
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// cron.schedule("* * * * *", async () => {
//   console.log("Running scheduled task...");
//   await sendThreeTimes();
// });

console.log("✅ Bot running...");



  // kalau ada pesan
  // bot.on("message:text", (ctx) => {
  //   ctx.reply("Halo! Kamu bilang: " + ctx.message.text);
  // });
  // bot.on("message:text")      // pesan teks
  // bot.on("message:photo")     // gambar
  // bot.on("message:video")     // video
  // bot.on("message:audio")     // audio
  // bot.on("message:document")  // file
  



