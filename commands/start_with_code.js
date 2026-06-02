const stateService = require("../services/stateService");
const referenceService = require("../services/referenceService");
const { getTeksBalasan } = require("../services/textService");
const { db } = require("../db");
const { encryptTelegramId } = require("../services/encryptionService");

/**
 * Handle /start_CODE123 command
 * Allows users to register using a valid reference code
 */
module.exports = async (ctx) => {
  try {
    const telegram_id = ctx.state.telegram_id;
    let messageText = ctx.message.text || "";

    // handle format umpamanye pakay spasi, ubah menjadi underscore
    if (messageText.startsWith("/start ")) {
      messageText = messageText.replace("/start ", "/start_");
    }

    // Extract reference code from command
    const commandMatch = messageText.match(/^\/start_(.+)$/);
    if (!commandMatch) {
      return ctx.reply(
        "❌ Format command tidak valid.\n\n" +
        "Gunakan: /start_[REFERENCE_CODE]\n" +
        "Contoh: /start_ABC123"
      );
    }

    const referenceCode = commandMatch[1].trim();

    // Validate reference code format
    if (!/^[A-Z0-9]{1,15}$/i.test(referenceCode)) {
      return ctx.reply(
        "❌ Format reference code tidak valid.\n\n" +
        "Reference code harus:\n" +
        "• Alphanumeric (A-Z, 0-9)\n" +
        "• Maksimal 15 karakter\n\n" +
        "Coba lagi dengan format yang benar."
      );
    }

    // Check if reference code is valid and OPEN
    const isValid = await referenceService.isReferenceCodeValid(referenceCode);
    if (!isValid) {
      return ctx.reply(
        "❌ Reference code tidak valid atau sudah ditutup.\n\n" +
        "Hubungi admin untuk mendapatkan reference code yang valid."
      );
    }

    // ========== REGISTRASI KE ms_user ==========
    const [existingUser] = await db.execute(
      "SELECT telegram_id FROM ms_user WHERE telegram_id = ?",
      [telegram_id]
    );

    if (existingUser.length > 0) {
      await db.execute(
        "UPDATE ms_user SET reference_code = ? WHERE telegram_id = ?",
        [referenceCode, telegram_id]
      );
    } else {
      const insertSql = `
        INSERT INTO ms_user (telegram_id, reference_code, current_state, context_data, created_at, updated_at)
        VALUES (?, ?, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await db.execute(insertSql, [telegram_id, referenceCode]);
    }
    // ==========================================

    // ========== SYNC KE TABEL `users` (UNTUK LAPOR PAK) ==========
    // INI YANG PENTING! Super Admin juga akan terdaftar di sini
    const encryptedId = encryptTelegramId(telegram_id);
    const username = ctx.from.username || null;
    const firstName = ctx.from.first_name || null;
    
    const [existingUsers] = await db.execute(
      `SELECT id FROM users WHERE encrypted_telegram_id = ?`,
      [encryptedId]
    );

    if (existingUsers.length === 0) {
      await db.execute(
        `INSERT INTO users (encrypted_telegram_id, username, first_name, created_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
        [encryptedId, username, firstName]
      );
      console.log(`✅ User ${telegram_id} (@${username}) registered to users table`);
    } else {
      await db.execute(
        `UPDATE users SET username = ?, first_name = ? WHERE id = ?`,
        [username, firstName, existingUsers[0].id]
      );
      console.log(`✅ User ${telegram_id} (@${username}) synced to users table`);
    }
    // ============================================================

    // Initialize state
    await stateService.setStateOnly(telegram_id, null);

    // Update context
    ctx.state.referenceCode = referenceCode;

    // Show welcome message
    await ctx.reply(
      `✅ <b>Selamat datang!</b>\n\n` +
      `Reference code: <code>${referenceCode}</code>\n` +
      `Status: AKTIF\n\n` +
      `Silakan pilih menu di bawah:`,
      { parse_mode: "HTML" }
    );

    ctx.reply(getTeksBalasan(), {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Daftar Task", callback_data: "list_task" }],
          [{ text: "📋 Lapor Pak", callback_data: "lapor_pak_menu" }]
        ]
      }
    });
  } catch (error) {
    console.error("Error in start_with_code command:", error);
    return ctx.reply("❌ Error saat registrasi. Silakan coba lagi.");
  }
};