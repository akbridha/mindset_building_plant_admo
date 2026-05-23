const taskUpdaterService = require("../services/progressService");
const stateService = require("../services/stateService");
const checkReminderService = require("../services/check_reminder_service");
const textService = require("../services/textService");
const progresService = require("../services/progressService")



async function createProgress(ctx, userInput, taskId) {

  console.log(ctx.state.telegram_id, userInput, taskId);
  const userState = await stateService.getState(ctx.state.telegram_id);
  // cek status apakah memang sedang ditunggui atau alur ilegal(di luar dugaan) 
  const isUserResponseAwaited = userState.current_state === "awaiting_checkpoint_response" ? true : false; 
  console.log("Is user response awaited?", isUserResponseAwaited);

  var textBalasan = "";
  var  replyMarkup = null;

  // console.log("Current user state:", userState.current_state);


  // cegah aksi diluar jam permintaan checkpoint
  if(!isUserResponseAwaited){
    ctx.reply("Anda tidak sedang dalam proses Perekaman Checkpoint");
    return true;
  }

  
  try {
    await taskUpdaterService.progressCreate(ctx, userInput, taskId);
    textBalasan = "✅ Progress recorded. Terima kasih atas update-nya!";
  } catch (error) {
    textBalasan = "❌ Error in update tasks Command. Mohon Coba lagi.";
    console.error("Error in updateTaskCommand:", error);
  }

  // console.log("Clearing state for user:", ctx.state.telegram_id);
  await stateService.clearState(ctx.state.telegram_id);
   
  const lastReminderTarget = await checkReminderService.checkIsLastReminder(taskId); 
  if(lastReminderTarget){
    textBalasan = `${textBalasan}${textService.getLastReminderText()}`;
    replyMarkup =  {
          inline_keyboard: [
            [{ text: "✨ Extend", callback_data: `extend_phase` }],
            [{ text: "✅ Selesai", callback_data: `done_phase` }]
          ]
        }
    stateService.setState(ctx.state.telegram_id,"awaited_on_last_target_response",{task_id: taskId})
  }


  // Kirim pesan dengan atau tanpa keyboard
  const replyOptions = { parse_mode: "HTML" };
  if (replyMarkup) replyOptions.reply_markup = replyMarkup;

  // console.log(textBalasan);
  return ctx.reply(textBalasan, replyOptions);

}

// async function doneTask(ctx) {




//   const taskId = ctx.state.userContext.task_id
//   const data = await progresService.getProgress(taskId);
  
//   return ctx.reply(data);
// }

async function doneTask(ctx) {
  try {
    const taskId = ctx.state.userContext.task_id;
    const data = await progresService.getProgress(taskId);
    
    // 1. Validasi jika data kosong atau tidak ditemukan
    if (!data || data.length === 0) {
      return await ctx.reply("❌ Belum ada riwayat progress untuk task ini.");
    }

    // 2. Judul pesan
    let pesanResponse = `📊 *Riwayat Progress Task ID: ${taskId}*\n\n`;

    // 3. Looping data untuk mendekorasi teks
    data.forEach((item, index) => {
      // Mengubah string date UTC ke objek Date Javascript
      const tanggalAsli = new Date(item.recorded_at);
      
      // Ambil komponen tanggal, jam, dan menit (ditambah padStart agar selalu 2 digit, misal: 05)
      const tgl = String(tanggalAsli.getDate()).padStart(2, '0');
      const bln = String(tanggalAsli.getMonth() + 1).padStart(2, '0'); // bulan dimulai dari 0
      const thn = tanggalAsli.getFullYear();
      const jam = String(tanggalAsli.getHours()).padStart(2, '0');
      const menit = String(tanggalAsli.getMinutes()).padStart(2, '0');

      // Format gabungan: DD/MM/YYYY - HH:mm
      const formatWaktu = `${tgl}/${bln}/${thn} - ${jam}:${menit}`;

      // Mengubah angka jawaban (1 atau 0) menjadi emoji simbol
      // (Asumsi: 1 = Yes [✅], selain itu = No [❌])
      const simbolJawaban = item.answer_yes_no === 1 ? "✅ Yes" : "❌ No";

      // Gabungkan ke dalam satu baris string
      pesanResponse += `${index + 1}. 📅 ${formatWaktu} : ${simbolJawaban}\n`;
    });

    // 4. Kirim teks yang sudah didekorasi ke user menggunakan Markdown agar teks bold/emoji rapi
    return await ctx.reply(pesanResponse);

  } catch (error) {
    console.error("Error di doneTask:", error);
    return await ctx.reply("⚠️ Terjadi kesalahan saat memproses riwayat progress.");
  }
}

module.exports ={ 
  createProgress,
  doneTask
};

// ✨
// ❇️

    // return ctx.reply(
    //   "✅ Task description saved: <b>" + taskDescription.trim() + "</b>\n\n" +
    //   "⏰ <b>Jam berapa reminder pertama kali dikirimkan?</b>\n" +
    //   "Kirim dalam format <code>HH:MM</code> (24-hour)\n\n" +
    //   "Contoh: <code>14:30</code> untuk Jam 2:30 sore",
    //   {
    //     parse_mode: "HTML",
    //     reply_markup: {
    //       inline_keyboard: [
    //         [{ text: "❌ Batal", callback_data: "cancel" }]
    //       ]
    //     }
    //   }
    // );