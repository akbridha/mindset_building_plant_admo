const referenceService = require("../services/referenceService");

/**
 * Handle /generate_ref_CODE123 command
 * Admin only - generates new reference codes
 */
module.exports = async (ctx) => {
  try {
    const isAdmin = ctx.state.isAdmin;
    const messageText = ctx.message.text || "";

    // Check admin authorization
    if (!isAdmin) {
      return ctx.reply(
        "❌ Hanya admin yang dapat membuat reference code.\n\n" +
        "Hubungi admin untuk bantuan."
      );
    }

    // Extract reference code from command (e.g., "/generate_ref_ABC123" -> "ABC123")
    const commandMatch = messageText.match(/^\/generate_ref_(.+)$/);
    if (!commandMatch) {
      return ctx.reply(
        "❌ Format command tidak valid.\n\n" +
        "Gunakan: /generate_ref_[REFERENCE_CODE]\n" +
        "Contoh: /generate_ref_ABC123\n\n" +
        "Reference code harus alphanumeric (A-Z, 0-9), maksimal 15 karakter."
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
        "Contoh valid: /generate_ref_ABC123"
      );
    }

    // Check if code already exists
    const codeExists = await referenceService.referenceCodeExists(referenceCode);
    if (codeExists) {
      return ctx.reply(
        `❌ Reference code <code>${referenceCode}</code> sudah ada di database.\n\n` +
        "Gunakan reference code yang berbeda.",
        { parse_mode: "HTML" }
      );
    }

    // Generate new reference code
    await referenceService.generateReferenceCode(referenceCode);

    // Success message
    await ctx.reply(
      `✅ <b>Reference code berhasil dibuat!</b>\n\n` +
      `Code: <code>${referenceCode}</code>\n` +
      `Status: <code>OPEN</code>\n\n` +
      `User dapat menggunakan:\n` +
      `<code>/start_${referenceCode}</code>`,
      {
        parse_mode: "HTML"
      }
    );
  } catch (error) {
    if (error.code === "DUPLICATE_REFERENCE_CODE") {
      return ctx.reply(
        `❌ ${error.message}`
      );
    }
    
    console.error("Error in generate_ref command:", error);
    return ctx.reply("❌ Error saat membuat reference code. Silakan coba lagi.");
  }
};
