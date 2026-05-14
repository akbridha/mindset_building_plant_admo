
const { Bot } = require("grammy");
const dotenv = require("dotenv");

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);

// kalau ada pesan
// bot.on("message:text", (ctx) => {
//   ctx.reply("Halo! Kamu bilang: " + ctx.message.text);
// });

// command /start
bot.command("start", (ctx) => {
  ctx.reply("Bot aktif 🚀");
});

// bot.on("message:text")      // pesan teks
// bot.on("message:photo")     // gambar
// bot.on("message:video")     // video
// bot.on("message:audio")     // audio
// bot.on("message:document")  // file

bot.start();

console.log("Bot running...");