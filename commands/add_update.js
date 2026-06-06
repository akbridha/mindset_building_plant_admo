const laporanService = require("../services/laporanService");
const stateService = require("../services/stateService");
const userService = require("../services/userService");
const { db } = require("../db");

/**
 * Handler for /update command - add update to report
 * Format: /update LAP-00001 <update text>
 * or multi-step form if just /update
 */

async function addUpdateCommand(ctx) {
  try {
    const telegram_id = ctx.state.telegram_id;

    // Check if user is team member
    // if (!ctx.state.isTeamMember) {
    //   return ctx.reply(
    //     "❌ Anda bukan anggota tim Follow-up.\n\n" +
    //     "Hanya anggota tim (SH/PSD) yang dapat menambah update."
    //   );
    // }

    // Ask for report ID
    await stateService.setStateOnly(telegram_id, "awaiting_update_laporan_id");

    return ctx.reply(
      "<b>📝 Tambah Update</b>\n\n" +
      "Masukkan ID Laporan (contoh: LAP-00001):",
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in addUpdateCommand:", error);
    return ctx.reply("❌ Error memproses perintah. Silakan coba lagi.");
  }
}

/**
 * Step 2 - Get laporan ID and validate
 */
async function updateStep2(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const lapor_pak_id = userInput.trim().toUpperCase();

    // Validate format
    if (!/^LAP-\d{5}$/.test(lapor_pak_id)) {
      return ctx.reply(
        "⚠️ Format ID tidak valid.\n\n" +
        "Format harus: LAP-00001\n\n" +
        "Silakan coba lagi:"
      );
    }

    // Check if report exists and has PIC
    const reports = await laporanService.getActiveReports();
    const report = reports.find((r) => r.lapor_pak_id === lapor_pak_id);

    if (!report) {
      return ctx.reply(
        "❌ Laporan tidak ditemukan atau sudah ditutup.\n\n" +
        "Silakan coba dengan ID laporan lain."
      );
    }

    if (!report.pic_id) {
      return ctx.reply(
        "⚠️ Laporan belum memiliki PIC.\n\n" +
        "PIC harus ditunjuk terlebih dahulu sebelum menambah update.\n" +
        "Hubungi tim untuk menunjuk PIC."
      );
    }

    // Set state for update content input
    await stateService.setState(telegram_id, "awaiting_update_content", {
      lapor_pak_id: lapor_pak_id,
      pic_id: report.pic_id,
    });

    // return ctx.reply(  `Lapor pak id -> ${lapor_pak_id} - pic_id -> ${report.pic_id}`);

    return ctx.reply(
      `<b>📝 Tambah Update untuk ${lapor_pak_id}</b>\n\n` +
      `Silakan ketik isi update/perkembangan laporan:`,
      { parse_mode: "HTML" }
    );
  } catch (error) {
    console.error("Error in updateStep2:", error);
    await stateService.clearState(ctx.state.telegram_id);
    return ctx.reply("❌ Error memproses request. Silakan coba lagi.");
  }
}

/**
 * Step 3 - Process update content
 */
// async function updateStep3(ctx, userInput) {
//   try {
//     const telegram_id = ctx.state.telegram_id;
//     const lapor_pak_id = ctx.state.userContext.lapor_pak_id;
//     // const pic_id = ctx.state.userContext.pic_id;
//     const pic_id_from_context = ctx.state.userContext.pic_id;


//     // CARI users.id dari telegram_id
//     const [userRecord] = await db.query(
//       'SELECT id FROM users WHERE telegram_id = ?',
//       [telegram_id]
//     );
//     if (!userRecord) {
//       return ctx.reply("❌ User tidak ditemukan di sistem. Silakan registrasi terlebih dahulu.");
//     }

//     const psd_id = userRecord.id; // Ini integer (1, 2, 3...)

//     // mencari lagi pic_id (pastikan integer)
//     const [picRecord] = await db.query(
//       'SELECT id FROM users WHERE id = ? OR telegram_id = ?',
//       [pic_id_from_context, pic_id_from_context]
//     );
    
//     const pic_id = picRecord ? picRecord.id : pic_id_from_context;


//     // Validate input
//     if (!userInput || userInput.trim().length < 5) {
//       return ctx.reply(
//         "⚠️ Update terlalu pendek.\n\n" +
//         "Minimal 5 karakter. Silakan coba lagi:"
//       );
//     }

//     if (userInput.trim().length > 500) {
//       return ctx.reply(
//         "⚠️ Update terlalu panjang.\n\n" +
//         "Maksimal 500 karakter. Silakan coba lagi:"
//       );
//     }

