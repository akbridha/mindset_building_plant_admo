const { Bot } = require("grammy");
const cron = require("node-cron");
const dotenv = require("dotenv");
const { startCron } = require("./cron/runner");

const QRCode = require("qrcode");
const { InputFile } = require("grammy");

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);

const TELEGRAM_ID_OWNER = process.env.TELEGRAM_ID_OWNER;


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


// ========== HANDLE CALLBACK QUERIES (Button Clicks) ==========
bot.on("callback_query:data", async (ctx) => {

  console.log(ctx.callbackQuery.data);
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

    // Answer callback query to remove "loading" state from button
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error handling callback query. Location index.js:callback_query:data:", error);
    await ctx.answerCallbackQuery("Error Recognizing Callback Action.");
  }
});

// ========== HANDLE TEXT MESSAGES ==========
// Route text messages to step handlers based on user state
bot.on("message:text", messageRouter);

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
  



