const { Bot } = require("grammy");
const cron = require("node-cron");
const dotenv = require("dotenv");
const { startCron } = require("./cron/runner");

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);

const TELEGRAM_ID_OWNER = process.env.TELEGRAM_ID_OWNER;


// ========== IMPORT COMMANDS ==========
const startCommand = require("./commands/start");
const startWithCodeCommand = require("./commands/start_with_code");
const generateRefCommand = require("./commands/generate_ref");
const listUserCommand = require("./commands/list_user");
const listTaskCommand = require("./commands/list_task");
const { addTaskCommand, addTaskStep4aDaily, addTaskStep4bCustom } = require("./commands/add_task");
const { removeTaskCommand, removeTaskConfirm } = require("./commands/remove_task");
const cancelCommand = require("./commands/cancel");

// ========== IMPORT MIDDLEWARE ==========
const stateMiddleware = require("./middleware/stateMiddleware");
const messageRouter = require("./middleware/messageRouter");

// ========== APPLY MIDDLEWARE ==========
// State middleware must be applied BEFORE command handlers to attach state to context
bot.use(stateMiddleware);

// ========== HANDLE DYNAMIC COMMANDS (before messageRouter) ==========
// Handle /start_CODE123 and /generate_ref_CODE123 commands
bot.on("message:text", async (ctx, next) => {
  const messageText = ctx.message.text || "";

  // Handle /start_CODE123
  if (/^\/start_/.test(messageText)) {
    return await startWithCodeCommand(ctx);
  }

  // Handle /generate_ref_CODE123
  if (/^\/generate_ref_/.test(messageText)) {
    return await generateRefCommand(ctx);
  }

  // Pass through to next handler (messageRouter)
  return next();
});

// ========== REGISTER COMMANDS ==========
bot.command("start", startCommand);
bot.command("list_user", listUserCommand);
bot.command("list_task", listTaskCommand);
bot.command("add_task", addTaskCommand);
bot.command("remove_task", removeTaskCommand);
bot.command("cancel", cancelCommand);

// ========== HANDLE CALLBACK QUERIES (Button Clicks) ==========
bot.on("callback_query:data", async (ctx) => {
  try {
    const data = ctx.callbackQuery.data;
    const telegram_id = ctx.state.telegram_id;

    // Route callback data to handlers
    switch (data) {
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

      default:
        await ctx.answerCallbackQuery("Unknown action");
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
  



