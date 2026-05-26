const taskUpdaterService = require("../services/progressService");
const stateService = require("../services/stateService");
const checkReminderService = require("../services/check_reminder_service");
const textService = require("../services/textService");
const progresService = require("../services/progressService");
const { config } = require("dotenv");
const taskService = require ("../services/taskService");



async function createProgress(ctx, userInput) {


   return ctx.reply(userInput);
  
  // console.log(ctx.state.telegram_id, userInput, taskId);
  // const userState = await stateService.getState(ctx.state.telegram_id);
  // // cek status apakah memang sedang ditunggui atau alur ilegal(di luar dugaan) 
  // const isUserResponseAwaited = userState.current_state === "awaiting_checkpoint_response" ? true : false; 
  // console.log("Is user response awaited?", isUserResponseAwaited);

  // var textBalasan = "";
  // var  replyMarkup = null;

  // // console.log("Current user state:", userState.current_state);


  // // cegah aksi diluar jam permintaan checkpoint
  // if(!isUserResponseAwaited){
  //   ctx.reply("Anda tidak sedang dalam proses Perekaman Checkpoint");
  //   return true;
  // }

  
  // try {
  //   await taskUpdaterService.progressCreate(ctx, userInput, taskId);
  //     const dataRiwayat = await progresService.getProgress(taskId);
  //     const progressPrecentage = await taskUpdaterService.getProgressPercentage(taskId, dataRiwayat);
  //      textBalasan = `✅ Progress diterima. \n Progress anda ${progressPrecentage} \n Terima kasih atas update-nya!`;

  // } catch (error) {
  //   textBalasan = "❌ Error in update tasks Command. Mohon Coba lagi.";
  //   console.error("Error in updateTaskCommand:", error);
  // }

  // // console.log("Clearing state for user:", ctx.state.telegram_id);
  // await stateService.clearState(ctx.state.telegram_id);
   
  // const lastReminderTarget = await checkReminderService.checkIsLastReminder(taskId); 
  // if(lastReminderTarget){
  //   textBalasan = `${textBalasan}${textService.getLastReminderText()}`;
  //   replyMarkup =  {
  //         inline_keyboard: [
  //           [{ text: "✨ Extend", callback_data: `extend_phase` }],
  //           [{ text: "✅ Selesai", callback_data: `done_phase` }]
  //         ]
  //       }
  //   stateService.setState(ctx.state.telegram_id,"awaited_on_last_target_response",{task_id: taskId})
  // }


  // // Kirim pesan dengan atau tanpa keyboard
  // const replyOptions = { parse_mode: "HTML" };
  // if (replyMarkup) replyOptions.reply_markup = replyMarkup;

  // // console.log(textBalasan);
  // return ctx.reply(textBalasan, replyOptions);

}