//     const [result] = await db.query(
//       `INSERT INTO updates (laporan_id, psd_id, message_text, status, pic_id, created_at)
//        VALUES (?, ?, ?, 'pending_approval', ?, CURRENT_TIMESTAMP)`,
//       [lapor_pak_id, psd_id, userInput.trim(), pic_id]
//     );

//     // Add update to database (pending PIC approval)
//     // const update_id = await laporanService.addUpdate(
//     //   lapor_pak_id,
//     //   telegram_id,
//     //   pic_id,
//     //   userInput.trim()
//     // );

    
//     // return ctx.reply(  `     Lapor pak id  ${lapor_pak_id}, telegeram id ->    ${telegram_id} PIc id    ${pic_id}, user input trim->   ${userInput.trim()}`);

//     // Clear state
//     await stateService.clearState(telegram_id);

//     // Send success message
//     return ctx.reply(
//       `<b>✅ Update Diterima</b>\n\n` +
//       `Update untuk ${lapor_pak_id} telah disimpan.\n\n` +
//       `Update menunggu persetujuan dari PIC yang ditunjuk.\n\n` +
//       `Anda akan menerima notifikasi ketika disetujui atau ditolak.`,
//       { parse_mode: "HTML" }
//     );
//   } catch (error) {
//     console.error("Error in updateStep3:", error);
//     await stateService.clearState(ctx.state.telegram_id);
//     return ctx.reply("❌ Error menyimpan update. Silakan coba lagi.");
//   }
// }


async function updateStep3(ctx, userInput) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const lapor_pak_id = ctx.state.userContext.lapor_pak_id;
    const pic_id_from_context = ctx.state.userContext.pic_id;

    console.log(`Processing update - Telegram ID: ${telegram_id}, Laporan: ${lapor_pak_id}, PIC ID: ${pic_id_from_context}`);

    // 1. Get PSD user (yang membuat update)
    const psdUser = await userService.getUserByTelegramId(telegram_id);
    
    if (!psdUser) {
      console.error(`User not found for telegram_id: ${telegram_id}`);
      return ctx.reply(
        "❌ Maaf, Anda belum terdaftar di sistem.\n\n" +
        "Silakan hubungi admin untuk registrasi terlebih dahulu."
      );
    }
    
    const psd_id = psdUser.id;
    console.log(`PSD User: ID ${psd_id}, Name: ${psdUser.first_name}`);

    // 2. Get laporan by lapor_pak_id
    const [laporanRows] = await db.execute(
      'SELECT id FROM laporan WHERE lapor_pak_id = ?',
      [lapor_pak_id]
    );
    
    if (laporanRows.length === 0) {
      console.error(`Laporan not found: ${lapor_pak_id}`);
      return ctx.reply(`❌ Laporan dengan ID ${lapor_pak_id} tidak ditemukan.`);
    }
    
    const laporan_id = laporanRows[0].id;

    // 3. Verify PIC exists
    const picUser = await userService.getUserById(parseInt(pic_id_from_context));
    
    if (!picUser) {
      console.error(`PIC not found: ${pic_id_from_context}`);
      return ctx.reply(
        "❌ Error: PIC yang ditunjuk tidak ditemukan.\n\n" +
        "Silakan laporkan ke admin."
      );
    }
    
    const pic_id = picUser.id;
    console.log(`PIC User: ID ${pic_id}, Name: ${picUser.first_name}`);

    // 4. Validate input
    if (!userInput || userInput.trim().length < 5) {
      return ctx.reply(
        "⚠️ Update terlalu pendek.\n\n" +
        "Minimal 5 karakter. Silakan coba lagi:"
      );
    }

    if (userInput.trim().length > 500) {
      return ctx.reply(
        "⚠️ Update terlalu panjang.\n\n" +
        "Maksimal 500 karakter. Silakan coba lagi:"
      );
    }

    // 5. Insert update
    const [result] = await db.execute(
      `INSERT INTO updates (laporan_id, psd_id, message_text, status, pic_id, created_at)
       VALUES (?, ?, ?, 'pending_approval', ?, CURRENT_TIMESTAMP)`,
      [laporan_id, psd_id, userInput.trim(), pic_id]
    );

    console.log(`Update inserted: ID ${result.insertId}`);

    // 6. Clear state
    await stateService.clearState(telegram_id);

    // 7. Send success message
    return ctx.reply(
      `<b>✅ Update Diterima</b>\n\n` +
      `Update untuk ${lapor_pak_id} telah disimpan.\n\n` +
      `📝 Update: ${userInput.trim().substring(0, 100)}${userInput.trim().length > 100 ? '...' : ''}\n\n` +
      `⏳ Status: Menunggu persetujuan dari ${picUser.first_name || 'PIC'}\n\n` +
      `Anda akan menerima notifikasi ketika disetujui atau ditolak.`,
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

module.exports = {
  addUpdateCommand,
  updateStep2,
  updateStep3,
};
