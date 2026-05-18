const referenceService = require("../services/referenceService");
const stateService = require("../services/stateService");

/**
 * Handle /generate_ref_CODE123 command
 * Admin only - generates new reference codes
 */
async function generateRefCommand(ctx){
  try {
    const isAdmin = ctx.state.isAdmin;
    const telegram_id = ctx.state.telegram_id;
      const currentState = ctx.state.userState;
    // const messageText = ctx.message.text || "";

    // Check admin authorization
    if (!isAdmin) {
      return ctx.reply(
        "❌ Hanya admin yang dapat membuat reference code.\n\n" +
        "Hubungi admin untuk bantuan."
      );
    }    

    // cek dulu apakah dalam alur lain. misal masih dalam proses menambah task 
    // tiba- tiba pencet tombol generate ref code.
    // const currentState = await stateService.getState(telegram_id);
    console.log("Current State:", currentState);
    if (currentState !== null) {
      return ctx.reply(
        "⚠️ Anda tengah berada di dalam suatu alur fitur.\n\n" +
        "Gunakan /cancel untuk memulai ulang, atau selesaikan flow saat ini."
      );
    }

    await stateService.setState(telegram_id, "awaiting_duration_refcode", {  });



    // // Set state to awaiting task description
    // await stateService.setState(telegram_id, "awaiting_total_mp", {});

    ctx.reply(
      `🗝️<b>Generate Reference Code Baru</b>\n\n` +  
      `Pilih Durasi atau <i>ketik Durasi sendiri</i>\n\n`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }],
            [{ text: "⏰ 20 Menit", callback_data: "20_duration_reference" }],
            [{ text: "⏰  1 Jam", callback_data: "60_duration_reference" }]
          ]
        }
      }
    );

    // // Extract reference code from command (e.g., "/generate_ref_ABC123" -> "ABC123")
    // const commandMatch = messageText.match(/^\/generate_ref_(.+)$/);
    // if (!commandMatch) {
    //   return ctx.reply(
    //     "❌ Format command tidak valid.\n\n" +
    //     "Gunakan: /generate_ref_[REFERENCE_CODE]\n" +
    //     "Contoh: /generate_ref_ABC123\n\n" +
    //     "Reference code harus alphanumeric (A-Z, 0-9), maksimal 15 karakter."
    //   );
    // }

    // const referenceCode = commandMatch[1].trim();

    // // Validate reference code format (alphanumeric, max 15 char)
    // if (!/^[A-Z0-9]{1,15}$/i.test(referenceCode)) {
    //   return ctx.reply(
    //     "❌ Format reference code tidak valid.\n\n" +
    //     "Reference code harus:\n" +
    //     "• Alphanumeric (A-Z, 0-9)\n" +
    //     "• Maksimal 15 karakter\n\n" +
    //     "Contoh valid: /generate_ref_ABC123"
    //   );
    // }

    // Check if code already exists
    // const codeExists = await referenceService.referenceCodeExists(referenceCode);
    // if (codeExists) {
    //   return ctx.reply(
    //     `❌ Reference code <code>${referenceCode}</code> sudah ada di database.\n\n` +
    //     "Gunakan reference code yang berbeda.",
    //     { parse_mode: "HTML" }
    //   );
    // } 
    // ======= by pass karena kode digenerate secara random, kemungkinan duplikat sangat kecil, dan sudah ada pengecekan di service untuk memastikan tidak ada duplikat

    // Generate new reference code
  //   const generatedReferenceCode = await referenceService.generateReferenceCode(/*jumlahMP dan durasi opsional*/);

  //   // Success message
  //   await ctx.reply(
  //     `✅ <b>Reference code berhasil dibuat!</b>\n\n` +
  //     `Code: <code>${generatedReferenceCode.referenceCode}</code>\n` +
  //     `Jumlah MP: ${generatedReferenceCode.jumlahMP}\n` +
  //     `User dapat menggunakan:\n` +
  //     `<code>/start_${generatedReferenceCode.referenceCode}</code>
  //     \n\nExpired Time : ${generatedReferenceCode.expirationTime}`,
  //     {
  //       parse_mode: "HTML"
  //     }
  //   );
    } catch (error) {
      if (error.code === "DUPLICATE_REFERENCE_CODE") {
        return ctx.reply(
          `❌ ${error.message}`
        );
      }
      
      console.error("Error in generate_ref command:", error);
      return ctx.reply("❌ Error saat membuat reference code. Silakan coba lagi.");
    }
  }

  
/**
 * STEP 1: Handle durasi 20 menit
 */
