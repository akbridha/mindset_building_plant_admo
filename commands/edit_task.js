const taskService = require("../services/taskService");
const stateService = require("../services/stateService");

async function  editTaskMenu(ctx) {



    

    const telegram_id = ctx.state.telegram_id;
    //TODO check state
    //TODO ambil data semua task berdsarkan user terkadit kemudian masukkan dalam user Context di ms_user untuk diambil di proceed
   var dummy = [] ;
    for(var i=1; i<=5; i++){
        dummy.push(` ${i}. Task ke - ${i} \n `)
    }
    ctx.reply(`Pilih task Yang hendak diedit.\n Your task list : \n ${dummy.join('')} \n Masukkan dalam format angka berdasarkna data yang ditampilkan`,{});
    await stateService.setState(telegram_id, "awaiting_task_number_to_edit")
}



async function descriptionQuestion(ctx, userInput){

    //sudah punya id task
    //reply USER INPUT DAN INLINE KEYBOARD edit nama atau tidak [A/B]?

    const textBalasan = `Anda Memilih ${userInput}. edit task description?`

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

     return ctx.reply("Edit Nama Task \n ketik ae");
}

async function targetDescriptionQuestion(ctx){
    //TODO check state

    await stateService.setState(ctx.state.telegram_id, "awaiting_number_of_target_edit");
    return ctx.reply("✅ Skip Edit Nama Task \n ==Edit Target==  Masukkan Target ");

}

async function  proceedTaskEdit(ctx) {
    
    

    return ctx.reply("Berhasil Edit Task");
    // TODO : clear state user
}



module.exports ={
    editTaskMenu,
    descriptionQuestion,
    descriptionEdit,
    targetDescriptionQuestion,
    proceedTaskEdit
};