const taskService = require("../services/taskService");
const stateService = require("../services/stateService");

async function  editTaskMenu(ctx) {

    const telegram_id = ctx.state.telegram_id;

    try{
        //TODO check state
        await stateService.assertStateIsNull(telegram_id);
        //TODO ambil data semua task berdsarkan user terkadit kemudian masukkan dalam user Context di ms_user untuk diambil di proceed

        var message = "";

        var dummy = [] ;
        for(var i=1; i<=5; i++){
            dummy.push(` ${i}. Task ke - ${i} \n `)
        }

        const taskRow = await taskService.getAllTasks(telegram_id);
        
        taskRow.forEach((taskRow, index) => {
            message += `${index + 1}. ${taskRow.task_description}\n`;
            
            // Tambahkan deadline jika ada
            if (taskRow.target) {
                message += ` Target: ${taskRow.target}\n`;
            }
            
            // message += `   🆔 ID: ${taskRow.task_id}\n\n`;
        });
        await stateService.setState(telegram_id, "awaiting_task_number_to_edit",{ 
          task_list: taskRow.map((t, i) => ({ index: i + 1, task_id: t.task_id, description: t.task_description }))
        });
        // ctx.reply(`Pilih task Yang hendak diedit.\n Your task list : \n ${dummy.join('')} \n Masukkan dalam format angka berdasarkna data yang ditampilkan`,{});
        return ctx.reply(message);


    } catch (error) {

        return ctx.reply(
            // error.message
            "⚠️ Anda tengah berada di dalam suatu alur fitur.\n\n" +
            "Gunakan /cancel untuk memulai ulang, atau selesaikan flow saat ini."
        );
  
    }
}



async function descriptionQuestion(ctx, userInput){

    //sudah punya id task
    //reply USER INPUT DAN INLINE KEYBOARD edit nama atau tidak [A/B]?

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
    

        

    const textBalasan = `Anda Memilih : \n  <b> ${selectedTaskInfo.description}</b>. \n edit task description?`;

    await stateService.setState(ctx.state.telegram_id, "awaiting_edit_task_option")

    const atributBalasan = {
        inline_keyboard:[
            [
                {text:"Ya", callback_data:"edit_description_name"},
                {text:"Tidak", callback_data:"skip_edit_description_name"},
            ],
        ]
    };
                   

    return ctx.reply(
        textBalasan, 
        {parse_mode: "HTML",
         reply_markup:  atributBalasan
        }
    );


    
    
    
    //TODO check state
}
async function descriptionEdit(ctx){


    const telegram_id = ctx.state.telegram_id;

    try{
        //TODO check state
        await stateService.assertState(telegram_id, "awaiting_edit_task_option");
        
        return ctx.reply("Edit Nama Task \n ketik ae");
    } catch (error) {
  
        return ctx.reply(
            "⚠️ Anda menekan tombol di luar alur seharusnya.\n\n" +
            "Tombol ini hanya digunakan sesuai urutan."
        );

    }
    




        //Todo pengecekan status
        //TODO check state

}

async function targetQuestion(ctx){

    const telegram_id = ctx.state.telegram_id;

    try{
        //TODO check state
        await stateService.assertState(telegram_id, ["awaiting_edit_task_option", ]);
        await stateService.setState(ctx.state.telegram_id, "awaiting_number_of_target_edit");
        return ctx.reply("✅ Skip Edit Nama Task \n ==Edit Target==  Masukkan Target ");
      
    } catch (error) {
       
        return ctx.reply(
            "⚠️ Anda menekan tombol di luar alur seharusnya.\n\n" +
            "Tombol ini hanya digunakan sesuai urutan."
        );

    }

        //TODO check state


}

async function  proceedTaskEdit(ctx) {
    
    

    return ctx.reply("Berhasil Edit Task");
    // TODO : clear state user
}



module.exports ={
    editTaskMenu,
    descriptionQuestion,
    descriptionEdit,
    targetQuestion,
    proceedTaskEdit
};