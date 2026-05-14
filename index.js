
const { Bot } = require("grammy");
const { db } = require( "./db.js");
const dotenv = require("dotenv");

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);


// command /start
bot.command("start", (ctx) => {
  ctx.reply("Bot aktif 🚀");
});


bot.command("list", async (ctx) => {
  const [rows] = await db.execute(`
    SELECT telegram_id, created_at 
    FROM users 
    ORDER BY id DESC
    `);
    
    let text = rows
    .map((r) => `${r.telegram_id} - ${r.created_at}`)
    .join("\n");
    
    await ctx.reply(text || "Data kosong");
  });
  // kalau ada pesan
  // bot.on("message:text", (ctx) => {
  //   ctx.reply("Halo! Kamu bilang: " + ctx.message.text);
  // });
  // bot.on("message:text")      // pesan teks
  // bot.on("message:photo")     // gambar
  // bot.on("message:video")     // video
  // bot.on("message:audio")     // audio
  // bot.on("message:document")  // file
  
  bot.start();

  console.log("Bot running...");