async function setDuration(ctx, duration) {
  try {
    const telegram_id = ctx.state.telegram_id;

    

    
    await ctx.reply(
      `✅ Durasi ${duration} menit dipilih.\n\n` +
      `Sekarang masukkan jumlah ManPower 👷🏼:\n` +
      `Contoh: 100\n\n` +
      `Tekan "cancel" untuk membatalkan.`,
      { 
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ Cancel", callback_data: "cancel" }]
          ]
        }
      }
    );

    const currentState = await stateService.getState(telegram_id);
    await stateService.setState(telegram_id, "awaiting_total_manpower_refcode", {
      duration: duration,
      ...(currentState.data || {})
    });
  } catch (error) {
    console.error("Error in generateRefCommandStep1:", error);
    await ctx.reply("❌ Error. Silakan coba lagi dengan /generate_ref");
  }
}

/**
 * STEP 2: Handle durasi 60 menit (1 jam)
 */
async function setManpower(ctx, totalMP) {
  try {
    const telegram_id = ctx.state.telegram_id;
    const currentState = await stateService.getState(telegram_id);
    const duration = currentState.context_data.duration;

    const queryresult = await referenceService.generateReferenceCode(duration, totalMP);
    if (!queryresult) {
      return ctx.reply("❌ Gagal membuat reference code. Silakan coba lagi.");
    }

    await ctx.reply(
      `✅ Berhasil Menambah Reference Code baru!\n\n` +
      `⏰ Durasi ${duration} menit dipilih.\n\n` +
      `👷🏼 Jumlah ManPower: ${totalMP}\n` +
      `🗝️ User dapat menggunakan:\n` +
      `<code>/start_${queryresult.referenceCode}</code>\n\n` +
      `Expired Time: ${queryresult.expirationTime}`,
      { parse_mode: "HTML" }
    );
    
    await stateService.clearState(telegram_id);

    // await stateService.clearState(telegram_id);
  } catch (error) {
    console.error("Error in setManPowwer:", error);
    await ctx.reply("❌ Error. Silakan coba lagi dengan /generate_ref");
  }
}

async function storeReferenceCodeData(){

  referenceService.generateReferenceCode({
    jumlahMP: 100,
    duration: 20
  });
    // const taskData = {
    //   task_description: context.task_description,
    //   checkpoint_time: context.checkpoint_time,
    //   target: targetNum,
    //   interval: context.interval  // Now dynamic!
    // };


}

// 👷🏼

/**
 * STEP 3: Handle input jumlah MP dari text message
 */
// async function generateRefCommandStep3(ctx) {
//   try {
//     const telegram_id = ctx.state.telegram_id;
//     const userState = await stateService.getState(telegram_id);
    
//     // Validasi state
//     if (userState.state !== "awaiting_mp_amount") {
//       return ctx.reply("❌ Tidak dalam proses generate reference code. Gunakan /generate_ref untuk memulai.");
//     }
    
//     const mpAmount = parseInt(ctx.message.text);
    
//     // Validate MP amount
//     if (isNaN(mpAmount) || mpAmount <= 0) {
//       return ctx.reply(
//         "❌ Jumlah MP tidak valid.\n\n" +
//         "Masukkan angka positif.\n" +
//         "Contoh: 100\n\n" +
//         "Ketik 'cancel' untuk membatalkan."
//       );
//     }

//     // Generate reference code
//     const referenceCode = await referenceService.generateReferenceCode({
//       jumlahMP: mpAmount,
//       duration: userState.data.duration
//     });
    
//     // Clear state setelah sukses
//     await stateService.setState(telegram_id, null, {});
    
//     await ctx.reply(
//       `✅ <b>Reference code berhasil dibuat!</b>\n\n` +
//       `Code: <code>${referenceCode.referenceCode}</code>\n` +
//       `Jumlah MP: ${mpAmount}\n` +
//       `Durasi: ${userState.data.duration} menit\n\n` +
//       `User dapat menggunakan:\n` +
//       `<code>/start_${referenceCode.referenceCode}</code>\n\n` +
//       `Expired: ${referenceCode.expirationTime}`,
//       { parse_mode: "HTML" }
//     );
//   } catch (error) {
//     if (error.code === "DUPLICATE_REFERENCE_CODE") {
//       return ctx.reply(`❌ ${error.message}`);
//     }
    
//     console.error("Error in generateRefCommandStep3:", error);
//     await ctx.reply("❌ Error saat membuat reference code. Silakan coba lagi.");
    
//     // Reset state on error
//     await stateService.setState(ctx.state.telegram_id, null, {});
//   }
// }


module.exports = {
  generateRefCommand,
  setDuration,
  setManpower
};