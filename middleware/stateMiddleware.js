const stateService = require("../services/stateService");
const referenceService = require("../services/referenceService");
const dotenv = require("dotenv");

dotenv.config();

const TELEGRAM_ID_OWNER = process.env.TELEGRAM_ID_OWNER;

/**
 * State middleware - checks for timeouts, reference code status, and admin flag
 * Attaches current user state to context for use in handlers
 * Must be registered before command handlers: bot.use(stateMiddleware)
 */
async function stateMiddleware(ctx, next) {
  try {
    const telegram_id = ctx.from.id;

    // Initialize ctx.state if not already initialized
    if (!ctx.state) {
      ctx.state = {};
    }

    // Set admin flag based on TELEGRAM_ID_OWNER
    ctx.state.isAdmin = telegram_id === parseInt(TELEGRAM_ID_OWNER);

    // Check if state has timed out
    const isTimedOut = await stateService.isStateTimedOut(telegram_id);
    
    if (isTimedOut) {
      // Clear the timed-out state
      await stateService.clearState(telegram_id);
      
      // Notify user of timeout
      await ctx.reply(
        "⏱️ Sesi Anda telah kedaluwarsa (5 menit ketidakaktifan).\n\n" +
        "Ketik /start untuk memulai lagi."
      );
      
      // Still process the command, but state is now cleared
    }

    // Get current state and attach to context for use in handlers
    const state = await stateService.getState(telegram_id);
    ctx.state.userState = state.current_state;
    ctx.state.userContext = state.context_data || {};
    ctx.state.telegram_id = telegram_id;

    // Get user's reference code from database
    const { db } = require("../db");
    const sql = "SELECT reference_code FROM ms_user WHERE telegram_id = ?";
    const [rows] = await db.execute(sql, [telegram_id]);
    
    if (ctx.state.isAdmin === false && rows.length > 0 && rows[0].reference_code) {
      const referenceCode = rows[0].reference_code;
      ctx.state.referenceCode = referenceCode;

      // Check if reference code status is still OPEN
      const isValid = await referenceService.isReferenceCodeValid(referenceCode);
      
      if (!isValid) {
        // Reference code has been CLOSED
        await stateService.clearState(telegram_id);
        
        // Notify user that reference code is closed
        await ctx.reply(
          "❌ Reference code Anda sudah ditutup oleh admin.\n\n" +
          "Hubungi admin untuk mendapatkan reference code baru."
        );
      }
    }

    // Continue to next handler
    return next();
  } catch (error) {
    console.error("State middleware error:", error);
    // Continue even on error to not break the bot
    return next();
  }
}

module.exports = stateMiddleware;
