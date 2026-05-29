const taskService = require("../services/taskService");
const stateService = require("../services/stateService");

async function  editTaskMenu(ctx) {

    //TODO check state
    //TODO ambil data semua task berdsarkan user terkadit kemudian masukkan dalam user Context di ms_user untuk diambil di proceed
    
    
    ctx.reply("Pilih task Yang hendak diedit. \n Masukkan dalam format angka berdasarkna data yang ditampilkan",{});
}



async function descriptionQuestion(){
    
    //TODO check state
}

async function targetDescriptionQuestion(){
    //TODO check state

}

async function  proceedTaskEdit(ctx) {
    

    // TODO : clear state user
}



module.exports ={
    editTaskMenu,
    proceedTaskEdit
};