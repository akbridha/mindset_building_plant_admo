const stateService = require("../services/stateService");
const referenceService = require("../services/referenceService");
const logger = require("../services/logger");
const dotenv = require("dotenv");
const { db } = require("../db");  // ✅ TAMBAHKAN INI!
const { encryptTelegramId } = require("../services/encryptionService");
const teamService = require("../services/teamService");

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

    // Get current state and attach to context for use in handlers
    const state = await stateService.getState(telegram_id);
    ctx.state.userState = state.current_state;
    ctx.state.userContext = state.context_data || {};
    ctx.state.telegram_id = telegram_id;

    // ========== PRIORITAS DEMO ROLE ==========
    let isAdmin = false;
    const demoRole = ctx.state.userContext.demo_role;

    if (demoRole === "admin") {
      isAdmin = true;
    } else if (demoRole === "user") {
      isAdmin = false;
    } else {
      isAdmin = (telegram_id === parseInt(TELEGRAM_ID_OWNER));
    }
    ctx.state.isAdmin = isAdmin;
    
    if (demoRole) {
      console.log(`User ${telegram_id} in demo mode: ${demoRole}, isAdmin: ${isAdmin}`);
    }

    // ========== LAPOR PAK ROLE DETECTION (SATU KALI SAJA) ==========
    const SUPER_USER_ID = process.env.SUPER_USER_ID;
    ctx.state.isSuperUser = SUPER_USER_ID && telegram_id === parseInt(SUPER_USER_ID);

    try {
      const encryptedId = encryptTelegramId(telegram_id);
      const [users] = await db.execute(
        `SELECT id FROM users WHERE encrypted_telegram_id = ?`,
        [encryptedId]
      );
      
      if (users.length > 0) {
        const userId = users[0].id;
        // ✅ SIMPAN ID INI
        ctx.state.userDatabaseId = userId;
        
        const teamRole = await teamService.getTeamRole(userId);
        ctx.state.teamRole = teamRole;
        ctx.state.isTeamMember = teamRole !== null;
        
        console.log(`[STATE] User ${telegram_id} -> users.id=${userId}, role=${teamRole}, isTeamMember=${ctx.state.isTeamMember}`);
      } else {
        ctx.state.userDatabaseId = null;
        ctx.state.teamRole = null;
        ctx.state.isTeamMember = false;
        console.log(`[STATE] User ${telegram_id} not found in users table`);
      }
    } catch (error) {
      console.warn(`Error checking team role for user ${telegram_id}:`, error);
      ctx.state.userDatabaseId = null;
      ctx.state.teamRole = null;
      ctx.state.isTeamMember = false;
    }
    // ============================================

    // Get user's reference code from database
    const sql = "SELECT reference_code, reminder_time FROM ms_user WHERE telegram_id = ?";
    const [rows] = await db.execute(sql, [telegram_id]);
    ctx.state.reminder_time = rows[0]?.reminder_time || null; 
    
    if (ctx.state.isAdmin === false && rows.length > 0 && rows[0].reference_code) {
      const referenceCode = rows[0].reference_code;
      ctx.state.referenceCode = referenceCode;
      
      const isValid = await referenceService.isReferenceCodeValid(referenceCode);
      
      if (!isValid) {
        await stateService.clearState(telegram_id);
        await ctx.reply(
          "❌ Reference code Anda sudah ditutup oleh admin.\n\n" +
          "Hubungi admin untuk mendapatkan reference code baru."
        );
      }
    }

    console.log("=== DEBUG STATE MIDDLEWARE ===");
    console.log("Telegram ID:", telegram_id);
    console.log("userDatabaseId:", ctx.state.userDatabaseId);
    console.log("isTeamMember:", ctx.state.isTeamMember);
    console.log("teamRole:", ctx.state.teamRole);

    // Continue to next handler
    return next();
  } catch (error) {
    console.error("State middleware error:", error);
    return next();
  }
}

module.exports = stateMiddleware;