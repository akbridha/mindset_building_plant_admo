const { getTeksBalasan } = require("../services/textService");
const stateService = require("../services/stateService");
const { encryptTelegramId } = require("../services/encryptionService");
const { db } = require("../db"); // ⬅️ JANGAN LUPA IMPORT db!

module.exports = async (ctx) => {
  try {
    const telegram_id = ctx.state.telegram_id;
    const isAdmin = ctx.state.isAdmin;

    // Only admin can use /start (without reference code)
    if (!isAdmin) {
      return ctx.reply(
        "Gunakan /start_[REFERENCE_CODE] yang diberikan untuk memulai.\n" +
        "Contoh: /start_A4BIJDDIF4XC123"
      );
    }

    // Initialize admin in database (without reference_code, preserves context)
    await stateService.setStateOnly(telegram_id, null);

    // ========== SYNC KE TABEL `users` ==========
    // Kode ini SEKARANG sudah benar karena berada di dalam fungsi async
    const encryptedId = encryptTelegramId(telegram_id);
    const [existingUsers] = await db.execute(
      `SELECT id FROM users WHERE encrypted_telegram_id = ?`, 
      [encryptedId]
    );

    if (existingUsers.length === 0) {
      await db.execute(
        `INSERT INTO users (encrypted_telegram_id, username, first_name, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [encryptedId, ctx.from.username || null, ctx.from.first_name || null]
      );
      console.log(`✅ Admin ${telegram_id} registered to users table`);
    } else {
      // Update username jika berubah
      await db.execute(
        `UPDATE users SET username = ?, first_name = ? WHERE id = ?`,
        [ctx.from.username || null, ctx.from.first_name || null, existingUsers[0].id]
      );
    }
    // ==========================================

    // Show main menu
    ctx.reply(getTeksBalasan(), {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Daftar Task", callback_data: "list_task" }],
          [{ text: "📋 Lapor Pak", callback_data: "lapor_pak_menu" }],
          [{ text: "🗝️ Generate Reference Code", callback_data: "generate_key" }],
        ]
      }
    });
  } catch (error) {
    console.error("Error in start command:", error);
    return ctx.reply("❌ Error starting bot. Please try again.");
  }
};