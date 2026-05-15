const stateService = require("../services/stateService");
const referenceService = require("../services/referenceService");
const { getTeksBalasan } = require("../services/textService");
const { db } = require("../db");

/**
 * Handle /start_CODE123 command
 * Allows users to register using a valid reference code
 */
module.exports = async (ctx) => {
  try {
    const telegram_id = ctx.state.telegram_id;
    const messageText = ctx.message.text || "";

    // Extract reference code from command (e.g., "/start_ABC123" -> "ABC123")
    const commandMatch = messageText.match(/^\/start_(.+)$/);
    if (!commandMatch) {
      return ctx.reply(
        "❌ Format command tidak valid.\n\n" +
        "Gunakan: /start_[REFERENCE_CODE]\n" +
        "Contoh: /start_ABC123"
      );
    }

    const referenceCode = commandMatch[1].trim();

    // Validate reference code format (alphanumeric, max 15 char)
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

    // Check if user already exists in database
    const [existingUser] = await db.execute(
      "SELECT telegram_id FROM ms_user WHERE telegram_id = ?",
      [telegram_id]
    );

    if (existingUser.length > 0) {
      // User already registered, just update reference code if needed
      await db.execute(
        "UPDATE ms_user SET reference_code = ? WHERE telegram_id = ?",
        [referenceCode, telegram_id]
      );
    } else {
      // New user - insert into ms_user with reference_code
      const insertSql = `
        INSERT INTO ms_user (telegram_id, reference_code, current_state, context_data, created_at, updated_at)
        VALUES (?, ?, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      await db.execute(insertSql, [telegram_id, referenceCode]);
    }

    // Initialize state (clear any previous state)
    await stateService.setState(telegram_id, null, {});

    // Update context to reflect reference code
    ctx.state.referenceCode = referenceCode;

    // Show welcome message and main menu
    await ctx.reply(
      `✅ <b>Selamat datang!</b>\n\n` +
      `Reference code: <code>${referenceCode}</code>\n` +
      `Status: AKTIF\n\n` +
      `Silakan pilih menu di bawah:`,
      {
        parse_mode: "HTML"
      }
    );

    ctx.reply(getTeksBalasan(), {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "📋 Daftar Task", callback_data: "list_task" }],
          [{ text: "➕ Tambah Task", callback_data: "add_task" }],
          [{ text: "🗑️ Hapus Task", callback_data: "remove_task" }],
          [{ text: "⛑️ Belajar Contoh Get-Users", callback_data: "list_user" }]
        ]
      }
    });
  } catch (error) {
    console.error("Error in start_with_code command:", error);
    return ctx.reply("❌ Error saat registrasi. Silakan coba lagi.");
  }
};
