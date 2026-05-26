// commands/demo.js
const { Composer } = require("grammy");
const stateService = require("../services/stateService");

const demoRouter = new Composer();

// Helper function untuk update context_data tanpa mengubah reminder_time
async function updateContextData(telegram_id, contextUpdates) {
  // Ambil state saat ini
  const currentState = await stateService.getState(telegram_id);
  
  // Gabungkan context_data lama dengan yang baru
  const newContextData = {
    ...currentState.context_data,
    ...contextUpdates
  };
  
  // Gunakan setState dengan mempertahankan reminder_time yang ada
  // Catatan: setState butuh reminder_time sebagai parameter ke-4
  await stateService.setState(
    telegram_id, 
    currentState.current_state, 
    newContextData,
    currentState.reminder_time || "18:00:00"  // ambil reminder_time yang ada
  );
}

// Command: /actAsAdmin
demoRouter.command("actAsAdmin", async (ctx) => {
  const telegram_id = ctx.from.id;
  
  await updateContextData(telegram_id, { demo_role: "admin" });
  
  await ctx.reply(
    "🔧 *Mode Demo: Admin aktif*\n" +
    "Sekarang kamu akan dianggap sebagai admin meskipun bukan pemilik bot.\n\n" +
    "Gunakan:\n" +
    "• `/actAsUser` - kembali ke mode user biasa\n" +
    "• `/resetDemo` - hapus mode demo",
    { parse_mode: "Markdown" }
  );
});

// Command: /actAsUser
demoRouter.command("actAsUser", async (ctx) => {
  const telegram_id = ctx.from.id;
  
  await updateContextData(telegram_id, { demo_role: "user" });
  
  await ctx.reply(
    "👤 *Mode Demo: User biasa*\n" +
    "Sekarang kamu tidak akan dianggap sebagai admin.\n\n" +
    "Gunakan `/actAsAdmin` untuk mengaktifkan mode admin.",
    { parse_mode: "Markdown" }
  );
});

// Command: /resetDemo - hapus flag demo_role
demoRouter.command("resetDemo", async (ctx) => {
  const telegram_id = ctx.from.id;
  
  const currentState = await stateService.getState(telegram_id);
  const newContextData = { ...currentState.context_data };
  delete newContextData.demo_role;  // hapus demo_role
  
  await stateService.setState(
    telegram_id, 
    currentState.current_state, 
    newContextData,
    currentState.reminder_time || "18:00:00"
  );
  
  await ctx.reply(
    "✅ *Mode Demo direset*\n" +
    "Sekarang hak akses kembali ke aturan normal (berdasarkan TELEGRAM_ID_OWNER).",
    { parse_mode: "Markdown" }
  );
});

// Optional: Command untuk cek status demo saat ini
demoRouter.command("demoStatus", async (ctx) => {
  const telegram_id = ctx.from.id;
  const currentState = await stateService.getState(telegram_id);
  const demoRole = currentState.context_data?.demo_role;
  
  let statusText = "";
  if (demoRole === "admin") {
    statusText = "🔧 *Mode Demo: Admin* - Kamu memiliki akses admin";
  } else if (demoRole === "user") {
    statusText = "👤 *Mode Demo: User* - Kamu tidak memiliki akses admin";
  } else {
    statusText = "⚙️ *Mode Normal* - Akses berdasarkan TELEGRAM_ID_OWNER";
  }
  
  const isActuallyAdmin = telegram_id === parseInt(process.env.TELEGRAM_ID_OWNER);
  statusText += `\n\nStatus sebenarnya: ${isActuallyAdmin ? "Admin owner" : "User biasa"}`;
  
  await ctx.reply(statusText, { parse_mode: "Markdown" });
});

module.exports = demoRouter;