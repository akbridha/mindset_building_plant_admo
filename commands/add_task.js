// Di commands/add_update.js
const userService = require("../services/userService");
const notificationService = require("../services/notificationService");
const { db } = require("../db");

async function updateStep3(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const lapor_pak_id = ctx.state.userContext.lapor_pak_id;
    const pic_id_from_context = ctx.state.userContext.pic_id;

    console.log(`Processing update - Telegram ID: ${telegram_id}, Laporan: ${lapor_pak_id}`);

    // 1. Get PSD user (yang membuat update)
    const psdUser = await userService.getUserByTelegramId(telegram_id);
    
    if (!psdUser) {
      return ctx.reply("❌ Maaf, Anda belum terdaftar di sistem.");
    }
    
    const psd_id = psdUser.id;

    // 2. Get laporan by lapor_pak_id
    const [laporanRows] = await db.execute(
      'SELECT id FROM laporan WHERE lapor_pak_id = ?',
      [lapor_pak_id]
    );
    
    if (laporanRows.length === 0) {
      return ctx.reply(`❌ Laporan dengan ID ${lapor_pak_id} tidak ditemukan.`);
    }
    
    const laporan_id = laporanRows[0].id;

    // 3. Get PIC user dan raw Telegram ID-nya
    const picUser = await userService.getUserById(parseInt(pic_id_from_context));
    
    if (!picUser) {
      return ctx.reply(
        "❌ Error: PIC yang ditunjuk tidak ditemukan.\n\n" +
        "Silakan laporkan ke admin."
      );
    }
    
    const pic_id = picUser.id;
    
    // 🔑 KRITIKAL: Dapatkan raw Telegram ID dari ms_user
    const picTelegramId = await userService.getRawTelegramIdByUserId(pic_id);
    
    if (!picTelegramId) {
      console.error(`❌ Telegram ID not found for user ID: ${pic_id}`);
      // Update tetap bisa disimpan, tapi kasih warning
      await ctx.reply(
        "⚠️ Update tersimpan, tetapi gagal mengirim notifikasi ke PIC.\n\n" +
        "Silakan informasikan ke admin bahwa data PIC perlu diperbaiki."
      );
    }

    // 4. Validate input
    if (!userInput || userInput.trim().length < 5) {
      return ctx.reply(
        "⚠️ Update terlalu pendek.\n\nMinimal 5 karakter. Silakan coba lagi:"
      );
    }

    // 5. Insert update ke database
    const [result] = await db.execute(
      `INSERT INTO updates (laporan_id, psd_id, message_text, status, pic_id, created_at)
       VALUES (?, ?, ?, 'pending_approval', ?, CURRENT_TIMESTAMP)`,
      [laporan_id, psd_id, userInput.trim(), pic_id]
    );

    console.log(`✅ Update inserted: ID ${result.insertId}`);

    // 6. KIRIM NOTIFIKASI KE PIC (jika ada Telegram ID)
    if (picTelegramId) {
      try {
        await notificationService.notifyPICForApproval(
          ctx.api,                    // Gunakan ctx.api
          picTelegramId,              // Raw Telegram ID (1011093409)
          lapor_pak_id,               // ID laporan
          userInput.trim(),           // isi update
          result.insertId             // ID update untuk callback
        );
        console.log(`✅ Notifikasi terkirim ke PIC Telegram ID: ${picTelegramId}`);
      } catch (notifError) {
        console.error(`❌ Gagal kirim notifikasi ke PIC:`, notifError.message);
        // Notifikasi gagal tapi update tetap tersimpan
      }
    }

    // 7. Clear state
    await stateService.clearState(telegram_id);

    // 8. Send success message
    return ctx.reply(
      `<b>✅ Update Diterima</b>\n\n` +
      `Update untuk ${lapor_pak_id} telah disimpan.\n\n` +
      `📝 Update: ${userInput.trim().substring(0, 100)}${userInput.trim().length > 100 ? '...' : ''}\n\n` +
      `⏳ Status: Menunggu persetujuan dari ${picUser.first_name || 'PIC'}\n\n` +
      `Anda akan menerima notifikasi ketika update disetujui atau ditolak.`,
      { parse_mode: "HTML" }
    );
    
  } catch (error) {
    console.error("Error in updateStep3:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.reply(
      "❌ Terjadi kesalahan saat menyimpan update.\n\n" +
      "Silakan coba lagi atau hubungi admin."
    );
  }
}