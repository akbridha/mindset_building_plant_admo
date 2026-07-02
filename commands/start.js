const { getTeksBalasan } = require("../services/textService");
const stateService = require("../services/stateService");
const { encryptTelegramId } = require("../services/encryptionService");
const { db } = require("../db");
const {isUserRegistered} = require("../services/userService");

const { Keyboard } = require("grammy");

module.exports = async (ctx) => {
  try {
    const telegram_id = ctx.state.telegram_id;
    const isAdmin = ctx.state.isAdmin;
    const isRegistered = await isUserRegistered(ctx.state.telegram_id);

    if (!isRegistered && !isAdmin) {
      return ctx.reply("❌ Anda belum terdaftar. Silakan hubungi admin untuk mendapatkan akses.");
    }


    var inlineKeyboard = {
        inline_keyboard: [
          [{ text: "📋 Daftar Task", callback_data: "list_task" }],
          [{ text: "📋 Lapor Pak", callback_data: "lapor_pak_menu" }]

          // [{ text: "🗝️ Generate Reference Code", callback_data: "generate_key" }],
          // [{ text: "⛑️ Belajar Contoh Get-Users", callback_data: "list_user" }]
        ]
      };

    // Only admin can use /start (without reference code)
    if (isAdmin) {
      inlineKeyboard.inline_keyboard.push([{ text: "🗝️ Generate Reference Code", callback_data: "generate_key" }]);
    }

    // Initialize admin state

   await stateService.setState(telegram_id, null);

    // ========== SYNC KE TABEL `users` DAN `ms_user` ==========
    const encryptedId = encryptTelegramId(telegram_id);
    const username = ctx.from.username || null;
    const firstName = ctx.from.first_name || null;
    
    // 1. Handle users table
    const [existingUsers] = await db.execute(
      `SELECT id FROM users WHERE encrypted_telegram_id = ?`, 
      [encryptedId]
    );

    let userId;
    if (existingUsers.length === 0) {
      const [result] = await db.execute(
        `INSERT INTO users (encrypted_telegram_id, username, first_name, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [encryptedId, username, firstName]
      );
      userId = result.insertId;
      console.log(`✅ Admin ${telegram_id} registered to users table with ID ${userId}`);
    } else {
      userId = existingUsers[0].id;
      await db.execute(
        `UPDATE users SET username = ?, first_name = ? WHERE id = ?`,
        [username, firstName, userId]
      );
      console.log(`✅ Admin ${telegram_id} synced to users table (ID: ${userId})`);
    }

    // 2. Handle ms_user table with user_id
    const [existingMsUser] = await db.execute(
      "SELECT telegram_id FROM ms_user WHERE telegram_id = ?",
      [telegram_id]
    );

    if (existingMsUser.length > 0) {
      await db.execute(
        "UPDATE ms_user SET user_id = ? WHERE telegram_id = ?",
        [userId, telegram_id]
      );
      console.log(`✅ Updated ms_user with user_id: ${userId}`);
    } else {
      await db.execute(
        `INSERT INTO ms_user (telegram_id, user_id, reference_code, current_state, context_data, created_at, updated_at)
         VALUES (?, ?, NULL, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [telegram_id, userId]
      );
      console.log(`✅ Created ms_user record with user_id: ${userId}`);
    }
    // ===========================================================

// Kirim reply keyboard sebagai pesan terpisah (hanya sekali)
const mainMenuReply = new Keyboard()
  .text("Menu")
  .text("Daftar perintah")
  .resized();

const userState = await stateService.getState(telegram_id);
if (!userState || !userState.context_data?.hasReceivedReplyKeyboard) {
  // Kirim pesan dengan reply keyboard (harus ada teks)
  await ctx.reply("📱 Gunakan menu di bawah untuk navigasi:", {
    reply_markup: mainMenuReply
  });
  
  // Simpan flag menggunakan updateContext
  await stateService.updateContext(telegram_id, { 
    hasReceivedReplyKeyboard: true 
  });
}

// Kirim pesan dengan inline keyboard
await ctx.reply(getTeksBalasan(), {
  parse_mode: "HTML",
  reply_markup: inlineKeyboard
});
  } catch (error) {
    console.error("Error in start command:", error);
    return ctx.reply("❌ Error starting bot. Please try again.");
  }
};