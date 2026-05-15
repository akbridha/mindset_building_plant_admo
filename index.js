const { Bot } = require("grammy");
const dotenv = require("dotenv");

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);

// ========== IMPORT COMMANDS ==========
const startCommand = require("./commands/start");
const listUserCommand = require("./commands/list_user");
const listTaskCommand = require("./commands/list_task");
const { addTaskCommand } = require("./commands/add_task");
const { removeTaskCommand } = require("./commands/remove_task");
const cancelCommand = require("./commands/cancel");

// ========== IMPORT MIDDLEWARE ==========
const stateMiddleware = require("./middleware/stateMiddleware");
const messageRouter = require("./middleware/messageRouter");
const { removeTaskConfirm } = require("./commands/remove_task");

// ========== APPLY MIDDLEWARE ==========
// State middleware must be applied BEFORE command handlers to attach state to context
bot.use(stateMiddleware);

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

      default:
        await ctx.answerCallbackQuery("Unknown action");
    }

    // Answer callback query to remove "loading" state from button
    await ctx.answerCallbackQuery();
  } catch (error) {
    console.error("Error handling callback query:", error);
    await ctx.answerCallbackQuery("Error processing request");
  }
});

// ========== HANDLE TEXT MESSAGES ==========
// Route text messages to step handlers based on user state
bot.on("message:text", messageRouter);

// ========== START BOT ==========
bot.start();

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
  



