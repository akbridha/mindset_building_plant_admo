const { db } = require("../db");

module.exports = async (ctx) => {

  const [rows] = await db.execute(`
    SELECT telegram_id, created_at
    FROM users
    ORDER BY id DESC
  `);

  let text = rows
    .map((r) => `${r.telegram_id} - ${r.created_at}`)
    .join("\n");

  await ctx.reply(text || "Data kosong");
};