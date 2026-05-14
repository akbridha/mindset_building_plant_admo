
const { Bot } = require("grammy");
const dotenv = require("dotenv");

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);

// kalau ada pesan
bot.on("message:text", (ctx) => {
  ctx.reply("Halo! Kamu bilang: " + ctx.message.text);
});

// command /start
bot.command("start", (ctx) => {
  ctx.reply("Bot aktif 🚀");
});

bot.start();

console.log("Bot running...");