async function confirmProgress(ctx, userInput) {


 try {
    const telegram_id = ctx.state.telegram_id;
    const context = ctx.state.userContext;

    // Parse user input as number
    const selectedIndex = parseInt(userInput, 10);

    // Validate selection
    if (isNaN(selectedIndex) || selectedIndex < 1 || !context.task_list) {
      return ctx.reply(
        "❌ Nomor task invalid. Mohon pilih nomor yang valid dari daftar.\n\n" +
        "Coba lagi atau /cancel"
      );
    }

    // Find selected task
    const selectedTaskInfo = context.task_list.find(t => t.index === selectedIndex);
    if (!selectedTaskInfo) {
      return ctx.reply(
        "❌ Task number di luar jarak yang ditampilkan. mohon pilih task yang valid.\n\n" +
        "Coba lagi atau /cancel"
      );
    }

    // Verify task exists in database
    const task = await taskService.getTaskById(selectedTaskInfo.task_id);
    if (!task || task.telegram_id !== telegram_id) {
      return ctx.reply(
        "❌ Task tidak ditemukan atau invalild. mohon coba lagi."
      );
    }

    // Update context with selected task
    await stateService.updateContext(telegram_id, {
      selected_task_id: selectedTaskInfo.task_id,
      selected_task_description: selectedTaskInfo.description
    });

    // Move to confirmation step
    await stateService.setState(
      telegram_id,
      "awaiting_update_response",
      { ...context, selected_task_id: selectedTaskInfo.task_id, selected_task_description: selectedTaskInfo.description }
    );

    return ctx.reply(
      
      "📈 Masukkan update progress anda!\n\n" +
    "Deskripsi :<b>" + selectedTaskInfo.description + "</b>\n" +
    "Progress terakhir : " + "\n"+
    "Ketik atau pilih progress.",
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "10%", callback_data: "progress:10" },
            { text: "20%", callback_data: "progress:20" }
          ],
          [
            { text: "30%", callback_data: "progress:30" },
            { text: "40%", callback_data: "progress:40" }
          ],
          [
            { text: "50%", callback_data: "progress:50" },
            { text: "60%", callback_data: "progress:60" }
          ],
          [
            { text: "70%", callback_data: "progress:70" },
            { text: "80%", callback_data: "progress:80" }
          ],
          [
            { text: "90%", callback_data: "progress:90" },
            { text: "100%", callback_data: "progress:100" }
          ]
        ]
      }
    }
    );
  } catch (error) {
    console.error("Error in confirm Progress:", error);
    return ctx.reply("❌ Error memproses seleksi untuk Progress. Mohon coba lagi.");
  }
  
}


async function updateProgress(ctx, userInput) {

  
  // ============cegah aksi diluar jam permintaan checkpoint==============
  const userState = await stateService.getState(ctx.state.telegram_id);
  // cek status apakah memang sedang ditunggui atau alur ilegal(di luar dugaan) 
  const isUserResponseAwaited = userState.current_state === "awaiting_update_response" ? true : false; 
  if(!isUserResponseAwaited){
    ctx.reply("Anda tidak sedang dalam proses Perekaman Checkpoint");
    return true;
  }
  //============cegah aksi diluar jam permintaan checkpoint==============

  const taskId = ctx.state.userContext.selected_task_id;

    // return ctx.reply(ctx.state.userContext.selected_task_id);
    // return ctx.reply("ID " + taskId + "\n Deskripsi Task Yang diupdate \n" + ctx.state.userContext.selected_task_description + "->"+ userInput+"%");
  // var textBalasan = "";
  // var  replyMarkup = null;
  
  try {
    await taskUpdaterService.progressCreate(ctx, userInput, taskId);
    const dataRiwayat = await progresService.getProgress(taskId);
    const riwayatFiltered = [];
    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 
                    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    for(const row of dataRiwayat){
      const date = new Date(row.recorded_at);
      const bulan = bulanNames[date.getMonth()];
      const tanggal = date.getDate();
      const formattedDate = `${bulan}/${tanggal}`; // Format: 5/24 atau 5/26
      
      riwayatFiltered.push(`${formattedDate} : ${row.progress}%`);
    }

    const printRiwayat = riwayatFiltered.join('\n');
    textBalasan = `✅ Progress diterima. \n Progress anda \n ${printRiwayat} \n Terima kasih atas update-nya!`;

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


async function doneTask(ctx) {
  try {
    const taskId = ctx.state.userContext.task_id;
    const dataRiwayat = await progresService.getProgress(taskId);
    
    // 1. Validasi jika dataRiwayat kosong atau tidak ditemukan
    if (!dataRiwayat || dataRiwayat.length === 0) {
      return await ctx.reply("❌ Belum ada riwayat progress untuk task ini.");
    }


    const presentasi = await progresService.getProgressPercentage(taskId, dataRiwayat)

    // 2. Judul pesan
    let pesanResponse = `📊 *Riwayat Progress Task ID: ${taskId}*\n\n Progress Anda ${presentasi}\n`;

    // 3. Looping dataRiwayat untuk mendekorasi teks
    dataRiwayat.forEach((item, index) => {
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
  confirmProgress,
  updateProgress,
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